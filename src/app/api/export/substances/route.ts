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

  const substances = await prisma.hazardousSubstance.findMany({
    where: { status: "active" },
    include: { company: true },
    orderBy: [{ companyId: "asc" }, { lfdNr: "asc" }],
  });

  const headers = [
    { key: "lfdNr", label: "Lfd.Nr." },
    { key: "companyName", label: "Betrieb" },
    { key: "tradeName", label: "Handelsname" },
    { key: "manufacturer", label: "Hersteller" },
    { key: "casNumber", label: "CAS-Nr." },
    { key: "signalWord", label: "Signalwort" },
    { key: "hStatements", label: "H-Sätze" },
    { key: "pStatements", label: "P-Sätze" },
    { key: "usageLocation", label: "Einsatzort" },
    { key: "ghsPictograms", label: "GHS-Piktogramme" },
  ];

  const rows = substances.map((s) => ({
    lfdNr: s.lfdNr,
    companyName: s.company.name,
    tradeName: s.tradeName,
    manufacturer: s.manufacturer,
    casNumber: s.casNumber,
    signalWord: s.signalWord,
    hStatements: s.hStatements.join(", "),
    pStatements: s.pStatements.join(", "),
    usageLocation: s.usageLocation,
    ghsPictograms: s.ghsPictograms.join(", "),
  }));

  const buffer = toCSV(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  const filename = `gefahrstoffe-export-${date}.csv`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
