import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";

// POST /api/substances/[id]/adopt-ba
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

    const substance = await prisma.hazardousSubstance.findUnique({
      where: { id: params.id },
      select: { id: true, companyId: true, tradeName: true },
    });

    if (!substance) {
      return NextResponse.json(
        { error: "Gefahrstoff nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, substance.companyId)) {
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

    // Link BA to substance
    await prisma.hazardousSubstance.update({
      where: { id: params.id },
      data: { gbaDocumentId: documentId },
    });

    // Ensure CompanyDocument link exists
    await prisma.companyDocument.upsert({
      where: {
        companyId_documentId: {
          companyId: substance.companyId,
          documentId: documentId,
        },
      },
      update: {},
      create: {
        companyId: substance.companyId,
        documentId: documentId,
        assignedById: session.user.id,
      },
    });

    logAudit({
      userId: session.user.id,
      action: "adopt_ba",
      entityType: "substance",
      entityId: params.id,
      details: {
        substanceName: substance.tradeName,
        documentId: documentId,
        documentTitle: document.title,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adopting BA for substance:", error);
    return NextResponse.json(
      { error: "Fehler beim Übernehmen der Betriebsanweisung" },
      { status: 500 }
    );
  }
}
