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

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const headers = [
    { key: "companyNumber", label: "Betriebsnummer" },
    { key: "name", label: "Name" },
    { key: "legalForm", label: "Rechtsform" },
    { key: "street", label: "Straße" },
    { key: "zip", label: "PLZ" },
    { key: "city", label: "Stadt" },
    { key: "phone", label: "Telefon" },
    { key: "email", label: "E-Mail" },
    { key: "contactName", label: "Ansprechpartner" },
    { key: "employeeCount", label: "Mitarbeiterzahl" },
  ];

  const rows = companies.map((c) => ({
    companyNumber: c.companyNumber,
    name: c.name,
    legalForm: c.legalForm,
    street: c.street,
    zip: c.zip,
    city: c.city,
    phone: c.phone,
    email: c.email,
    contactName: c.contactName,
    employeeCount: c.employeeCount,
  }));

  const buffer = toCSV(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  const filename = `betriebe-export-${date}.csv`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
