import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";
import { renderIncidentReport } from "@/lib/pdf/incident-report";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { name: true, city: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        investigatedBy: { select: { firstName: true, lastName: true } },
        actions: {
          include: {
            responsible: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Vorfall nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, incident.companyId)) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    const buffer = await renderIncidentReport(
      JSON.parse(JSON.stringify(incident))
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="vorfallbericht-${incident.incidentNumber || incident.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating incident PDF:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des PDF" },
      { status: 500 }
    );
  }
}
