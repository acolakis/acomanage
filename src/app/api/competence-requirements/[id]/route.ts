import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// PUT /api/competence-requirements/[id] - Update requirement
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.competenceRequirement.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Kompetenzanforderung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.role !== undefined) updateData.role = body.role;
    if (body.qualification !== undefined) updateData.qualification = body.qualification;
    if (body.legalBasis !== undefined) updateData.legalBasis = body.legalBasis;
    if (body.recurrenceMonths !== undefined) {
      updateData.recurrenceMonths = body.recurrenceMonths !== null ? parseInt(body.recurrenceMonths) : null;
    }
    if (body.isRequired !== undefined) updateData.isRequired = body.isRequired;

    const requirement = await prisma.competenceRequirement.update({
      where: { id: params.id },
      data: updateData,
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "update",
      entityType: "competence_requirement",
      entityId: params.id,
    });

    return NextResponse.json(requirement);
  } catch (error) {
    console.error("Error updating competence requirement:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Kompetenzanforderung" },
      { status: 500 }
    );
  }
}

// DELETE /api/competence-requirements/[id] - Delete requirement
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.competenceRequirement.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Kompetenzanforderung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    await prisma.competenceRequirement.delete({ where: { id: params.id } });

    logAudit({
      userId: session.user.id,
      action: "delete",
      entityType: "competence_requirement",
      entityId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting competence requirement:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Kompetenzanforderung" },
      { status: 500 }
    );
  }
}
