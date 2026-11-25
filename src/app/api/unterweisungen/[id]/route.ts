import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/unterweisungen/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const unterweisung = await prisma.unterweisung.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!unterweisung) {
      return NextResponse.json(
        { error: "Unterweisung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, unterweisung.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    return NextResponse.json(unterweisung);
  } catch (error) {
    console.error("Error fetching Unterweisung:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Unterweisung" },
      { status: 500 }
    );
  }
}

// PUT /api/unterweisungen/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.unterweisung.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Unterweisung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.abteilung !== undefined) updateData.abteilung = body.abteilung || null;
    if (body.ort !== undefined) updateData.ort = body.ort || null;
    if (body.datum !== undefined) updateData.datum = new Date(body.datum);
    if (body.zeitVon !== undefined) updateData.zeitVon = body.zeitVon || null;
    if (body.zeitBis !== undefined) updateData.zeitBis = body.zeitBis || null;
    if (body.anlass !== undefined) updateData.anlass = body.anlass;
    if (body.inhalt !== undefined) updateData.inhalt = body.inhalt;
    if (body.naechsterTermin !== undefined) updateData.naechsterTermin = body.naechsterTermin || null;
    if (body.teilnehmerAnzahl !== undefined) {
      updateData.teilnehmerAnzahl = body.teilnehmerAnzahl ? parseInt(body.teilnehmerAnzahl) : 10;
    }
    if (body.status !== undefined) updateData.status = body.status;

    const unterweisung = await prisma.unterweisung.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "update",
      entityType: "unterweisung",
      entityId: params.id,
      details: { status: body.status },
    });

    return NextResponse.json(unterweisung);
  } catch (error) {
    console.error("Error updating Unterweisung:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Unterweisung" },
      { status: 500 }
    );
  }
}

// DELETE /api/unterweisungen/[id] - Soft delete
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const unterweisung = await prisma.unterweisung.findUnique({
      where: { id: params.id },
    });

    if (!unterweisung) {
      return NextResponse.json(
        { error: "Unterweisung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, unterweisung.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    await prisma.unterweisung.update({
      where: { id: params.id },
      data: { status: "archiviert" },
    });

    logAudit({
      userId: session.user.id,
      action: "delete",
      entityType: "unterweisung",
      entityId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Unterweisung:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Unterweisung" },
      { status: 500 }
    );
  }
}
