import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCSV } from "@/lib/export";
import { getCompanyFilter } from "@/lib/access-control";

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
    const reviews = await prisma.managementReview.findMany({
      where: {
        ...getCompanyFilter(session),
      },
      include: {
        company: { select: { name: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { reviewDate: "desc" },
    });

    const headers = [
      { key: "reviewNumber", label: "Nr." },
      { key: "companyName", label: "Betrieb" },
      { key: "reviewDate", label: "Bewertungsdatum" },
      { key: "attendees", label: "Teilnehmer" },
      { key: "approvedBy", label: "Genehmigt von" },
      { key: "approvedAt", label: "Genehmigt am" },
      { key: "createdBy", label: "Erstellt von" },
      { key: "createdAt", label: "Erstellt am" },
    ];

    const rows = reviews.map((r) => ({
      reviewNumber: r.reviewNumber || "",
      companyName: r.company.name,
      reviewDate: formatDate(r.reviewDate),
      attendees: r.attendees || "",
      approvedBy: r.approvedBy
        ? `${r.approvedBy.firstName || ""} ${r.approvedBy.lastName || ""}`.trim()
        : "",
      approvedAt: formatDate(r.approvedAt),
      createdBy: r.createdBy
        ? `${r.createdBy.firstName || ""} ${r.createdBy.lastName || ""}`.trim()
        : "",
      createdAt: formatDate(r.createdAt),
    }));

    const buffer = toCSV(headers, rows);
    const date = new Date().toISOString().split("T")[0];
    const filename = `managementbewertungen-export-${date}.csv`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting management reviews:", error);
    return NextResponse.json(
      { error: "Fehler beim Exportieren der Managementbewertungen" },
      { status: 500 }
    );
  }
}
