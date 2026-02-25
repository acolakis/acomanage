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

  const requirements = await prisma.legalRequirement.findMany({
    where: { isActive: true },
    include: {
      company: { select: { name: true } },
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  const statusLabels: Record<string, string> = {
    OFFEN: "Offen",
    KONFORM: "Konform",
    TEILWEISE: "Teilweise",
    NICHT_KONFORM: "Nicht konform",
  };

  const headers = [
    { key: "title", label: "Titel" },
    { key: "shortTitle", label: "Kurzbezeichnung" },
    { key: "category", label: "Kategorie" },
    { key: "section", label: "Abschnitt" },
    { key: "relevance", label: "Relevanz" },
    { key: "complianceStatus", label: "Status" },
    { key: "companyName", label: "Betrieb" },
    { key: "lastReviewDate", label: "Letzte Prüfung" },
    { key: "nextReviewDate", label: "Nächste Prüfung" },
  ];

  const rows = requirements.map((r) => ({
    title: r.title,
    shortTitle: r.shortTitle || "",
    category: r.category,
    section: r.section || "",
    relevance: r.relevance || "",
    complianceStatus: statusLabels[r.complianceStatus] || r.complianceStatus,
    companyName: r.company.name,
    lastReviewDate: r.lastReviewDate
      ? new Date(r.lastReviewDate).toLocaleDateString("de-DE")
      : "",
    nextReviewDate: r.nextReviewDate
      ? new Date(r.nextReviewDate).toLocaleDateString("de-DE")
      : "",
  }));

  const buffer = toCSV(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  const filename = `rechtskataster-export-${date}.csv`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
