import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanyFilter, hasCompanyAccess } from "@/lib/access-control";

// GET /api/kpis/values - List KPI values with filters
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const kpiId = searchParams.get("kpiId");
  const period = searchParams.get("period");

  const where: Record<string, unknown> = {
    ...getCompanyFilter(session),
  };
  if (companyId) where.companyId = companyId;
  if (kpiId) where.kpiId = kpiId;
  if (period) where.period = period;

  try {
    const values = await prisma.kpiValue.findMany({
      where,
      include: {
        kpi: { select: { id: true, code: true, name: true, unit: true, targetDirection: true } },
        company: { select: { id: true, name: true } },
        recordedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ period: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(values);
  } catch (error) {
    console.error("Error fetching KPI values:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Kennzahlen-Werte" },
      { status: 500 }
    );
  }
}

// POST /api/kpis/values - Create or update (upsert) a KPI value
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { kpiId, companyId, period, value, target, notes } = body;

    if (!kpiId || !companyId || !period || value === undefined || value === null) {
      return NextResponse.json(
        { error: "KPI, Betrieb, Periode und Wert sind erforderlich" },
        { status: 400 }
      );
    }

    if (!hasCompanyAccess(session, companyId)) {
      return NextResponse.json(
        { error: "Kein Zugriff auf diesen Betrieb" },
        { status: 403 }
      );
    }

    // Verify KPI definition exists
    const kpiDef = await prisma.kpiDefinition.findUnique({
      where: { id: kpiId },
    });
    if (!kpiDef) {
      return NextResponse.json(
        { error: "Kennzahl-Definition nicht gefunden" },
        { status: 404 }
      );
    }

    const kpiValue = await prisma.kpiValue.upsert({
      where: {
        kpiId_companyId_period: {
          kpiId,
          companyId,
          period,
        },
      },
      update: {
        value: parseFloat(value),
        target: target !== undefined && target !== null && target !== "" ? parseFloat(target) : null,
        notes: notes || null,
        recordedById: session.user.id,
      },
      create: {
        kpiId,
        companyId,
        period,
        value: parseFloat(value),
        target: target !== undefined && target !== null && target !== "" ? parseFloat(target) : null,
        notes: notes || null,
        recordedById: session.user.id,
      },
      include: {
        kpi: { select: { id: true, code: true, name: true, unit: true } },
        company: { select: { id: true, name: true } },
        recordedBy: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "upsert",
      entityType: "kpi_value",
      entityId: kpiValue.id,
      details: { kpiCode: kpiDef.code, companyId, period, value },
    });

    return NextResponse.json(kpiValue, { status: 201 });
  } catch (error) {
    console.error("Error saving KPI value:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern des Kennzahlen-Werts" },
      { status: 500 }
    );
  }
}
