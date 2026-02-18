import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const machine = await prisma.machine.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        extractions: {
          where: { extractionStatus: "completed" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            extractionStatus: true,
            confidenceScore: true,
            scope: true,
            hazards: true,
            protectiveMeasures: true,
            malfunctions: true,
            firstAid: true,
            maintenance: true,
            createdAt: true,
          },
        },
      },
    });

    if (!machine || machine.status === "archived") {
      return NextResponse.json({ error: "Maschine nicht gefunden" }, { status: 404 });
    }

    if (!hasCompanyAccess(session, machine.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    return NextResponse.json({
      ...machine,
      manualExtractions: machine.extractions.map((e) => ({
        ...e,
        scope: e.scope ? JSON.parse(JSON.stringify(e.scope)) : null,
        hazards: e.hazards ? JSON.parse(JSON.stringify(e.hazards)) : null,
        protectiveMeasures: e.protectiveMeasures ? JSON.parse(JSON.stringify(e.protectiveMeasures)) : null,
        malfunctions: e.malfunctions ? JSON.parse(JSON.stringify(e.malfunctions)) : null,
        firstAid: e.firstAid ? JSON.parse(JSON.stringify(e.firstAid)) : null,
        maintenance: e.maintenance ? JSON.parse(JSON.stringify(e.maintenance)) : null,
      })),
    });
  } catch (error) {
    console.error("Fehler beim Abrufen der Maschine:", error);
    return NextResponse.json({ error: "Fehler beim Abrufen der Maschine" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const existing = await prisma.machine.findUnique({ where: { id: params.id } });
    if (!existing || existing.status === "archived") {
      return NextResponse.json({ error: "Maschine nicht gefunden" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.machineNumber !== undefined) updateData.machineNumber = body.machineNumber || null;
    if (body.manufacturer !== undefined) updateData.manufacturer = body.manufacturer || null;
    if (body.model !== undefined) updateData.model = body.model || null;
    if (body.serialNumber !== undefined) updateData.serialNumber = body.serialNumber || null;
    if (body.location !== undefined) updateData.location = body.location || null;
    if (body.yearOfManufacture !== undefined) {
      updateData.yearOfManufacture = body.yearOfManufacture ? parseInt(body.yearOfManufacture) : null;
    }
    if (body.status !== undefined) updateData.status = body.status;

    const machine = await prisma.machine.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    logAudit({ userId: session.user.id, action: "update", entityType: "machine", entityId: params.id, details: { name: machine.name } });

    return NextResponse.json(machine);
  } catch (error) {
    console.error("Fehler beim Aktualisieren der Maschine:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren der Maschine" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const existing = await prisma.machine.findUnique({ where: { id: params.id } });
    if (!existing || existing.status === "archived") {
      return NextResponse.json({ error: "Maschine nicht gefunden" }, { status: 404 });
    }

    await prisma.machine.update({
      where: { id: params.id },
      data: { status: "archived" },
    });

    logAudit({ userId: session.user.id, action: "archive", entityType: "machine", entityId: params.id, details: { name: existing.name } });

    return NextResponse.json({ message: "Maschine erfolgreich gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen der Maschine:", error);
    return NextResponse.json({ error: "Fehler beim Löschen der Maschine" }, { status: 500 });
  }
}
