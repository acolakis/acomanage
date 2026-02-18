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

  const machines = await prisma.machine.findMany({
    where: { status: { not: "archived" } },
    include: { company: true },
    orderBy: { name: "asc" },
  });

  const headers = [
    { key: "name", label: "Bezeichnung" },
    { key: "companyName", label: "Betrieb" },
    { key: "manufacturer", label: "Hersteller" },
    { key: "model", label: "Modell" },
    { key: "serialNumber", label: "Seriennummer" },
    { key: "yearOfManufacture", label: "Baujahr" },
    { key: "location", label: "Standort" },
    { key: "machineNumber", label: "Maschinennr." },
  ];

  const rows = machines.map((m) => ({
    name: m.name,
    companyName: m.company.name,
    manufacturer: m.manufacturer,
    model: m.model,
    serialNumber: m.serialNumber,
    yearOfManufacture: m.yearOfManufacture,
    location: m.location,
    machineNumber: m.machineNumber,
  }));

  const buffer = toCSV(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  const filename = `maschinen-export-${date}.csv`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
