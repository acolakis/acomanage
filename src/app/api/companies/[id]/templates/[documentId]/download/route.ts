import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import {
  personalizeDocx,
  isDocxFile,
  buildReplacementRules,
} from "@/lib/docx-personalizer";
import { getTemplateSourceData } from "@/lib/settings";

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

// GET /api/companies/[id]/templates/[documentId]/download
// Downloads a template personalized with the company's data
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Nicht autorisiert" },
      { status: 401 }
    );
  }

  try {
    const [company, document, sourceData] = await Promise.all([
      prisma.company.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          name: true,
          street: true,
          zip: true,
          city: true,
          contactName: true,
        },
      }),
      prisma.document.findUnique({
        where: { id: params.documentId },
      }),
      getTemplateSourceData(),
    ]);

    if (!company) {
      return NextResponse.json(
        { error: "Unternehmen nicht gefunden" },
        { status: 404 }
      );
    }

    if (!document || !document.filePath) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden" },
        { status: 404 }
      );
    }

    const fullPath = path.join(process.cwd(), document.filePath);
    const originalBuffer = await readFile(fullPath);

    const ext = document.fileType || "bin";
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    // Personalize .docx files
    let outputBuffer: Buffer = Buffer.from(originalBuffer);
    if (isDocxFile(document.fileType)) {
      const rules = buildReplacementRules(sourceData, company);
      if (rules.length > 0) {
        outputBuffer = await personalizeDocx(outputBuffer, rules);
      }
    }

    // Build filename with company name
    const safeCompanyName = company.name.replace(/[^\w\s-äöüÄÖÜß]/g, "").trim();
    const fileName = `${document.title} - ${safeCompanyName}.${ext}`;

    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": String(outputBuffer.length),
      },
    });
  } catch (error) {
    console.error("Error downloading personalized template:", error);
    return NextResponse.json(
      { error: "Fehler beim Herunterladen" },
      { status: 500 }
    );
  }
}
