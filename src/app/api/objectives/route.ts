import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanyFilter } from "@/lib/access-control";
import { parsePaginationParams, paginatedResponse } from "@/lib/pagination";

// GET /api/objectives - List objectives
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {
    ...getCompanyFilter(session),
  };
  if (companyId) where.companyId = companyId;
  if (status) where.status = status;

  const pagination = parsePaginationParams(searchParams);

  try {
    const objectives = await prisma.ohsObjective.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        responsible: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { progress: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    if (pagination) {
      const total = await prisma.ohsObjective.count({ where });
      return NextResponse.json(paginatedResponse(objectives, total, pagination));
    }

    return NextResponse.json(objectives);
  } catch (error) {
    console.error("Error fetching objectives:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der SGA-Ziele" },
      { status: 500 }
    );
  }
}

// POST /api/objectives - Create a new objective
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
      targetValue,
      currentValue,
      unit,
      responsibleId,
      startDate,
      targetDate,
      isoClause,
      relatedRiskId,
    } = body;

    if (!companyId || !title) {
      return NextResponse.json(
        { error: "Betrieb und Titel sind erforderlich" },
        { status: 400 }
      );
    }

    const objective = await prisma.ohsObjective.create({
      data: {
        companyId,
        title,
        description: description || null,
        targetValue: targetValue || null,
        currentValue: currentValue || null,
        unit: unit || null,
        status: "ENTWURF",
        responsibleId: responsibleId || null,
        startDate: startDate ? new Date(startDate) : null,
        targetDate: targetDate ? new Date(targetDate) : null,
        isoClause: isoClause || null,
        relatedRiskId: relatedRiskId || null,
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
      entityType: "ohs_objective",
      entityId: objective.id,
      details: { title },
    });

    return NextResponse.json(objective, { status: 201 });
  } catch (error) {
    console.error("Error creating objective:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des SGA-Ziels" },
      { status: 500 }
    );
  }
}
