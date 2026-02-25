import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";
import { renderTrainingReport } from "@/lib/pdf/training-report";

// GET /api/trainings/[id]/pdf - Generate Unterweisungsnachweis PDF
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
      include: {
        company: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        participants: { orderBy: { participantName: "asc" } },
      },
    });

    if (!training) {
      return NextResponse.json(
        { error: "Schulung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, training.companyId)) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    const buffer = await renderTrainingReport(JSON.parse(JSON.stringify(training)));

    const safeTitle = training.title
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, "")
      .substring(0, 50);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="unterweisungsnachweis-${safeTitle}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating training PDF:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des PDF" },
      { status: 500 }
    );
  }
}
