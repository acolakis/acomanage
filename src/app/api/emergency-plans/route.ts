import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanyFilter, hasCompanyAccess } from "@/lib/access-control";
import { parsePaginationParams, paginatedResponse } from "@/lib/pagination";

// GET /api/emergency-plans - List emergency plans
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const emergencyType = searchParams.get("emergencyType");
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = {
    ...getCompanyFilter(session),
  };
  if (companyId) where.companyId = companyId;
  if (emergencyType) where.emergencyType = emergencyType;
  if (isActive !== null && isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true";
  }

  const pagination = parsePaginationParams(searchParams);

  try {
    const plans = await prisma.emergencyPlan.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { drills: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    if (pagination) {
      const total = await prisma.emergencyPlan.count({ where });
      return NextResponse.json(paginatedResponse(plans, total, pagination));
    }

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Error fetching emergency plans:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Notfallpläne" },
      { status: 500 }
    );
  }
}

// POST /api/emergency-plans - Create a new emergency plan
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
      emergencyType,
      description,
      procedures,
      responsiblePersons,
      emergencyNumbers,
      nextDrillDate,
    } = body;

    if (!companyId || !title || !emergencyType) {
      return NextResponse.json(
        { error: "Betrieb, Titel und Notfalltyp sind erforderlich" },
        { status: 400 }
      );
    }

    if (!hasCompanyAccess(session, companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const plan = await prisma.emergencyPlan.create({
      data: {
        companyId,
        title,
        emergencyType,
        description: description || null,
        procedures: procedures || null,
        responsiblePersons: responsiblePersons
          ? JSON.parse(JSON.stringify(responsiblePersons))
          : null,
        emergencyNumbers: emergencyNumbers
          ? JSON.parse(JSON.stringify(emergencyNumbers))
          : null,
        nextDrillDate: nextDrillDate ? new Date(nextDrillDate) : null,
        createdById: session.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "emergency_plan",
      entityId: plan.id,
      details: { title, emergencyType },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Error creating emergency plan:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Notfallplans" },
      { status: 500 }
    );
  }
}
