import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCSV } from "@/lib/export";
import { getCompanyFilter } from "@/lib/access-control";

const auditTypeLabels: Record<string, string> = {
  SYSTEM: "Systemaudit",
  PROZESS: "Prozessaudit",
  COMPLIANCE: "Compliance-Audit",
};

const statusLabels: Record<string, string> = {
  GEPLANT: "Geplant",
  IN_DURCHFUEHRUNG: "In Durchführung",
  BERICHT: "Bericht",
  ABGESCHLOSSEN: "Abgeschlossen",
};

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const audits = await prisma.internalAudit.findMany({
      where: {
        ...getCompanyFilter(session),
      },
      include: {
        company: { select: { name: true } },
        auditor: { select: { firstName: true, lastName: true } },
        _count: { select: { findings: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      { key: "auditNumber", label: "Audit-Nr." },
      { key: "title", label: "Titel" },
      { key: "auditType", label: "Typ" },
      { key: "isoClause", label: "ISO-Klausel" },
      { key: "companyName", label: "Betrieb" },
      { key: "status", label: "Status" },
      { key: "plannedDate", label: "Geplant am" },
      { key: "actualDate", label: "Durchgeführt am" },
      { key: "auditor", label: "Auditor" },
      { key: "findingsCount", label: "Findings-Anzahl" },
      { key: "createdAt", label: "Erstellt am" },
    ];

    const rows = audits.map((a) => ({
      auditNumber: a.auditNumber || "",
      title: a.title,
      auditType: auditTypeLabels[a.auditType] || a.auditType,
      isoClause: a.isoClause || "",
      companyName: a.company.name,
      status: statusLabels[a.status] || a.status,
      plannedDate: formatDate(a.plannedDate),
      actualDate: formatDate(a.actualDate),
      auditor: a.auditor
        ? `${a.auditor.firstName || ""} ${a.auditor.lastName || ""}`.trim()
        : "",
      findingsCount: a._count.findings,
      createdAt: formatDate(a.createdAt),
    }));

    const buffer = toCSV(headers, rows);
    const date = new Date().toISOString().split("T")[0];
    const filename = `audits-export-${date}.csv`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting audits:", error);
    return NextResponse.json(
      { error: "Fehler beim Exportieren der Audits" },
      { status: 500 }
    );
  }
}
