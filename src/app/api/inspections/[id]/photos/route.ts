import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// POST /api/inspections/[id]/photos - Upload a photo
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id: params.id },
    });

    if (!inspection) {
      return NextResponse.json(
        { error: "Begehung nicht gefunden" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
    const findingId = (formData.get("findingId") as string) || null;
    const caption = (formData.get("caption") as string) || null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "Foto ist erforderlich" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || ".jpg";
    const uuid = randomUUID();
    const safeFileName = `${uuid}${ext}`;
    const photoDir = path.join(
      process.cwd(),
      "uploads",
      "inspections",
      params.id
    );

    await mkdir(photoDir, { recursive: true });
    const fullPath = path.join(photoDir, safeFileName);
    await writeFile(fullPath, buffer);

    const filePath = `uploads/inspections/${params.id}/${safeFileName}`;

    // Count existing photos for sort order
    const existingCount = await prisma.inspectionPhoto.count({
      where: { inspectionId: params.id },
    });

    const photo = await prisma.inspectionPhoto.create({
      data: {
        inspectionId: params.id,
        findingId,
        filePath,
        fileName: file.name,
        caption,
        takenAt: new Date(),
        sortOrder: existingCount + 1,
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return NextResponse.json(
      { error: "Fehler beim Hochladen des Fotos" },
      { status: 500 }
    );
  }
}
