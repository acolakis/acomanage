import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// GET /api/competence-requirements - List competence requirements
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json(
      { error: "Betrieb-ID ist erforderlich" },
      { status: 400 }
    );
  }

  try {
    const requirements = await prisma.competenceRequirement.findMany({
      where: { companyId },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ role: "asc" }, { qualification: "asc" }],
    });

    return NextResponse.json(requirements);
  } catch (error) {
    console.error("Error fetching competence requirements:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Kompetenzanforderungen" },
      { status: 500 }
    );
  }
}

// POST /api/competence-requirements - Create requirement
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { companyId, role, qualification, legalBasis, recurrenceMonths, isRequired } = body;

    if (!companyId || !role || !qualification) {
      return NextResponse.json(
        { error: "Betrieb, Rolle und Qualifikation sind erforderlich" },
        { status: 400 }
      );
    }

    const requirement = await prisma.competenceRequirement.create({
      data: {
        companyId,
        role,
        qualification,
        legalBasis: legalBasis || null,
        recurrenceMonths: recurrenceMonths ? parseInt(recurrenceMonths) : null,
        isRequired: isRequired !== undefined ? isRequired : true,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "competence_requirement",
      entityId: requirement.id,
      details: { role, qualification },
    });

    return NextResponse.json(requirement, { status: 201 });
  } catch (error) {
    console.error("Error creating competence requirement:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Kompetenzanforderung" },
      { status: 500 }
    );
  }
}
