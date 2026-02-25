import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/trainings/[id] - Get training with all details
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const training = await prisma.trainingEvent.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        template: { select: { id: true, title: true } },
        participants: {
          orderBy: { participantName: "asc" },
        },
      },
    });

    if (!training) {
      return NextResponse.json(
        { error: "Schulung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, training.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    return NextResponse.json(training);
  } catch (error) {
    console.error("Error fetching training:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Schulung" },
      { status: 500 }
    );
  }
}

// PUT /api/trainings/[id] - Update training
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.trainingEvent.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Schulung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.trainingType !== undefined) updateData.trainingType = body.trainingType;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.legalBasis !== undefined) updateData.legalBasis = body.legalBasis;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.instructor !== undefined) updateData.instructor = body.instructor;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.trainingDate !== undefined) {
      updateData.trainingDate = body.trainingDate ? new Date(body.trainingDate) : null;
    }
    if (body.startTime !== undefined) updateData.startTime = body.startTime;
    if (body.duration !== undefined) {
      updateData.duration = body.duration !== null ? parseInt(body.duration) : null;
    }
    if (body.recurrenceMonths !== undefined) {
      updateData.recurrenceMonths = body.recurrenceMonths !== null ? parseInt(body.recurrenceMonths) : null;
    }
    if (body.nextDueDate !== undefined) {
      updateData.nextDueDate = body.nextDueDate ? new Date(body.nextDueDate) : null;
    }
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.sections !== undefined) updateData.sections = body.sections ? JSON.parse(JSON.stringify(body.sections)) : null;

    if (body.status !== undefined) {
      updateData.status = body.status;

      // When status changes to DURCHGEFUEHRT, set completedAt
      if (body.status === "DURCHGEFUEHRT" && existing.status !== "DURCHGEFUEHRT") {
        updateData.completedAt = new Date();

        // If recurrenceMonths is set, compute nextDueDate
        const recurrence = body.recurrenceMonths !== undefined
          ? (body.recurrenceMonths !== null ? parseInt(body.recurrenceMonths) : null)
          : existing.recurrenceMonths;
        const trainingDate = body.trainingDate !== undefined
          ? (body.trainingDate ? new Date(body.trainingDate) : null)
          : existing.trainingDate;

        if (recurrence && trainingDate) {
          const next = new Date(trainingDate);
          next.setMonth(next.getMonth() + recurrence);
          updateData.nextDueDate = next;
        }
      }
    }

    const training = await prisma.trainingEvent.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        template: { select: { id: true, title: true } },
        participants: {
          orderBy: { participantName: "asc" },
        },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "update",
      entityType: "training",
      entityId: params.id,
      details: { status: body.status },
    });

    return NextResponse.json(training);
  } catch (error) {
    console.error("Error updating training:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Schulung" },
      { status: 500 }
    );
  }
}

// DELETE /api/trainings/[id] - Delete training (only GEPLANT status)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const training = await prisma.trainingEvent.findUnique({
      where: { id: params.id },
    });

    if (!training) {
      return NextResponse.json(
        { error: "Schulung nicht gefunden" },
        { status: 404 }
      );
    }

    if (training.status !== "GEPLANT") {
      return NextResponse.json(
        { error: "Nur geplante Schulungen können gelöscht werden" },
        { status: 400 }
      );
    }

    if (!hasCompanyAccess(session, training.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    await prisma.trainingEvent.delete({ where: { id: params.id } });

    logAudit({
      userId: session.user.id,
      action: "delete",
      entityType: "training",
      entityId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting training:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Schulung" },
      { status: 500 }
    );
  }
}
