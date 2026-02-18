import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractFromManual } from "@/lib/ai/manual-extractor";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// POST /api/ai/extract-manual - Upload a machine manual PDF and extract data
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const machineId = formData.get("machineId") as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    if (!machineId) {
      return NextResponse.json(
        { error: "machineId ist erforderlich" },
        { status: 400 }
      );
    }

    // Verify machine exists
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
    });

    if (!machine) {
      return NextResponse.json(
        { error: "Maschine nicht gefunden" },
        { status: 404 }
      );
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = path.extname(file.name) || ".pdf";
    const uuid = randomUUID();
    const fileName = `${uuid}${ext}`;
    const uploadDir = path.join(process.cwd(), "uploads", "manuals");
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const relativeFilePath = `uploads/manuals/${fileName}`;

    // Create extraction record
    const extraction = await prisma.manualExtraction.create({
      data: {
        machineId,
        sourceFile: relativeFilePath,
        extractionStatus: "processing",
      },
    });

    // Run AI extraction
    try {
      const result = await extractFromManual(relativeFilePath);

      // Update extraction with results
      const updated = await prisma.manualExtraction.update({
        where: { id: extraction.id },
        data: {
          extractionStatus: "completed",
          rawExtraction: JSON.parse(JSON.stringify(result)),
          scope: JSON.parse(JSON.stringify(result.scope)),
          hazards: JSON.parse(JSON.stringify(result.hazards)),
          protectiveMeasures: JSON.parse(JSON.stringify(result.protectiveMeasures)),
          malfunctions: JSON.parse(JSON.stringify(result.malfunctions)),
          firstAid: JSON.parse(JSON.stringify(result.firstAid)),
          maintenance: JSON.parse(JSON.stringify(result.maintenance)),
          confidenceScore: result.confidenceScore,
        },
      });

      return NextResponse.json(updated);
    } catch (aiError) {
      // Mark extraction as failed
      await prisma.manualExtraction.update({
        where: { id: extraction.id },
        data: { extractionStatus: "failed" },
      });

      console.error("AI extraction error:", aiError);
      return NextResponse.json(
        { error: "KI-Extraktion fehlgeschlagen. Bitte versuchen Sie es erneut." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in manual extraction:", error);
    return NextResponse.json(
      { error: "Fehler bei der Verarbeitung" },
      { status: 500 }
    );
  }
}
