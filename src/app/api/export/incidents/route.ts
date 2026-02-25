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

  const incidents = await prisma.incident.findMany({
    include: {
      company: true,
      createdBy: true,
    },
    orderBy: { incidentDate: "desc" },
  });

  const headers = [
    { key: "incidentNumber", label: "Vorfallnr." },
    { key: "companyName", label: "Betrieb" },
    { key: "incidentType", label: "Art" },
    { key: "severity", label: "Schwere" },
    { key: "status", label: "Status" },
    { key: "incidentDate", label: "Datum" },
    { key: "location", label: "Ort" },
    { key: "department", label: "Abteilung" },
    { key: "affectedPerson", label: "Betroffene Person" },
    { key: "description", label: "Beschreibung" },
    { key: "bgReportable", label: "BG-meldepflichtig" },
    { key: "lostWorkDays", label: "Ausfalltage" },
    { key: "createdByName", label: "Erfasst von" },
  ];

  const rows = incidents.map((i) => ({
    incidentNumber: i.incidentNumber,
    companyName: i.company.name,
    incidentType: i.incidentType,
    severity: i.severity,
    status: i.status,
    incidentDate: i.incidentDate
      ? new Date(i.incidentDate).toLocaleDateString("de-DE")
      : "",
    location: i.location,
    department: i.department,
    affectedPerson: i.affectedPerson,
    description: i.description,
    bgReportable: i.bgReportable ? "Ja" : "Nein",
    lostWorkDays: i.lostWorkDays,
    createdByName: i.createdBy
      ? `${i.createdBy.firstName} ${i.createdBy.lastName}`
      : "",
  }));

  const buffer = toCSV(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  const filename = `vorfaelle-export-${date}.csv`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
