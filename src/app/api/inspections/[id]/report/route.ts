import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readFile } from "fs/promises";
import { join } from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";
import { logAudit } from "@/lib/audit";
import { deleteInspectionReport, saveInspectionReport } from "@/lib/docx/report-store";

export const dynamic = "force-dynamic";

const MAX_SIZE = 30 * 1024 * 1024;

async function authorize(id: string, write: boolean) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 }) };
  if (write && session.user.role === "CLIENT") {
    return { error: NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 }) };
  }
  const inspection = await prisma.inspection.findUnique({
    where: { id },
    select: { companyId: true, reportPath: true, reportFileName: true },
  });
  if (!inspection) return { error: NextResponse.json({ error: "Begehung nicht gefunden" }, { status: 404 }) };
  if (!hasCompanyAccess(session, inspection.companyId)) {
    return { error: NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 }) };
  }
  return { session, inspection };
}

// GET /api/inspections/[id]/report – download the Word report stored with the inspection
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorize(params.id, false);
  if (auth.error) return auth.error;
  const { inspection } = auth;
  if (!inspection.reportPath) {
    return NextResponse.json({ error: "Kein Bericht gespeichert" }, { status: 404 });
  }
  try {
    const buffer = await readFile(join(process.cwd(), inspection.reportPath));
    const name = inspection.reportFileName || "Begehungsbericht.docx";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": name.toLowerCase().endsWith(".doc")
          ? "application/msword"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Berichtsdatei nicht gefunden" }, { status: 404 });
  }
}

// POST /api/inspections/[id]/report – upload the final version (edited in Word); replaces the stored one
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorize(params.id, true);
  if (auth.error) return auth.error;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
  }
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".docx") && !lower.endsWith(".doc")) {
    return NextResponse.json({ error: "Bitte eine Word-Datei (.docx oder .doc) hochladen" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Datei ist zu groß (max. 30 MB)" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  // .docx is a ZIP ("PK"), .doc an OLE file (D0 CF 11 E0)
  const isZip = buffer.subarray(0, 2).toString() === "PK";
  const isOle = buffer.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
  if (!isZip && !isOle) {
    return NextResponse.json({ error: "Die Datei ist kein gültiges Word-Dokument" }, { status: 400 });
  }
  await saveInspectionReport(params.id, buffer, file.name, "uploaded");
  logAudit({ userId: auth.session.user.id, action: "update", entityType: "inspection", entityId: params.id, details: { report: "uploaded", file: file.name } });
  return NextResponse.json({ ok: true });
}

// DELETE /api/inspections/[id]/report – remove the stored report
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorize(params.id, true);
  if (auth.error) return auth.error;
  await deleteInspectionReport(params.id);
  return NextResponse.json({ ok: true });
}
