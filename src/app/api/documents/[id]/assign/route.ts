import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/documents/[id]/assign - Assign document to companies
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

    const body = await request.json();
    const { companyIds } = body;

    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      return NextResponse.json(
        { error: "companyIds muss ein nicht-leeres Array sein" },
        { status: 400 }
      );
    }

    // Create company-document links (skip existing ones)
    const results = await Promise.all(
      companyIds.map(async (companyId: string) => {
        try {
          return await prisma.companyDocument.upsert({
            where: {
              companyId_documentId: {
                companyId,
                documentId: params.id,
              },
            },
            update: {},
            create: {
              companyId,
              documentId: params.id,
              syncedVersion: document.version,
              isCurrent: true,
              assignedById: session.user.id,
            },
          });
        } catch {
          return null;
        }
      })
    );

    const created = results.filter(Boolean).length;

    return NextResponse.json({
      success: true,
      assigned: created,
    });
  } catch (error) {
    console.error("Error assigning document:", error);
    return NextResponse.json(
      { error: "Fehler beim Zuweisen des Dokuments" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id]/assign - Remove document from companies
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { companyIds } = body;

    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      return NextResponse.json(
        { error: "companyIds muss ein nicht-leeres Array sein" },
        { status: 400 }
      );
    }

    await prisma.companyDocument.deleteMany({
      where: {
        documentId: params.id,
        companyId: { in: companyIds },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unassigning document:", error);
    return NextResponse.json(
      { error: "Fehler beim Entfernen der Zuweisung" },
      { status: 500 }
    );
  }
}
