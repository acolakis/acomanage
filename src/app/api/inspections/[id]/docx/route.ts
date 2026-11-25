import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";
import { getJob, startJob } from "@/lib/inspection-import/jobs";
import { updateReport } from "@/lib/docx/report-update";
import { saveInspectionReport } from "@/lib/docx/report-store";

export const dynamic = "force-dynamic";

type ReportJobResult = Awaited<ReturnType<typeof updateReport>>;

// POST /api/inspections/[id]/docx – starts the Word export (last year's report updated with this
// inspection). Takes minutes, so it runs as a background job; poll GET ?job=<id>.
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const inspection = await prisma.inspection.findUnique({
    where: { id: params.id },
    select: { companyId: true, reportSource: true },
  });
  if (!inspection) {
    return NextResponse.json({ error: "Begehung nicht gefunden" }, { status: 404 });
  }
  if (!hasCompanyAccess(session, inspection.companyId)) {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
  }
  const jobId = startJob(session.user.id, "Word export", async () => {
    const result = await updateReport(params.id);
    // Store with the inspection (basis for next year) – but never overwrite a final version
    // the user uploaded after editing it in Word.
    const keepUploaded = inspection.reportSource === "uploaded";
    if (!keepUploaded) await saveInspectionReport(params.id, result.buffer, result.filename, "generated");
    return { ...result, summary: { ...result.summary, stored: keepUploaded ? "kept-uploaded" : "saved" } };
  });
  return NextResponse.json({ jobId }, { status: 202 });
}

// GET /api/inspections/[id]/docx?job=<id> – job state (with check list when done)
// GET /api/inspections/[id]/docx?job=<id>&download=1 – the finished .docx
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const job = getJob(searchParams.get("job") || "");
  if (!job || job.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Export nicht gefunden – evtl. wurde der Server neu gestartet. Bitte erneut starten." },
      { status: 404 }
    );
  }
  if (job.status === "running") {
    return NextResponse.json({ status: "running", seconds: Math.round((Date.now() - job.startedAt) / 1000) });
  }
  if (job.status === "error") {
    return NextResponse.json({ status: "error", error: job.error });
  }
  const result = job.result as ReportJobResult;
  if (searchParams.get("download")) {
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": result.buffer.length.toString(),
      },
    });
  }
  return NextResponse.json({ status: "done", filename: result.filename, summary: result.summary });
}
