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

  const actions = await prisma.correctiveAction.findMany({
    include: {
      company: true,
      responsible: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    { key: "actionNumber", label: "Ma\u00dfnahmennr." },
    { key: "companyName", label: "Betrieb" },
    { key: "title", label: "Titel" },
    { key: "description", label: "Beschreibung" },
    { key: "sourceType", label: "Quelle" },
    { key: "priority", label: "Priorit\u00e4t" },
    { key: "status", label: "Status" },
    { key: "measureType", label: "Ma\u00dfnahmentyp" },
    { key: "deadline", label: "Frist" },
    { key: "completedAt", label: "Abgeschlossen am" },
    { key: "responsibleName", label: "Verantwortlich" },
    { key: "effectivenessResult", label: "Wirksamkeit" },
  ];

  const rows = actions.map((a) => ({
    actionNumber: a.actionNumber,
    companyName: a.company.name,
    title: a.title,
    description: a.description,
    sourceType: a.sourceType,
    priority: a.priority,
    status: a.status,
    measureType: a.measureType,
    deadline: a.deadline
      ? new Date(a.deadline).toLocaleDateString("de-DE")
      : "",
    completedAt: a.completedAt
      ? new Date(a.completedAt).toLocaleDateString("de-DE")
      : "",
    responsibleName: a.responsible
      ? `${a.responsible.firstName} ${a.responsible.lastName}`
      : "",
    effectivenessResult: a.effectivenessResult,
  }));

  const buffer = toCSV(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  const filename = `massnahmen-export-${date}.csv`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
