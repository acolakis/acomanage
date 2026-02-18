import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCSV } from "@/lib/export";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
  }

  const assessments = await prisma.riskAssessment.findMany({
    where: { status: { not: "archived" } },
    include: {
      company: true,
      _count: { select: { hazards: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const headers = [
    { key: "title", label: "Titel" },
    { key: "companyName", label: "Betrieb" },
    { key: "assessmentType", label: "Typ" },
    { key: "status", label: "Status" },
    { key: "assessedArea", label: "Bereich" },
    { key: "legalBasis", label: "Rechtsgrundlage" },
    { key: "assessmentDate", label: "Beurteilungsdatum" },
    { key: "nextReviewDate", label: "Nächste Überprüfung" },
    { key: "hazardsCount", label: "Gefährdungen" },
  ];

  const rows = assessments.map((a) => ({
    title: a.title,
    companyName: a.company.name,
    assessmentType: a.assessmentType,
    status: a.status,
    assessedArea: a.assessedArea,
    legalBasis: a.legalBasis,
    assessmentDate: a.assessmentDate
      ? new Date(a.assessmentDate).toLocaleDateString("de-DE")
      : "",
    nextReviewDate: a.nextReviewDate
      ? new Date(a.nextReviewDate).toLocaleDateString("de-DE")
      : "",
    hazardsCount: a._count.hazards,
  }));

  const buffer = toCSV(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  const filename = `gbu-export-${date}.csv`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
