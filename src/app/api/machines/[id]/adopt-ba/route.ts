import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// POST /api/machines/[id]/adopt-ba
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const { documentId } = await request.json();
    if (!documentId) {
      return NextResponse.json(
        { error: "documentId ist erforderlich" },
        { status: 400 }
      );
    }

    const machine = await prisma.machine.findUnique({
      where: { id: params.id },
      select: { id: true, companyId: true, name: true },
    });

    if (!machine) {
      return NextResponse.json(
        { error: "Maschine nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, machine.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, title: true, isTemplate: true, status: true },
    });

    if (!document || document.status !== "active") {
      return NextResponse.json(
        { error: "Dokument nicht gefunden" },
        { status: 404 }
      );
    }

    // Link BA to machine
    await prisma.machine.update({
      where: { id: params.id },
      data: { baDocumentId: documentId },
    });

    // Ensure CompanyDocument link exists
    await prisma.companyDocument.upsert({
      where: {
        companyId_documentId: {
          companyId: machine.companyId,
          documentId: documentId,
        },
      },
      update: {},
      create: {
        companyId: machine.companyId,
        documentId: documentId,
        assignedById: session.user.id,
      },
    });

    logAudit({
      userId: session.user.id,
      action: "adopt_ba",
      entityType: "machine",
      entityId: params.id,
      details: {
        machineName: machine.name,
        documentId: documentId,
        documentTitle: document.title,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adopting BA for machine:", error);
    return NextResponse.json(
      { error: "Fehler beim Übernehmen der Betriebsanweisung" },
      { status: 500 }
    );
  }
}
