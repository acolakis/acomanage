import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Calculate the risk level based on probability * severity.
 * 1-4   = NIEDRIG (low)
 * 5-9   = MITTEL (medium)
 * 10-15 = HOCH (high)
 * 16-25 = KRITISCH (critical)
 */
function calculateRiskLevel(
  probability: number,
  severity: number
): string | null {
  if (!probability || !severity) {
    return null;
  }

  const riskScore = probability * severity;

  if (riskScore <= 4) {
    return "NIEDRIG";
  } else if (riskScore <= 9) {
    return "MITTEL";
  } else if (riskScore <= 15) {
    return "HOCH";
  } else {
    return "KRITISCH";
  }
}

// POST /api/risk-assessments/[id]/hazards - Add a hazard to a risk assessment
export async function POST(
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

    const { id: assessmentId } = params;
    const body = await request.json();

    // Verify the risk assessment exists
    const riskAssessment = await prisma.riskAssessment.findUnique({
      where: { id: assessmentId },
    });

    if (!riskAssessment || riskAssessment.status === "archived") {
      return NextResponse.json(
        { error: "Gefährdungsbeurteilung nicht gefunden" },
        { status: 404 }
      );
    }

    const {
      hazardFactor,
      hazardCategory,
      description,
      probability,
      severity,
      measure,
      measureType,
      responsible,
      deadline,
    } = body;

    // Validate required fields
    if (!hazardFactor) {
      return NextResponse.json(
        { error: "Gefährdungsfaktor ist erforderlich" },
        { status: 400 }
      );
    }

    // Validate probability range (1-5)
    if (probability !== undefined && probability !== null) {
      if (
        typeof probability !== "number" ||
        probability < 1 ||
        probability > 5
      ) {
        return NextResponse.json(
          { error: "Eintrittswahrscheinlichkeit muss zwischen 1 und 5 liegen" },
          { status: 400 }
        );
      }
    }

    // Validate severity range (1-5)
    if (severity !== undefined && severity !== null) {
      if (typeof severity !== "number" || severity < 1 || severity > 5) {
        return NextResponse.json(
          { error: "Schadensausmaß muss zwischen 1 und 5 liegen" },
          { status: 400 }
        );
      }
    }

    // Validate measureType (T/O/P)
    if (measureType !== undefined && measureType !== null) {
      if (!["T", "O", "P"].includes(measureType)) {
        return NextResponse.json(
          {
            error:
              "Maßnahmentyp muss T (Technisch), O (Organisatorisch) oder P (Persönlich) sein",
          },
          { status: 400 }
        );
      }
    }

    // Determine the next hazard number by finding the current max
    const lastHazard = await prisma.riskAssessmentHazard.findFirst({
      where: { assessmentId },
      orderBy: { hazardNumber: "desc" },
      select: { hazardNumber: true },
    });

    const nextHazardNumber = (lastHazard?.hazardNumber ?? 0) + 1;

    // Calculate risk level
    const riskLevel = calculateRiskLevel(
      probability ?? 0,
      severity ?? 0
    );

    const hazard = await prisma.riskAssessmentHazard.create({
      data: {
        assessmentId,
        hazardNumber: nextHazardNumber,
        hazardFactor,
        hazardCategory: hazardCategory || null,
        description: description || null,
        probability: probability ?? null,
        severity: severity ?? null,
        riskLevel,
        measure: measure || null,
        measureType: measureType || null,
        responsible: responsible || null,
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    return NextResponse.json(hazard, { status: 201 });
  } catch (error) {
    console.error("Fehler beim Hinzufügen der Gefährdung:", error);
    return NextResponse.json(
      { error: "Fehler beim Hinzufügen der Gefährdung" },
      { status: 500 }
    );
  }
}

// PUT /api/risk-assessments/[id]/hazards - Batch update hazards
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

    const { id: assessmentId } = params;
    const body = await request.json();

    // Verify the risk assessment exists
    const riskAssessment = await prisma.riskAssessment.findUnique({
      where: { id: assessmentId },
    });

    if (!riskAssessment || riskAssessment.status === "archived") {
      return NextResponse.json(
        { error: "Gefährdungsbeurteilung nicht gefunden" },
        { status: 404 }
      );
    }

    // Expect an array of hazard updates: [{ id, ...fields }]
    const hazardUpdates = body.hazards;

    if (!Array.isArray(hazardUpdates) || hazardUpdates.length === 0) {
      return NextResponse.json(
        {
          error:
            "Ein Array von Gefährdungen mit Aktualisierungen ist erforderlich",
        },
        { status: 400 }
      );
    }

    const updatedHazards = [];

    for (const hazardUpdate of hazardUpdates) {
      const { id: hazardId, ...fields } = hazardUpdate;

      if (!hazardId) {
        return NextResponse.json(
          { error: "Jede Gefährdung muss eine ID enthalten" },
          { status: 400 }
        );
      }

      // Verify the hazard belongs to this risk assessment
      const existingHazard = await prisma.riskAssessmentHazard.findFirst({
        where: {
          id: hazardId,
          assessmentId,
        },
      });

      if (!existingHazard) {
        return NextResponse.json(
          {
            error: `Gefährdung mit ID ${hazardId} nicht gefunden oder gehört nicht zu dieser Beurteilung`,
          },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {};

      if (fields.hazardFactor !== undefined) {
        updateData.hazardFactor = fields.hazardFactor;
      }

      if (fields.hazardCategory !== undefined) {
        updateData.hazardCategory = fields.hazardCategory;
      }

      if (fields.description !== undefined) {
        updateData.description = fields.description;
      }

      if (fields.probability !== undefined) {
        if (
          fields.probability !== null &&
          (typeof fields.probability !== "number" ||
            fields.probability < 1 ||
            fields.probability > 5)
        ) {
          return NextResponse.json(
            {
              error:
                "Eintrittswahrscheinlichkeit muss zwischen 1 und 5 liegen",
            },
            { status: 400 }
          );
        }
        updateData.probability = fields.probability;
      }

      if (fields.severity !== undefined) {
        if (
          fields.severity !== null &&
          (typeof fields.severity !== "number" ||
            fields.severity < 1 ||
            fields.severity > 5)
        ) {
          return NextResponse.json(
            { error: "Schadensausmaß muss zwischen 1 und 5 liegen" },
            { status: 400 }
          );
        }
        updateData.severity = fields.severity;
      }

      if (fields.measure !== undefined) {
        updateData.measure = fields.measure;
      }

      if (fields.measureType !== undefined) {
        if (
          fields.measureType !== null &&
          !["T", "O", "P"].includes(fields.measureType)
        ) {
          return NextResponse.json(
            {
              error:
                "Maßnahmentyp muss T (Technisch), O (Organisatorisch) oder P (Persönlich) sein",
            },
            { status: 400 }
          );
        }
        updateData.measureType = fields.measureType;
      }

      if (fields.responsible !== undefined) {
        updateData.responsible = fields.responsible;
      }

      if (fields.deadline !== undefined) {
        updateData.deadline = fields.deadline
          ? new Date(fields.deadline)
          : null;
      }

      if (fields.status !== undefined) {
        updateData.status = fields.status;
      }

      // Recalculate riskLevel if probability or severity changed
      const finalProbability =
        updateData.probability !== undefined
          ? (updateData.probability as number | null)
          : existingHazard.probability;
      const finalSeverity =
        updateData.severity !== undefined
          ? (updateData.severity as number | null)
          : existingHazard.severity;

      if (
        fields.probability !== undefined ||
        fields.severity !== undefined
      ) {
        updateData.riskLevel = calculateRiskLevel(
          finalProbability ?? 0,
          finalSeverity ?? 0
        );
      }

      const updated = await prisma.riskAssessmentHazard.update({
        where: { id: hazardId },
        data: updateData,
      });

      updatedHazards.push(updated);
    }

    return NextResponse.json(updatedHazards);
  } catch (error) {
    console.error("Fehler beim Aktualisieren der Gefährdungen:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Gefährdungen" },
      { status: 500 }
    );
  }
}
