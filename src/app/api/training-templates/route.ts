import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/training-templates - List all active training templates
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const templates = await prisma.trainingTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching training templates:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Schulungsvorlagen" },
      { status: 500 }
    );
  }
}
