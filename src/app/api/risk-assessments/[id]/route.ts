import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/risk-assessments/[id] - Get a single risk assessment with all details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { id } = params;

    const riskAssessment = await prisma.riskAssessment.findUnique({
      where: { id },
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
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        hazards: {
          orderBy: { hazardNumber: "asc" },
        },
      },
    });

    if (!riskAssessment || riskAssessment.status === "archived") {
      return NextResponse.json(
        { error: "Gefährdungsbeurteilung nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(riskAssessment);
  } catch (error) {
    console.error("Fehler beim Abrufen der Gefährdungsbeurteilung:", error);
    return NextResponse.json(
      { error: "Fehler beim Abrufen der Gefährdungsbeurteilung" },
      { status: 500 }
    );
  }
}

// PUT /api/risk-assessments/[id] - Update a risk assessment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const { id } = params;
    const body = await request.json();

    // Verify the risk assessment exists
    const existing = await prisma.riskAssessment.findUnique({
      where: { id },
    });

    if (!existing || existing.status === "archived") {
      return NextResponse.json(
        { error: "Gefährdungsbeurteilung nicht gefunden" },
        { status: 404 }
      );
    }

    const {
      title,
      legalBasis,
      assessedArea,
      status,
      assessmentDate,
      nextReviewDate,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (legalBasis !== undefined) {
      updateData.legalBasis = legalBasis;
    }

    if (assessedArea !== undefined) {
      updateData.assessedArea = assessedArea;
    }

    if (assessmentDate !== undefined) {
      updateData.assessmentDate = assessmentDate
        ? new Date(assessmentDate)
        : null;
    }

    if (nextReviewDate !== undefined) {
      updateData.nextReviewDate = nextReviewDate
        ? new Date(nextReviewDate)
        : null;
    }

    if (status !== undefined) {
      updateData.status = status;

      // When status changes to "active", set approval fields
      if (status === "active" && existing.status !== "active") {
        updateData.approvedById = userId;
        updateData.approvedAt = new Date();
      }
    }

    const riskAssessment = await prisma.riskAssessment.update({
      where: { id },
      data: updateData,
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
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        hazards: {
          orderBy: { hazardNumber: "asc" },
        },
      },
    });

    return NextResponse.json(riskAssessment);
  } catch (error) {
    console.error(
      "Fehler beim Aktualisieren der Gefährdungsbeurteilung:",
      error
    );
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Gefährdungsbeurteilung" },
      { status: 500 }
    );
  }
}

// DELETE /api/risk-assessments/[id] - Soft-delete a risk assessment (only if draft)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { id } = params;

    const existing = await prisma.riskAssessment.findUnique({
      where: { id },
    });

    if (!existing || existing.status === "archived") {
      return NextResponse.json(
        { error: "Gefährdungsbeurteilung nicht gefunden" },
        { status: 404 }
      );
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        {
          error:
            "Nur Gefährdungsbeurteilungen im Entwurfsstatus können gelöscht werden",
        },
        { status: 400 }
      );
    }

    await prisma.riskAssessment.update({
      where: { id },
      data: { status: "archived" },
    });

    return NextResponse.json({
      message: "Gefährdungsbeurteilung erfolgreich gelöscht",
    });
  } catch (error) {
    console.error("Fehler beim Löschen der Gefährdungsbeurteilung:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Gefährdungsbeurteilung" },
      { status: 500 }
    );
  }
}
