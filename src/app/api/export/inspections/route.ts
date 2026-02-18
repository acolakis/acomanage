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

  const inspections = await prisma.inspection.findMany({
    include: {
      company: true,
      inspector: true,
      _count: { select: { findings: true } },
    },
    orderBy: { inspectionDate: "desc" },
  });

  const headers = [
    { key: "inspectionNumber", label: "Begehungsnr." },
    { key: "companyName", label: "Betrieb" },
    { key: "inspectionType", label: "Typ" },
    { key: "inspectionDate", label: "Datum" },
    { key: "status", label: "Status" },
    { key: "inspector", label: "Prüfer" },
    { key: "findingsCount", label: "Feststellungen" },
  ];

  const rows = inspections.map((i) => ({
    inspectionNumber: i.inspectionNumber,
    companyName: i.company.name,
    inspectionType: i.inspectionType,
    inspectionDate: i.inspectionDate
      ? new Date(i.inspectionDate).toLocaleDateString("de-DE")
      : "",
    status: i.status,
    inspector: `${i.inspector.firstName} ${i.inspector.lastName}`,
    findingsCount: i._count.findings,
  }));

  const buffer = toCSV(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  const filename = `begehungen-export-${date}.csv`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
