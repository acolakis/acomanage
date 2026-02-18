import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractFromSds } from "@/lib/ai/sds-extractor";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// POST /api/ai/extract-sds - Upload SDS and extract data
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  if (!process.env.CLAUDE_API_KEY) {
    return NextResponse.json(
      { error: "Claude API-Key nicht konfiguriert" },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const substanceId = (formData.get("substanceId") as string) || null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "SDB-Datei ist erforderlich" },
        { status: 400 }
      );
    }

    // Save the uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = path.extname(file.name) || ".pdf";
    const uuid = randomUUID();
    const safeFileName = `${uuid}${ext}`;
    const sdsDir = path.join(process.cwd(), "uploads", "sds");
    await mkdir(sdsDir, { recursive: true });
    const fullPath = path.join(sdsDir, safeFileName);
    await writeFile(fullPath, buffer);
    const filePath = `uploads/sds/${safeFileName}`;

    // Create extraction record
    const extraction = await prisma.sdsExtraction.create({
      data: {
        substanceId,
        sourceFile: filePath,
        extractionStatus: "processing",
      },
    });

    // Run the AI extraction
    try {
      const result = await extractFromSds(filePath);

      // Update extraction with results (JSON.parse/stringify for Prisma Json type compatibility)
      const jsonSafe = (v: unknown) => JSON.parse(JSON.stringify(v));
      const updated = await prisma.sdsExtraction.update({
        where: { id: extraction.id },
        data: {
          extractionStatus: "completed",
          substanceName: result.substanceName,
          rawExtraction: jsonSafe(result),
          hazards: jsonSafe(result.hazards),
          protectiveMeasures: jsonSafe(result.protectiveMeasures),
          firstAid: jsonSafe(result.firstAid),
          emergencyBehavior: jsonSafe(result.emergencyBehavior),
          disposal: jsonSafe(result.disposal),
          storage: jsonSafe(result.storage),
          confidenceScore: result.confidenceScore,
        },
      });

      // If linked to a substance, update substance data too
      if (substanceId) {
        await prisma.hazardousSubstance.update({
          where: { id: substanceId },
          data: {
            tradeName: result.substanceName || undefined,
            manufacturer: result.manufacturer || undefined,
            casNumber: result.casNumber || undefined,
            ghsPictograms: result.ghsPictograms,
            signalWord: result.signalWord || undefined,
            hStatements: result.hStatements,
            pStatements: result.pStatements,
            protectiveMeasures: [
              result.protectiveMeasures.eyeProtection,
              result.protectiveMeasures.handProtection,
              result.protectiveMeasures.skinProtection,
              result.protectiveMeasures.respiratoryProtection,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        });
      }

      return NextResponse.json(
        {
          extraction: updated,
          result,
        },
        { status: 201 }
      );
    } catch (aiError) {
      // Mark extraction as failed
      await prisma.sdsExtraction.update({
        where: { id: extraction.id },
        data: { extractionStatus: "failed" },
      });
      console.error("AI extraction error:", aiError);
      return NextResponse.json(
        { error: "Fehler bei der KI-Extraktion", extractionId: extraction.id },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in SDS extraction:", error);
    return NextResponse.json(
      { error: "Fehler beim Verarbeiten des SDB" },
      { status: 500 }
    );
  }
}
