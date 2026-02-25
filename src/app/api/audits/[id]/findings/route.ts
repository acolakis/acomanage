import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/audits/[id]/findings - List findings for an audit
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const audit = await prisma.internalAudit.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    });

    if (!audit) {
      return NextResponse.json(
        { error: "Audit nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, audit.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const findings = await prisma.auditFinding.findMany({
      where: { auditId: params.id },
      include: {
        action: {
          select: {
            id: true,
            actionNumber: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
      orderBy: { findingNumber: "asc" },
    });

    return NextResponse.json(findings);
  } catch (error) {
    console.error("Error fetching findings:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Feststellungen" },
      { status: 500 }
    );
  }
}

// POST /api/audits/[id]/findings - Create a finding
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const audit = await prisma.internalAudit.findUnique({
      where: { id: params.id },
      select: { id: true, companyId: true, auditNumber: true, title: true },
    });

    if (!audit) {
      return NextResponse.json(
        { error: "Audit nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, audit.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const { findingType, isoClause, description, evidence, createAction } = body;

    if (!findingType || !description) {
      return NextResponse.json(
        { error: "Feststellungstyp und Beschreibung sind erforderlich" },
        { status: 400 }
      );
    }

    // Auto-increment finding number
    const maxFinding = await prisma.auditFinding.findFirst({
      where: { auditId: params.id },
      orderBy: { findingNumber: "desc" },
      select: { findingNumber: true },
    });
    const findingNumber = (maxFinding?.findingNumber ?? 0) + 1;

    let actionId: string | null = null;

    // Optionally auto-create a CorrectiveAction
    if (createAction && (findingType === "ABWEICHUNG_SCHWER" || findingType === "ABWEICHUNG_LEICHT" || findingType === "VERBESSERUNG")) {
      const year = new Date().getFullYear();
      const actionCount = await prisma.correctiveAction.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      const actionNumber = `MA-${year}-${String(actionCount + 1).padStart(3, "0")}`;

      const findingTypeLabels: Record<string, string> = {
        ABWEICHUNG_SCHWER: "Schwere Abweichung",
        ABWEICHUNG_LEICHT: "Leichte Abweichung",
        VERBESSERUNG: "Verbesserungspotential",
      };

      const action = await prisma.correctiveAction.create({
        data: {
          companyId: audit.companyId,
          actionNumber,
          title: `${findingTypeLabels[findingType] || findingType}: ${description.slice(0, 100)}`,
          description: `Aus Audit ${audit.auditNumber || audit.id}: ${description}`,
          sourceType: "AUDIT",
          sourceId: audit.id,
          sourceReference: audit.auditNumber || null,
          priority: findingType === "ABWEICHUNG_SCHWER" ? "HOCH" : "MITTEL",
          createdById: session.user.id,
        },
      });
      actionId = action.id;

      logAudit({
        userId: session.user.id,
        action: "create",
        entityType: "corrective_action",
        entityId: action.id,
        details: { actionNumber, sourceType: "AUDIT", auditId: audit.id },
      });
    }

    const finding = await prisma.auditFinding.create({
      data: {
        auditId: params.id,
        findingNumber,
        findingType,
        isoClause: isoClause || null,
        description,
        evidence: evidence || null,
        actionId,
      },
      include: {
        action: {
          select: {
            id: true,
            actionNumber: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "audit_finding",
      entityId: finding.id,
      details: { auditId: params.id, findingType, findingNumber },
    });

    return NextResponse.json(finding, { status: 201 });
  } catch (error) {
    console.error("Error creating finding:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Feststellung" },
      { status: 500 }
    );
  }
}
