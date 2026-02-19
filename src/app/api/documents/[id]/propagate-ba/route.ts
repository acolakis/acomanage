import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// POST /api/documents/[id]/propagate-ba
// Propagates a BA template to all companies that have substances/machines referencing it
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      select: { id: true, version: true, title: true, isTemplate: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden" },
        { status: 404 }
      );
    }

    // Find all companies via linked substances and machines
    const [substances, machines] = await Promise.all([
      prisma.hazardousSubstance.findMany({
        where: { gbaDocumentId: params.id, status: "active" },
        select: { companyId: true },
      }),
      prisma.machine.findMany({
        where: { baDocumentId: params.id, status: { not: "archived" } },
        select: { companyId: true },
      }),
    ]);

    const companyIds = Array.from(
      new Set([
        ...substances.map((s) => s.companyId),
        ...machines.map((m) => m.companyId),
      ])
    );

    if (companyIds.length === 0) {
      return NextResponse.json({
        success: true,
        companiesUpdated: 0,
        message: "Keine verknüpften Betriebe gefunden",
      });
    }

    // Upsert CompanyDocument for each company
    for (const companyId of companyIds) {
      await prisma.companyDocument.upsert({
        where: {
          companyId_documentId: {
            companyId,
            documentId: params.id,
          },
        },
        update: {
          syncedVersion: document.version,
          isCurrent: true,
          syncedAt: new Date(),
        },
        create: {
          companyId,
          documentId: params.id,
          syncedVersion: document.version,
          isCurrent: true,
          assignedById: session.user.id,
        },
      });
    }

    // Create propagation record
    await prisma.documentPropagation.create({
      data: {
        documentId: params.id,
        fromVersion: document.version,
        toVersion: document.version,
        companyIds: companyIds,
        propagatedById: session.user.id,
        notes: "BA-Propagierung an verknüpfte Betriebe",
      },
    });

    logAudit({
      userId: session.user.id,
      action: "propagate_ba",
      entityType: "document",
      entityId: params.id,
      details: {
        title: document.title,
        companiesUpdated: companyIds.length,
      },
    });

    return NextResponse.json({
      success: true,
      companiesUpdated: companyIds.length,
    });
  } catch (error) {
    console.error("Error propagating BA:", error);
    return NextResponse.json(
      { error: "Fehler bei der BA-Propagierung" },
      { status: 500 }
    );
  }
}
