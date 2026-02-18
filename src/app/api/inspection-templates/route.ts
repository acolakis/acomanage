import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/inspection-templates - List templates with sections and items
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const templates = await prisma.inspectionTemplate.findMany({
      where: { isActive: true },
      include: {
        industry: true,
        sections: {
          orderBy: { sortOrder: "asc" },
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching inspection templates:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Vorlagen" },
      { status: 500 }
    );
  }
}
