import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";

// DELETE /api/trainings/[id]/participants/[participantId] - Remove participant
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; participantId: string } }
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

    const participant = await prisma.trainingParticipant.findUnique({
      where: { id: params.participantId },
    });

    if (!participant || participant.trainingId !== params.id) {
      return NextResponse.json(
        { error: "Teilnehmer nicht gefunden" },
        { status: 404 }
      );
    }

    await prisma.trainingParticipant.delete({
      where: { id: params.participantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing participant:", error);
    return NextResponse.json(
      { error: "Fehler beim Entfernen des Teilnehmers" },
      { status: 500 }
    );
  }
}
