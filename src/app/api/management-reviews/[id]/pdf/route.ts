import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";
import { renderManagementReviewReport } from "@/lib/pdf/management-review-report";

// GET /api/management-reviews/[id]/pdf - Generate and download management review PDF
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const review = await prisma.managementReview.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { name: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Managementbewertung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, review.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    // Serialize dates to strings for the PDF component
    const data = JSON.parse(JSON.stringify(review));

    const buffer = await renderManagementReviewReport(data);

    const filename = `Managementbewertung_${review.reviewNumber || review.id}_${
      review.company.name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")
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
    console.error("Error generating management review PDF:", error);
    return NextResponse.json(
      { error: "Fehler beim Generieren des Managementbewertungs-PDF" },
      { status: 500 }
    );
  }
}
