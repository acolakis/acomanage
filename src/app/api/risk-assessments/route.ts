import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/risk-assessments - List risk assessments with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const status = searchParams.get("status");
    const assessmentType = searchParams.get("assessmentType");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      status: { not: "archived" },
    };

    if (companyId) {
      where.companyId = companyId;
    }

    if (status) {
      where.status = status;
    }

    if (assessmentType) {
      where.assessmentType = assessmentType;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { assessedArea: { contains: search, mode: "insensitive" } },
        { legalBasis: { contains: search, mode: "insensitive" } },
      ];
    }

    const riskAssessments = await prisma.riskAssessment.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        assessedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            hazards: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(riskAssessments);
  } catch (error) {
    console.error("Fehler beim Abrufen der Gefährdungsbeurteilungen:", error);
    return NextResponse.json(
      { error: "Fehler beim Abrufen der Gefährdungsbeurteilungen" },
      { status: 500 }
    );
  }
}

// POST /api/risk-assessments - Create a new risk assessment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();

    const {
      companyId,
      title,
      assessmentType,
      legalBasis,
      assessedArea,
      assessmentDate,
      nextReviewDate,
    } = body;

    // Validate required fields
    if (!companyId) {
      return NextResponse.json(
        { error: "Betrieb ist erforderlich" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Titel ist erforderlich" },
        { status: 400 }
      );
    }

    if (!assessmentType) {
      return NextResponse.json(
        { error: "Beurteilungsart ist erforderlich" },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId, isActive: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Betrieb nicht gefunden" },
        { status: 404 }
      );
    }

    const riskAssessment = await prisma.riskAssessment.create({
      data: {
        companyId,
        title,
        assessmentType,
        legalBasis: legalBasis || null,
        assessedArea: assessedArea || null,
        assessmentDate: assessmentDate ? new Date(assessmentDate) : null,
        nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : null,
        assessedById: userId,
        status: "draft",
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        assessedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(riskAssessment, { status: 201 });
  } catch (error) {
    console.error("Fehler beim Erstellen der Gefährdungsbeurteilung:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Gefährdungsbeurteilung" },
      { status: 500 }
    );
  }
}
