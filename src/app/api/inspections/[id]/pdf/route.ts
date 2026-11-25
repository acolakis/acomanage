import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderInspectionReport, PrevItemCheck } from "@/lib/pdf/inspection-report";

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
        company: { select: { name: true, city: true, street: true, zip: true } },
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
          },
        },
        photos: { orderBy: { sortOrder: "asc" } },
        itemChecks: {
          select: {
            templateItemId: true,
            status: true,
            lastTestDate: true,
            nextTestDate: true,
          },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json(
        { error: "Begehung nicht gefunden" },
        { status: 404 }
      );
    }

    // Load previous inspection for comparison (changed data → red text in PDF)
    let prevChecks: PrevItemCheck[] | undefined;

    if (inspection.previousInspectionId) {
      // Explicit link to previous inspection
      const prev = await prisma.inspection.findUnique({
        where: { id: inspection.previousInspectionId },
        include: {
          itemChecks: {
            select: {
              templateItemId: true,
              status: true,
              lastTestDate: true,
              nextTestDate: true,
            },
          },
        },
      });
      if (prev?.itemChecks?.length) {
        prevChecks = JSON.parse(JSON.stringify(prev.itemChecks));
      }
    } else {
      // Find the most recent prior inspection for the same company
      const prev = await prisma.inspection.findFirst({
        where: {
          companyId: inspection.companyId,
          id: { not: inspection.id },
          inspectionDate: { lt: inspection.inspectionDate },
          status: { in: ["COMPLETED", "SENT"] },
        },
        orderBy: { inspectionDate: "desc" },
        include: {
          itemChecks: {
            select: {
              templateItemId: true,
              status: true,
              lastTestDate: true,
              nextTestDate: true,
            },
          },
        },
      });
      if (prev?.itemChecks?.length) {
        prevChecks = JSON.parse(JSON.stringify(prev.itemChecks));
      }
    }

    // Serialize dates to strings for the PDF component
    const data = JSON.parse(JSON.stringify(inspection));

    const buffer = await renderInspectionReport(data, prevChecks);

    const standDate = new Date(inspection.inspectionDate);
    const stand = `${String(standDate.getMonth() + 1).padStart(2, "0")}_${standDate.getFullYear()}`;
    const companySlug = inspection.company.name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
    const filename = `Begehung_${companySlug}_${stand}.pdf`;

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
