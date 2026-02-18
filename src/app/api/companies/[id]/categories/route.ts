import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/companies/[id]/categories - Get all categories for this company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const { id } = params;

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Unternehmen nicht gefunden" },
        { status: 404 }
      );
    }

    const companyCategories = await prisma.companyCategory.findMany({
      where: { companyId: id },
      include: {
        category: true,
      },
      orderBy: {
        category: {
          sortOrder: "asc",
        },
      },
    });

    return NextResponse.json(companyCategories);
  } catch (error) {
    console.error("Error fetching company categories:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Kategorien" },
      { status: 500 }
    );
  }
}

// PUT /api/companies/[id]/categories - Replace all categories for this company
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();

    if (!Array.isArray(body.categoryIds)) {
      return NextResponse.json(
        { error: "categoryIds muss ein Array sein" },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Unternehmen nicht gefunden" },
        { status: 404 }
      );
    }

    // Replace all categories in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing company categories
      await tx.companyCategory.deleteMany({
        where: { companyId: id },
      });

      // Create new company categories
      if (body.categoryIds.length > 0) {
        await tx.companyCategory.createMany({
          data: body.categoryIds.map((categoryId: string) => ({
            companyId: id,
            categoryId,
            isRelevant: true,
            determinedAt: new Date(),
            determinedById: session.user.id,
          })),
        });
      }

      // Return the updated categories
      return tx.companyCategory.findMany({
        where: { companyId: id },
        include: {
          category: true,
        },
        orderBy: {
          category: {
            sortOrder: "asc",
          },
        },
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating company categories:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Kategorien" },
      { status: 500 }
    );
  }
}
