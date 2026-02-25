import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// POST /api/incidents/[id]/photos - Upload a photo
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Vorfall nicht gefunden" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
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
      "incidents",
      params.id
    );

    await mkdir(photoDir, { recursive: true });
    const fullPath = path.join(photoDir, safeFileName);
    await writeFile(fullPath, buffer);

    const filePath = `uploads/incidents/${params.id}/${safeFileName}`;

    // Count existing photos for sort order
    const existingCount = await prisma.incidentPhoto.count({
      where: { incidentId: params.id },
    });

    const photo = await prisma.incidentPhoto.create({
      data: {
        incidentId: params.id,
        filePath,
        fileName: file.name,
        caption,
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

// GET /api/incidents/[id]/photos - List photos for an incident
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
      select: { id: true },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Vorfall nicht gefunden" },
        { status: 404 }
      );
    }

    const photos = await prisma.incidentPhoto.findMany({
      where: { incidentId: params.id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Fotos" },
      { status: 500 }
    );
  }
}
