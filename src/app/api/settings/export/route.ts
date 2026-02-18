import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/settings/export - Export all data as JSON
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const role = (session.user as { role: string }).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Nur Administratoren" }, { status: 403 });
  }

  try {
    const [companies, inspections, substances, machines, riskAssessments, users] =
      await Promise.all([
        prisma.company.findMany({ where: { isActive: true } }),
        prisma.inspection.findMany({
          include: {
            company: { select: { name: true } },
            _count: { select: { findings: true } },
          },
        }),
        prisma.hazardousSubstance.findMany({
          where: { status: "active" },
          include: { company: { select: { name: true } } },
        }),
        prisma.machine.findMany({
          where: { status: { not: "archived" } },
          include: { company: { select: { name: true } } },
        }),
        prisma.riskAssessment.findMany({
          where: { status: { not: "archived" } },
          include: {
            company: { select: { name: true } },
            _count: { select: { hazards: true } },
          },
        }),
        prisma.user.findMany({
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        }),
      ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      companies,
      inspections,
      substances,
      machines,
      riskAssessments,
      users,
    };

    const json = JSON.stringify(exportData, null, 2);

    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="acomanage-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Fehler beim Exportieren der Daten" },
      { status: 500 }
    );
  }
}
