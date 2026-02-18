import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyCompanyUsers } from "@/lib/notifications";

// POST /api/documents/[id]/propagate - Propagate updated version to selected companies
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden" },
        { status: 404 }
      );
    }

    if (!document.isTemplate) {
      return NextResponse.json(
        { error: "Nur Vorlagen können propagiert werden" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { companyIds, notes } = body;

    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      return NextResponse.json(
        { error: "companyIds muss ein nicht-leeres Array sein" },
        { status: 400 }
      );
    }

    // Get outdated company documents for the selected companies
    const outdated = await prisma.companyDocument.findMany({
      where: {
        documentId: params.id,
        companyId: { in: companyIds },
        isCurrent: false,
      },
    });

    if (outdated.length === 0) {
      return NextResponse.json({
        success: true,
        propagated: 0,
        message: "Alle ausgewählten Betriebe haben bereits die aktuelle Version",
      });
    }

    const fromVersion = Math.min(...outdated.map((d) => d.syncedVersion));

    // Update company documents to current version
    await prisma.$transaction(async (tx) => {
      // Update all selected company documents
      await tx.companyDocument.updateMany({
        where: {
          documentId: params.id,
          companyId: { in: companyIds },
          isCurrent: false,
        },
        data: {
          syncedVersion: document.version,
          isCurrent: true,
          syncedAt: new Date(),
        },
      });

      // Log the propagation
      await tx.documentPropagation.create({
        data: {
          documentId: params.id,
          fromVersion,
          toVersion: document.version,
          companyIds,
          propagatedById: session.user.id,
          notes: notes || null,
        },
      });
    });

    // Notify company users about the propagation
    for (const cId of companyIds) {
      notifyCompanyUsers(cId, {
        type: "document_propagated",
        title: "Dokument aktualisiert",
        message: `Das Dokument "${document.title}" wurde auf Version ${document.version} aktualisiert.`,
        referenceType: "document",
        referenceId: document.id,
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      propagated: outdated.length,
    });
  } catch (error) {
    console.error("Error propagating document:", error);
    return NextResponse.json(
      { error: "Fehler beim Propagieren des Dokuments" },
      { status: 500 }
    );
  }
}
