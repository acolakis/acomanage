import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanyFilter } from "@/lib/access-control";
import { parsePaginationParams, paginatedResponse } from "@/lib/pagination";

// GET /api/corrective-actions - List corrective actions
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status");
  const sourceType = searchParams.get("sourceType");
  const priority = searchParams.get("priority");
  const incidentId = searchParams.get("incidentId");

  const where: Record<string, unknown> = {
    ...getCompanyFilter(session),
  };
  if (companyId) where.companyId = companyId;
  if (status) where.status = status;
  if (sourceType) where.sourceType = sourceType;
  if (priority) where.priority = priority;
  if (incidentId) where.incidentId = incidentId;

  const pagination = parsePaginationParams(searchParams);

  try {
    const actions = await prisma.correctiveAction.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        responsible: { select: { firstName: true, lastName: true } },
        incident: { select: { id: true, incidentNumber: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    if (pagination) {
      const total = await prisma.correctiveAction.count({ where });
      return NextResponse.json(paginatedResponse(actions, total, pagination));
    }

    return NextResponse.json(actions);
  } catch (error) {
    console.error("Error fetching corrective actions:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Maßnahmen" },
      { status: 500 }
    );
  }
}

// POST /api/corrective-actions - Create a new corrective action
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
      description,
      sourceType,
      sourceId,
      sourceReference,
      priority,
      measureType,
      responsibleId,
      deadline,
      effectivenessCheck,
      incidentId,
    } = body;

    if (!companyId || !title || !sourceType) {
      return NextResponse.json(
        { error: "Betrieb, Titel und Quelltyp sind erforderlich" },
        { status: 400 }
      );
    }

    // Generate action number: MA-{year}-{NNN}
    const year = new Date().getFullYear();
    const count = await prisma.correctiveAction.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const actionNumber = `MA-${year}-${String(count + 1).padStart(3, "0")}`;

    const action = await prisma.correctiveAction.create({
      data: {
        companyId,
        actionNumber,
        title,
        description: description || null,
        sourceType,
        sourceId: sourceId || null,
        sourceReference: sourceReference || null,
        priority: priority || "MITTEL",
        measureType: measureType || null,
        responsibleId: responsibleId || null,
        deadline: deadline ? new Date(deadline) : null,
        effectivenessCheck: effectivenessCheck || null,
        incidentId: incidentId || null,
        createdById: session.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
        responsible: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "corrective_action",
      entityId: action.id,
      details: { actionNumber, title, sourceType },
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error("Error creating corrective action:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Maßnahme" },
      { status: 500 }
    );
  }
}
