import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderGbaReport } from "@/lib/pdf/gba-report";

// GET /api/substances/[id]/gba - Generate GBA PDF
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const substance = await prisma.hazardousSubstance.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { name: true } },
        extractions: {
          where: { extractionStatus: "completed" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!substance) {
      return NextResponse.json(
        { error: "Gefahrstoff nicht gefunden" },
        { status: 404 }
      );
    }

    // Build GBA data from substance + latest extraction
    const extraction = substance.extractions[0];
    const rawExtraction = extraction?.rawExtraction as Record<string, unknown> | null;

    const gbaData = {
      substanceName: substance.tradeName,
      manufacturer: substance.manufacturer,
      casNumber: substance.casNumber,
      gbaNumber: substance.gbaNumber,
      companyName: substance.company.name,
      ghsPictograms: substance.ghsPictograms,
      signalWord: substance.signalWord,
      hStatements: substance.hStatements,
      pStatements: substance.pStatements,
      hazards: (extraction?.hazards || rawExtraction?.hazards || null) as {
        physicalHazards: string[];
        healthHazards: string[];
        environmentalHazards: string[];
      } | null,
      protectiveMeasures: (extraction?.protectiveMeasures ||
        rawExtraction?.protectiveMeasures ||
        null) as {
        eyeProtection: string;
        handProtection: string;
        skinProtection: string;
        respiratoryProtection: string;
        generalMeasures: string;
      } | null,
      firstAid: (extraction?.firstAid || rawExtraction?.firstAid || null) as {
        inhalation: string;
        skinContact: string;
        eyeContact: string;
        ingestion: string;
        generalNotes: string;
      } | null,
      emergencyBehavior: (extraction?.emergencyBehavior ||
        rawExtraction?.emergencyBehavior ||
        null) as {
        fireExtinguishing: string;
        spillCleanup: string;
        personalPrecautions: string;
      } | null,
      disposal: (extraction?.disposal || rawExtraction?.disposal || null) as {
        wasteCode: string;
        disposalMethod: string;
      } | null,
      storage: (extraction?.storage || rawExtraction?.storage || null) as {
        conditions: string;
        incompatibleMaterials: string;
      } | null,
    };

    const buffer = await renderGbaReport(gbaData);

    const filename = `GBA_${substance.tradeName.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating GBA:", error);
    return NextResponse.json(
      { error: "Fehler beim Generieren der Betriebsanweisung" },
      { status: 500 }
    );
  }
}
