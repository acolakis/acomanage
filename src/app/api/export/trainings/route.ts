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

  const trainings = await prisma.trainingEvent.findMany({
    include: {
      company: true,
      createdBy: true,
      _count: { select: { participants: true } },
    },
    orderBy: { trainingDate: { sort: "desc", nulls: "last" } },
  });

  const statusLabels: Record<string, string> = {
    GEPLANT: "Geplant",
    DURCHGEFUEHRT: "Durchgeführt",
    ABGESAGT: "Abgesagt",
    UEBERFAELLIG: "Überfällig",
  };

  const typeLabels: Record<string, string> = {
    ERSTUNTERWEISUNG: "Erstunterweisung",
    UNTERWEISUNG: "Unterweisung",
    FORTBILDUNG: "Fortbildung",
    ZERTIFIKAT: "Zertifikat",
    ERSTE_HILFE: "Erste Hilfe",
    BRANDSCHUTZ: "Brandschutz",
    GEFAHRSTOFF: "Gefahrstoff",
    PSA: "PSA",
    MASCHINE: "Maschine",
    ELEKTRO: "Elektro",
    SONSTIGES: "Sonstiges",
  };

  const headers = [
    { key: "title", label: "Titel" },
    { key: "companyName", label: "Betrieb" },
    { key: "trainingType", label: "Art" },
    { key: "legalBasis", label: "Rechtsgrundlage" },
    { key: "trainingDate", label: "Datum" },
    { key: "instructor", label: "Dozent" },
    { key: "location", label: "Ort" },
    { key: "status", label: "Status" },
    { key: "duration", label: "Dauer (Min.)" },
    { key: "participantCount", label: "Teilnehmer" },
    { key: "createdBy", label: "Erstellt von" },
  ];

  const rows = trainings.map((t) => ({
    title: t.title,
    companyName: t.company.name,
    trainingType: typeLabels[t.trainingType] || t.trainingType,
    legalBasis: t.legalBasis || "",
    trainingDate: t.trainingDate
      ? new Date(t.trainingDate).toLocaleDateString("de-DE")
      : "",
    instructor: t.instructor || "",
    location: t.location || "",
    status: statusLabels[t.status] || t.status,
    duration: t.duration != null ? t.duration : "",
    participantCount: t._count.participants,
    createdBy: t.createdBy
      ? `${t.createdBy.firstName} ${t.createdBy.lastName}`
      : "",
  }));

  const buffer = toCSV(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  const filename = `schulungen-export-${date}.csv`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
