import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderInspectionReport } from "@/lib/pdf/inspection-report";

// GET /api/inspections/[id]/pdf - Generate and download PDF report
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { name: true, city: true } },
        inspector: { select: { firstName: true, lastName: true } },
        template: {
          include: {
            sections: {
              orderBy: { sortOrder: "asc" },
              include: {
                items: { orderBy: { sortOrder: "asc" } },
              },
            },
          },
        },
        findings: {
          orderBy: { findingNumber: "asc" },
          include: {
            section: { select: { title: true, sectionCode: true } },
            templateItem: { select: { label: true, itemKey: true } },
            photos: { orderBy: { sortOrder: "asc" } },
          },
        },
        photos: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!inspection) {
      return NextResponse.json(
        { error: "Begehung nicht gefunden" },
        { status: 404 }
      );
    }

    // Serialize dates to strings for the PDF component
    const data = JSON.parse(JSON.stringify(inspection));

    const buffer = await renderInspectionReport(data);

    const filename = `Begehungsbericht_${inspection.inspectionNumber || inspection.id}_${
      inspection.company.name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")
    }.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Fehler beim Generieren des PDF-Berichts" },
      { status: 500 }
    );
  }
}
