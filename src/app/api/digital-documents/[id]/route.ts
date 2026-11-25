import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCompanyAccess } from "@/lib/access-control";
import { DIGITAL_CATEGORIES } from "@/types/digital-documents";

// GET /api/digital-documents/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const document = await prisma.digitalDocument.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, document.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Fehler beim Laden des digitalen Dokuments:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Dokuments" },
      { status: 500 }
    );
  }
}

// PUT /api/digital-documents/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.digitalDocument.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, existing.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.formData !== undefined) {
      updateData.formData = JSON.parse(JSON.stringify(body.formData));
    }
    if (body.status !== undefined) updateData.status = body.status;
    if (body.validFrom !== undefined) {
      updateData.validFrom = body.validFrom ? new Date(body.validFrom) : null;
    }
    if (body.validUntil !== undefined) {
      updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    }
    if (body.categoryCode !== undefined) {
      if (!DIGITAL_CATEGORIES.includes(body.categoryCode)) {
        return NextResponse.json(
          { error: `Ungültiger Kategorie-Code: ${body.categoryCode}` },
          { status: 400 }
        );
      }
      updateData.categoryCode = body.categoryCode;
    }

    const document = await prisma.digitalDocument.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "digital_document.update",
      entityType: "DigitalDocument",
      entityId: params.id,
      details: { categoryCode: document.categoryCode, status: document.status },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Fehler beim Aktualisieren des digitalen Dokuments:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Dokuments" },
      { status: 500 }
    );
  }
}

// DELETE /api/digital-documents/[id] — Soft delete (archive)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const document = await prisma.digitalDocument.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, document.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    await prisma.digitalDocument.update({
      where: { id: params.id },
      data: { status: "archived" },
    });

    logAudit({
      userId: session.user.id,
      action: "digital_document.archive",
      entityType: "DigitalDocument",
      entityId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Archivieren des digitalen Dokuments:", error);
    return NextResponse.json(
      { error: "Fehler beim Archivieren des Dokuments" },
      { status: 500 }
    );
  }
}
