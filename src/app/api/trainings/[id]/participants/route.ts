import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";

// GET /api/trainings/[id]/participants - List participants
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const training = await prisma.trainingEvent.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    });

    if (!training) {
      return NextResponse.json(
        { error: "Schulung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, training.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const participants = await prisma.trainingParticipant.findMany({
      where: { trainingId: params.id },
      orderBy: { participantName: "asc" },
    });

    return NextResponse.json(participants);
  } catch (error) {
    console.error("Error fetching participants:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Teilnehmer" },
      { status: 500 }
    );
  }
}

// POST /api/trainings/[id]/participants - Add participant
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const training = await prisma.trainingEvent.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    });

    if (!training) {
      return NextResponse.json(
        { error: "Schulung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, training.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const { participantName, department, notes } = body;

    if (!participantName) {
      return NextResponse.json(
        { error: "Teilnehmername ist erforderlich" },
        { status: 400 }
      );
    }

    const participant = await prisma.trainingParticipant.create({
      data: {
        trainingId: params.id,
        participantName,
        department: department || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    console.error("Error adding participant:", error);
    return NextResponse.json(
      { error: "Fehler beim Hinzufügen des Teilnehmers" },
      { status: 500 }
    );
  }
}

// PUT /api/trainings/[id]/participants - Batch update attendance
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const training = await prisma.trainingEvent.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    });

    if (!training) {
      return NextResponse.json(
        { error: "Schulung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, training.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const { participants } = body;

    if (!Array.isArray(participants)) {
      return NextResponse.json(
        { error: "Teilnehmerliste ist erforderlich" },
        { status: 400 }
      );
    }

    const updates = participants.map(
      (p: { id: string; attended: boolean; signedAt?: string }) =>
        prisma.trainingParticipant.update({
          where: { id: p.id },
          data: {
            attended: p.attended,
            signedAt: p.signedAt ? new Date(p.signedAt) : p.attended ? new Date() : null,
          },
        })
    );

    const updated = await Promise.all(updates);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Anwesenheit" },
      { status: 500 }
    );
  }
}
