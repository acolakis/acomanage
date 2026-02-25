import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/corrective-actions/[id] - Get single corrective action
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const action = await prisma.correctiveAction.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        responsible: { select: { firstName: true, lastName: true } },
        effectivenessBy: { select: { firstName: true, lastName: true } },
        incident: {
          select: {
            id: true,
            incidentNumber: true,
            incidentType: true,
            description: true,
          },
        },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!action) {
      return NextResponse.json(
        { error: "Maßnahme nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, action.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    return NextResponse.json(action);
  } catch (error) {
    console.error("Error fetching corrective action:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Maßnahme" },
      { status: 500 }
    );
  }
}

// PUT /api/corrective-actions/[id] - Update corrective action
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.correctiveAction.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Maßnahme nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.measureType !== undefined) updateData.measureType = body.measureType;
    if (body.responsibleId !== undefined) updateData.responsibleId = body.responsibleId || null;
    if (body.deadline !== undefined) updateData.deadline = body.deadline ? new Date(body.deadline) : null;
    if (body.effectivenessCheck !== undefined) updateData.effectivenessCheck = body.effectivenessCheck;
    if (body.effectivenessDate !== undefined) updateData.effectivenessDate = body.effectivenessDate ? new Date(body.effectivenessDate) : null;
    if (body.effectivenessResult !== undefined) updateData.effectivenessResult = body.effectivenessResult || null;
    if (body.effectivenessById !== undefined) updateData.effectivenessById = body.effectivenessById || null;
    if (body.sourceReference !== undefined) updateData.sourceReference = body.sourceReference;

    // Set completedAt when status changes to UMGESETZT
    if (body.status === "UMGESETZT") {
      updateData.completedAt = new Date();
    }

    // Set completedAt when status changes to ABGESCHLOSSEN (if not already set)
    if (body.status === "ABGESCHLOSSEN" && !existing.completedAt) {
      updateData.completedAt = new Date();
    }

    const action = await prisma.correctiveAction.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        responsible: { select: { firstName: true, lastName: true } },
        effectivenessBy: { select: { firstName: true, lastName: true } },
        incident: {
          select: {
            id: true,
            incidentNumber: true,
            incidentType: true,
            description: true,
          },
        },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "update",
      entityType: "corrective_action",
      entityId: params.id,
      details: { status: body.status, title: body.title },
    });

    return NextResponse.json(action);
  } catch (error) {
    console.error("Error updating corrective action:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Maßnahme" },
      { status: 500 }
    );
  }
}

// DELETE /api/corrective-actions/[id] - Delete corrective action (only OFFEN status)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const action = await prisma.correctiveAction.findUnique({
      where: { id: params.id },
    });

    if (!action) {
      return NextResponse.json(
        { error: "Maßnahme nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, action.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    if (action.status !== "OFFEN") {
      return NextResponse.json(
        { error: "Nur offene Maßnahmen können gelöscht werden" },
        { status: 400 }
      );
    }

    await prisma.correctiveAction.delete({ where: { id: params.id } });

    logAudit({
      userId: session.user.id,
      action: "delete",
      entityType: "corrective_action",
      entityId: params.id,
      details: { actionNumber: action.actionNumber, title: action.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting corrective action:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Maßnahme" },
      { status: 500 }
    );
  }
}
