import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";
import * as fs from "fs";
import * as path from "path";

// DELETE /api/inspections/[id]/photos/[photoId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id: params.id },
      select: { companyId: true, status: true },
    });

    if (!inspection) {
      return NextResponse.json(
        { error: "Begehung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, inspection.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    if (inspection.status !== "DRAFT" && inspection.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Fotos können nur bei aktiven Begehungen gelöscht werden" },
        { status: 400 }
      );
    }

    const photo = await prisma.inspectionPhoto.findUnique({
      where: { id: params.photoId },
    });

    if (!photo || photo.inspectionId !== params.id) {
      return NextResponse.json(
        { error: "Foto nicht gefunden" },
        { status: 404 }
      );
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), photo.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete DB record
    await prisma.inspectionPhoto.delete({
      where: { id: params.photoId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Fotos" },
      { status: 500 }
    );
  }
}
