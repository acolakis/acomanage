import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/emergency-plans/[id]/drills - List drills for a plan
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const plan = await prisma.emergencyPlan.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Notfallplan nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, plan.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const drills = await prisma.emergencyDrill.findMany({
      where: { planId: params.id },
      orderBy: { drillDate: "desc" },
    });

    return NextResponse.json(drills);
  } catch (error) {
    console.error("Error fetching drills:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Übungen" },
      { status: 500 }
    );
  }
}

// POST /api/emergency-plans/[id]/drills - Create a drill
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const plan = await prisma.emergencyPlan.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Notfallplan nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, plan.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const { drillDate, participants, duration, findings, evaluation, improvementActions } = body;

    if (!drillDate) {
      return NextResponse.json(
        { error: "Übungsdatum ist erforderlich" },
        { status: 400 }
      );
    }

    const drill = await prisma.emergencyDrill.create({
      data: {
        planId: params.id,
        drillDate: new Date(drillDate),
        participants: participants || null,
        duration: duration ? parseInt(duration) : null,
        findings: findings || null,
        evaluation: evaluation || null,
        improvementActions: improvementActions || null,
      },
    });

    // Update parent plan's lastDrillDate
    await prisma.emergencyPlan.update({
      where: { id: params.id },
      data: { lastDrillDate: new Date(drillDate) },
    });

    logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "emergency_drill",
      entityId: drill.id,
      details: { planId: params.id, drillDate },
    });

    return NextResponse.json(drill, { status: 201 });
  } catch (error) {
    console.error("Error creating drill:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Übung" },
      { status: 500 }
    );
  }
}
