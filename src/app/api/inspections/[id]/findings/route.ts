import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/inspections/[id]/findings - Add a finding
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id: params.id },
      include: { _count: { select: { findings: true } } },
    });

    if (!inspection) {
      return NextResponse.json(
        { error: "Begehung nicht gefunden" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      sectionId,
      templateItemId,
      description,
      riskLevel,
      measure,
      responsible,
      deadline,
      previousFindingId,
    } = body;

    if (!description) {
      return NextResponse.json(
        { error: "Beschreibung ist erforderlich" },
        { status: 400 }
      );
    }

    const finding = await prisma.inspectionFinding.create({
      data: {
        inspectionId: params.id,
        sectionId: sectionId || null,
        templateItemId: templateItemId || null,
        findingNumber: inspection._count.findings + 1,
        description,
        riskLevel: riskLevel || null,
        measure: measure || null,
        responsible: responsible || null,
        deadline: deadline ? new Date(deadline) : null,
        previousFindingId: previousFindingId || null,
        status: "OPEN",
      },
      include: {
        section: { select: { title: true, sectionCode: true } },
        templateItem: { select: { label: true } },
        photos: true,
      },
    });

    // If this finding references a previous one, mark the old one as in progress
    if (previousFindingId) {
      await prisma.inspectionFinding.update({
        where: { id: previousFindingId },
        data: { status: "IN_PROGRESS" },
      });
    }

    return NextResponse.json(finding, { status: 201 });
  } catch (error) {
    console.error("Error creating finding:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Befundes" },
      { status: 500 }
    );
  }
}

// PUT /api/inspections/[id]/findings - Batch update findings
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { findings } = body;

    if (!Array.isArray(findings)) {
      return NextResponse.json(
        { error: "findings muss ein Array sein" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      findings.map(
        async (f: {
          id: string;
          description?: string;
          riskLevel?: string;
          measure?: string;
          responsible?: string;
          deadline?: string;
          status?: string;
        }) => {
          const updateData: Record<string, unknown> = {};
          if (f.description !== undefined) updateData.description = f.description;
          if (f.riskLevel !== undefined) updateData.riskLevel = f.riskLevel;
          if (f.measure !== undefined) updateData.measure = f.measure;
          if (f.responsible !== undefined) updateData.responsible = f.responsible;
          if (f.deadline !== undefined)
            updateData.deadline = f.deadline ? new Date(f.deadline) : null;
          if (f.status !== undefined) {
            updateData.status = f.status;
            if (f.status === "COMPLETED") {
              updateData.completedAt = new Date();
            }
          }

          return prisma.inspectionFinding.update({
            where: { id: f.id },
            data: updateData,
          });
        }
      )
    );

    return NextResponse.json({ updated: results.length });
  } catch (error) {
    console.error("Error updating findings:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Befunde" },
      { status: 500 }
    );
  }
}
