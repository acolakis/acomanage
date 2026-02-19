import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/ba-templates?type=substance|machine
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const type = request.nextUrl.searchParams.get("type") || "substance";
    const categoryCode = type === "machine" ? "H01B" : "IJ03";

    const category = await prisma.documentCategory.findFirst({
      where: { code: categoryCode },
    });

    if (!category) {
      return NextResponse.json({ templates: [] });
    }

    const templates = await prisma.document.findMany({
      where: {
        categoryId: category.id,
        isTemplate: true,
        status: "active",
      },
      select: {
        id: true,
        title: true,
        fileType: true,
        gbaSubstances: {
          select: {
            id: true,
            tradeName: true,
            company: { select: { id: true, name: true } },
          },
        },
        baMachines: {
          select: {
            id: true,
            name: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { title: "asc" },
    });

    const result = templates.map((t) => ({
      id: t.id,
      title: t.title,
      fileType: t.fileType,
      usedBy:
        type === "machine"
          ? t.baMachines.map((m) => ({
              entityName: m.name,
              companyName: m.company.name,
              companyId: m.company.id,
            }))
          : t.gbaSubstances.map((s) => ({
              entityName: s.tradeName,
              companyName: s.company.name,
              companyId: s.company.id,
            })),
    }));

    return NextResponse.json({ templates: result });
  } catch (error) {
    console.error("Error fetching BA templates:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Vorlagen" },
      { status: 500 }
    );
  }
}
