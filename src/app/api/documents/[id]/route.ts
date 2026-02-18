import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyCompanyUsers } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// GET /api/documents/[id] - Get single document with linked companies
export async function GET(
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
      include: {
        category: true,
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        companyDocuments: {
          include: {
            company: {
              select: { id: true, name: true, isActive: true },
            },
          },
        },
        propagations: {
          orderBy: { propagatedAt: "desc" },
          take: 10,
          include: {
            propagatedBy: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Dokuments" },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id] - Update document metadata or upload new version
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existing = await prisma.document.findUnique({
      where: { id: params.id },
      include: { category: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden" },
        { status: 404 }
      );
    }

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // File upload - new version
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const title = (formData.get("title") as string) || existing.title;
      const description =
        (formData.get("description") as string) || existing.description;

      let filePath = existing.filePath;
      let fileType = existing.fileType;
      let fileSize = existing.fileSize;
      let newVersion = existing.version;

      if (file && file.size > 0) {
        // Delete old file if exists
        if (existing.filePath) {
          try {
            await unlink(path.join(process.cwd(), existing.filePath));
          } catch {
            // Ignore if old file doesn't exist
          }
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = path.extname(file.name);
        const uuid = randomUUID();
        const safeFileName = `${uuid}${ext}`;
        const categoryDir = path.join(
          process.cwd(),
          "uploads",
          "documents",
          existing.category.code
        );

        await mkdir(categoryDir, { recursive: true });
        const fullPath = path.join(categoryDir, safeFileName);
        await writeFile(fullPath, buffer);

        filePath = `uploads/documents/${existing.category.code}/${safeFileName}`;
        fileType = ext.replace(".", "").toLowerCase();
        fileSize = file.size;
        newVersion = existing.version + 1;
      }

      const document = await prisma.document.update({
        where: { id: params.id },
        data: {
          title,
          description,
          filePath,
          fileType,
          fileSize,
          version: newVersion,
        },
        include: { category: true },
      });

      // If version changed and this is a template, mark linked company docs as outdated
      if (newVersion > existing.version && existing.isTemplate) {
        await prisma.companyDocument.updateMany({
          where: {
            documentId: params.id,
            syncedVersion: { lt: newVersion },
          },
          data: { isCurrent: false },
        });

        // Notify assigned companies about the update
        const assignedCompanies = await prisma.companyDocument.findMany({
          where: { documentId: params.id },
          select: { companyId: true },
        });
        for (const cd of assignedCompanies) {
          notifyCompanyUsers(cd.companyId, {
            type: "document_updated",
            title: "Dokument aktualisiert",
            message: `Das Dokument "${document.title}" wurde auf Version ${newVersion} aktualisiert.`,
            referenceType: "document",
            referenceId: document.id,
          }).catch(console.error);
        }
      }

      logAudit({ userId: session.user.id, action: "update", entityType: "document", entityId: params.id, details: { title: document.title, version: document.version } });

      return NextResponse.json(document);
    } else {
      // JSON update - metadata only
      const body = await request.json();
      const updateData: Record<string, unknown> = {};

      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined)
        updateData.description = body.description;
      if (body.isTemplate !== undefined) updateData.isTemplate = body.isTemplate;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;

      const document = await prisma.document.update({
        where: { id: params.id },
        data: updateData,
        include: { category: true },
      });

      logAudit({ userId: session.user.id, action: "update", entityType: "document", entityId: params.id, details: { title: document.title } });

      return NextResponse.json(document);
    }
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Dokuments" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Archive document
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    await prisma.document.update({
      where: { id: params.id },
      data: { status: "archived" },
    });

    logAudit({ userId: session.user.id, action: "archive", entityType: "document", entityId: params.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error archiving document:", error);
    return NextResponse.json(
      { error: "Fehler beim Archivieren des Dokuments" },
      { status: 500 }
    );
  }
}
