import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanyFilter, hasCompanyAccess } from "@/lib/access-control";
import { parsePaginationParams, paginatedResponse } from "@/lib/pagination";

// GET /api/audits - List internal audits
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status");
  const auditType = searchParams.get("auditType");

  const where: Record<string, unknown> = {
    ...getCompanyFilter(session),
  };
  if (companyId) where.companyId = companyId;
  if (status) where.status = status;
  if (auditType) where.auditType = auditType;

  const pagination = parsePaginationParams(searchParams);

  try {
    const audits = await prisma.internalAudit.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        auditor: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { findings: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    if (pagination) {
      const total = await prisma.internalAudit.count({ where });
      return NextResponse.json(paginatedResponse(audits, total, pagination));
    }

    return NextResponse.json(audits);
  } catch (error) {
    console.error("Error fetching audits:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Audits" },
      { status: 500 }
    );
  }
}

// POST /api/audits - Create a new internal audit
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
      auditType,
      isoClause,
      plannedDate,
      auditorId,
      auditees,
      scope,
    } = body;

    if (!companyId || !title || !auditType) {
      return NextResponse.json(
        { error: "Betrieb, Titel und Audit-Typ sind erforderlich" },
        { status: 400 }
      );
    }

    if (!hasCompanyAccess(session, companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    // Generate audit number: AUD-{year}-{NNN}
    const year = new Date().getFullYear();
    const count = await prisma.internalAudit.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const auditNumber = `AUD-${year}-${String(count + 1).padStart(3, "0")}`;

    const audit = await prisma.internalAudit.create({
      data: {
        companyId,
        auditNumber,
        title,
        auditType,
        isoClause: isoClause || null,
        plannedDate: plannedDate ? new Date(plannedDate) : null,
        auditorId: auditorId || null,
        auditees: auditees || null,
        scope: scope || null,
        createdById: session.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
        auditor: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "internal_audit",
      entityId: audit.id,
      details: { auditNumber, title, auditType },
    });

    return NextResponse.json(audit, { status: 201 });
  } catch (error) {
    console.error("Error creating audit:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Audits" },
      { status: 500 }
    );
  }
}
