import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanyFilter } from "@/lib/access-control";
import { parsePaginationParams, paginatedResponse } from "@/lib/pagination";

// GET /api/incidents - List all incidents
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status");
  const incidentType = searchParams.get("incidentType");
  const severity = searchParams.get("severity");

  const where: Record<string, unknown> = {
    ...getCompanyFilter(session),
  };
  if (companyId) where.companyId = companyId;
  if (status) where.status = status;
  if (incidentType) where.incidentType = incidentType;
  if (severity) where.severity = severity;

  const pagination = parsePaginationParams(searchParams);

  try {
    const incidents = await prisma.incident.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        _count: {
          select: { photos: true, actions: true },
        },
      },
      orderBy: { incidentDate: "desc" },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    if (pagination) {
      const total = await prisma.incident.count({ where });
      return NextResponse.json(paginatedResponse(incidents, total, pagination));
    }

    return NextResponse.json(incidents);
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Vorfälle" },
      { status: 500 }
    );
  }
}

// POST /api/incidents - Create a new incident
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      companyId,
      incidentType,
      severity,
      incidentDate,
      incidentTime,
      description,
      location,
      department,
      affectedPerson,
      affectedRole,
      witnesses,
    } = body;

    if (!companyId || !incidentType || !severity || !incidentDate || !description) {
      return NextResponse.json(
        { error: "Betrieb, Typ, Schweregrad, Datum und Beschreibung sind erforderlich" },
        { status: 400 }
      );
    }

    // Generate incident number: VF-{year}-{NNN}
    const year = new Date(incidentDate).getFullYear();
    const count = await prisma.incident.count({
      where: {
        incidentDate: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const incidentNumber = `VF-${year}-${String(count + 1).padStart(3, "0")}`;

    const incident = await prisma.incident.create({
      data: {
        companyId,
        incidentNumber,
        incidentType,
        severity,
        incidentDate: new Date(incidentDate),
        incidentTime: incidentTime || null,
        description,
        location: location || null,
        department: department || null,
        affectedPerson: affectedPerson || null,
        affectedRole: affectedRole || null,
        witnesses: witnesses || null,
        createdById: session.user.id,
        status: "GEMELDET",
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    logAudit({ userId: session.user.id, action: "create", entityType: "incident", entityId: incident.id, details: { number: incidentNumber } });

    return NextResponse.json(incident, { status: 201 });
  } catch (error) {
    console.error("Error creating incident:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Vorfalls" },
      { status: 500 }
    );
  }
}
