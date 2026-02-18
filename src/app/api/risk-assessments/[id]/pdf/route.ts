import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderGbuReport } from "@/lib/pdf/gbu-report";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { id } = params;

    const assessment = await prisma.riskAssessment.findUnique({
      where: { id },
      include: {
        company: {
          select: { name: true },
        },
        assessedBy: {
          select: { firstName: true, lastName: true },
        },
        hazards: {
          orderBy: { hazardNumber: "asc" },
        },
      },
    });

    if (!assessment || assessment.status === "archived") {
      return NextResponse.json(
        { error: "Gefährdungsbeurteilung nicht gefunden" },
        { status: 404 }
      );
    }

    const data = {
      title: assessment.title,
      assessmentType: assessment.assessmentType,
      legalBasis: assessment.legalBasis,
      assessedArea: assessment.assessedArea,
      status: assessment.status,
      version: assessment.version,
      assessmentDate: assessment.assessmentDate?.toISOString() ?? null,
      nextReviewDate: assessment.nextReviewDate?.toISOString() ?? null,
      companyName: assessment.company.name,
      assessedByName: assessment.assessedBy
        ? `${assessment.assessedBy.firstName} ${assessment.assessedBy.lastName}`
        : null,
      hazards: assessment.hazards.map((h) => ({
        hazardNumber: h.hazardNumber,
        hazardFactor: h.hazardFactor,
        hazardCategory: h.hazardCategory,
        description: h.description,
        probability: h.probability,
        severity: h.severity,
        riskLevel: h.riskLevel,
        measure: h.measure,
        measureType: h.measureType,
        responsible: h.responsible,
        deadline: h.deadline?.toISOString() ?? null,
        status: h.status,
      })),
    };

    const buffer = await renderGbuReport(data);

    const filename = `GBU_${assessment.title.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, "_")}_v${assessment.version}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Fehler beim Generieren des GBU-PDFs:", error);
    return NextResponse.json(
      { error: "Fehler beim Generieren des GBU-PDFs" },
      { status: 500 }
    );
  }
}
