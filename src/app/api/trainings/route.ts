import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanyFilter } from "@/lib/access-control";
import { parsePaginationParams, paginatedResponse } from "@/lib/pagination";

// GET /api/trainings - List all training events
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status");
  const trainingType = searchParams.get("trainingType");

  const where: Record<string, unknown> = {
    ...getCompanyFilter(session),
  };
  if (companyId) where.companyId = companyId;
  if (status) where.status = status;
  if (trainingType) where.trainingType = trainingType;

  const pagination = parsePaginationParams(searchParams);

  try {
    const trainings = await prisma.trainingEvent.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        template: { select: { id: true, title: true } },
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { trainingDate: { sort: "desc", nulls: "last" } },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    if (pagination) {
      const total = await prisma.trainingEvent.count({ where });
      return NextResponse.json(paginatedResponse(trainings, total, pagination));
    }

    return NextResponse.json(trainings);
  } catch (error) {
    console.error("Error fetching trainings:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Schulungen" },
      { status: 500 }
    );
  }
}

// POST /api/trainings - Create a new training event
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      companyId,
      title,
      trainingType,
      templateId,
      description,
      legalBasis,
      content,
      instructor,
      location,
      trainingDate,
      startTime,
      duration,
      recurrenceMonths,
      nextDueDate,
      notes,
    } = body;

    if (!companyId || !title || !trainingType) {
      return NextResponse.json(
        { error: "Betrieb, Titel und Schulungsart sind erforderlich" },
        { status: 400 }
      );
    }

    const training = await prisma.trainingEvent.create({
      data: {
        companyId,
        title,
        trainingType,
        templateId: templateId || null,
        description: description || null,
        legalBasis: legalBasis || null,
        content: content || null,
        instructor: instructor || null,
        location: location || null,
        trainingDate: trainingDate ? new Date(trainingDate) : null,
        startTime: startTime || null,
        duration: duration ? parseInt(duration) : null,
        recurrenceMonths: recurrenceMonths ? parseInt(recurrenceMonths) : null,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        notes: notes || null,
        sections: body.sections ? JSON.parse(JSON.stringify(body.sections)) : null,
        createdById: session.user.id,
        status: "GEPLANT",
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "training",
      entityId: training.id,
      details: { title },
    });

    return NextResponse.json(training, { status: 201 });
  } catch (error) {
    console.error("Error creating training:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Schulung" },
      { status: 500 }
    );
  }
}
