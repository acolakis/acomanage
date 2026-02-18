import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/industries - List all industries, ordered by sortOrder
// No auth required (used in public forms)
export async function GET() {
  try {
    const industries = await prisma.industry.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json(industries);
  } catch (error) {
    console.error("Error fetching industries:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Branchen" },
      { status: 500 }
    );
  }
}
