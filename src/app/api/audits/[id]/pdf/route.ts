import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";
import { renderAuditReport } from "@/lib/pdf/audit-report";

// GET /api/audits/[id]/pdf - Generate and download audit PDF report
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const audit = await prisma.internalAudit.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { name: true } },
        auditor: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        findings: {
          orderBy: { findingNumber: "asc" },
          include: {
            action: {
              select: {
                id: true,
                actionNumber: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: "Audit nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, audit.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    // Serialize dates to strings for the PDF component
    const data = JSON.parse(JSON.stringify(audit));

    const buffer = await renderAuditReport(data);

    const filename = `Auditbericht_${audit.auditNumber || audit.id}_${
      audit.company.name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")
    }.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating audit PDF:", error);
    return NextResponse.json(
      { error: "Fehler beim Generieren des Audit-PDF-Berichts" },
      { status: 500 }
    );
  }
}
