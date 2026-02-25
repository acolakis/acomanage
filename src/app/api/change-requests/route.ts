import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanyFilter, hasCompanyAccess } from "@/lib/access-control";
import { parsePaginationParams, paginatedResponse } from "@/lib/pagination";

// GET /api/change-requests - List change requests
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status");
  const changeType = searchParams.get("changeType");

  const where: Record<string, unknown> = {
    ...getCompanyFilter(session),
  };
  if (companyId) where.companyId = companyId;
  if (status) where.status = status;
  if (changeType) where.changeType = changeType;

  const pagination = parsePaginationParams(searchParams);

  try {
    const changeRequests = await prisma.changeRequest.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        requestedBy: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    if (pagination) {
      const total = await prisma.changeRequest.count({ where });
      return NextResponse.json(paginatedResponse(changeRequests, total, pagination));
    }

    return NextResponse.json(changeRequests);
  } catch (error) {
    console.error("Error fetching change requests:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Änderungsanträge" },
      { status: 500 }
    );
  }
}

// POST /api/change-requests - Create a new change request
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
      changeType,
      description,
      risksBefore,
      risksAfter,
      mitigations,
    } = body;

    if (!companyId || !title || !changeType) {
      return NextResponse.json(
        { error: "Betrieb, Titel und Änderungstyp sind erforderlich" },
        { status: 400 }
      );
    }

    if (!hasCompanyAccess(session, companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    // Generate change number: CR-{year}-{NNN}
    const year = new Date().getFullYear();
    const count = await prisma.changeRequest.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const changeNumber = `CR-${year}-${String(count + 1).padStart(3, "0")}`;

    const changeRequest = await prisma.changeRequest.create({
      data: {
        companyId,
        changeNumber,
        title,
        changeType,
        description: description || null,
        risksBefore: risksBefore || null,
        risksAfter: risksAfter || null,
        mitigations: mitigations || null,
        requestedById: session.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
        requestedBy: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "change_request",
      entityId: changeRequest.id,
      details: { changeNumber, title, changeType },
    });

    return NextResponse.json(changeRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating change request:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Änderungsantrags" },
      { status: 500 }
    );
  }
}
