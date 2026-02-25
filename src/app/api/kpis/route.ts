import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/kpis - List all KPI definitions
export async function GET() {
  try {
    const definitions = await prisma.kpiDefinition.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(definitions);
  } catch (error) {
    console.error("Error fetching KPI definitions:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Kennzahlen-Definitionen" },
      { status: 500 }
    );
  }
}
