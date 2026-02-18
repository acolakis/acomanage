import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/substances/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const substance = await prisma.hazardousSubstance.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        sdsDocument: { select: { id: true, title: true, filePath: true } },
        gbaDocument: { select: { id: true, title: true, filePath: true } },
        extractions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!substance) {
      return NextResponse.json(
        { error: "Gefahrstoff nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(substance);
  } catch (error) {
    console.error("Error fetching substance:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Gefahrstoffs" },
      { status: 500 }
    );
  }
}

// PUT /api/substances/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    const stringFields = [
      "tradeName",
      "manufacturer",
      "casNumber",
      "gbaNumber",
      "usageLocation",
      "usageProcess",
      "usageFrequency",
      "labeling",
      "protectiveMeasures",
      "containerSize",
      "storageLocation",
      "storageAmount",
      "signalWord",
      "wgk",
    ];

    for (const field of stringFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null;
      }
    }

    if (body.sdsDate !== undefined) {
      updateData.sdsDate = body.sdsDate ? new Date(body.sdsDate) : null;
    }
    if (body.gbaDate !== undefined) {
      updateData.gbaDate = body.gbaDate ? new Date(body.gbaDate) : null;
    }
    if (body.exposedPersons !== undefined) {
      updateData.exposedPersons = body.exposedPersons || null;
    }
    if (body.skinContact !== undefined) {
      updateData.skinContact = body.skinContact;
    }
    if (body.ghsPictograms !== undefined) {
      updateData.ghsPictograms = body.ghsPictograms;
    }
    if (body.hStatements !== undefined) {
      updateData.hStatements = body.hStatements;
    }
    if (body.pStatements !== undefined) {
      updateData.pStatements = body.pStatements;
    }

    const substance = await prisma.hazardousSubstance.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(substance);
  } catch (error) {
    console.error("Error updating substance:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Gefahrstoffs" },
      { status: 500 }
    );
  }
}

// DELETE /api/substances/[id] - Soft delete
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    await prisma.hazardousSubstance.update({
      where: { id: params.id },
      data: { status: "archived" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting substance:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Gefahrstoffs" },
      { status: 500 }
    );
  }
}
