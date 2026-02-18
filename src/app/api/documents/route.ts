import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// GET /api/documents - List all documents with optional filters
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const categoryId = searchParams.get("categoryId");
  const isTemplate = searchParams.get("isTemplate");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (isTemplate !== null && isTemplate !== undefined) {
    where.isTemplate = isTemplate === "true";
  }

  if (status) {
    where.status = status;
  }

  try {
    const documents = await prisma.document.findMany({
      where,
      include: {
        category: true,
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        _count: {
          select: { companyDocuments: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Dokumente" },
      { status: 500 }
    );
  }
}

// POST /api/documents - Upload a new document
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const categoryId = formData.get("categoryId") as string;
    const description = (formData.get("description") as string) || null;
    const isTemplate = formData.get("isTemplate") === "true";

    if (!title || !categoryId) {
      return NextResponse.json(
        { error: "Titel und Kategorie sind erforderlich" },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await prisma.documentCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Kategorie nicht gefunden" },
        { status: 404 }
      );
    }

    let filePath: string | null = null;
    let fileType: string | null = null;
    let fileSize: number | null = null;

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = path.extname(file.name);
      const uuid = randomUUID();
      const safeFileName = `${uuid}${ext}`;
      const categoryDir = path.join(
        process.cwd(),
        "uploads",
        "documents",
        category.code
      );

      await mkdir(categoryDir, { recursive: true });
      const fullPath = path.join(categoryDir, safeFileName);
      await writeFile(fullPath, buffer);

      filePath = `uploads/documents/${category.code}/${safeFileName}`;
      fileType = ext.replace(".", "").toLowerCase();
      fileSize = file.size;
    }

    const document = await prisma.document.create({
      data: {
        title,
        description,
        categoryId,
        filePath,
        fileType,
        fileSize,
        isTemplate,
        createdById: session.user.id,
      },
      include: {
        category: true,
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Dokuments" },
      { status: 500 }
    );
  }
}
