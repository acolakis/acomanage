import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";
import { renderSgaPolicyPdf } from "@/lib/pdf/sga-policy";

// GET /api/companies/[id]/context/pdf - Generate SGA-Politik PDF
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Nicht autorisiert" },
      { status: 401 }
    );
  }

  const { id } = params;

  if (!hasCompanyAccess(session, id)) {
    return NextResponse.json(
      { error: "Zugriff verweigert" },
      { status: 403 }
    );
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      select: { id: true, name: true, city: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Unternehmen nicht gefunden" },
        { status: 404 }
      );
    }

    const context = await prisma.companyContext.findUnique({
      where: { companyId: id },
    });

    if (!context || !context.ohsPolicy) {
      return NextResponse.json(
        { error: "Keine SGA-Politik vorhanden. Bitte erstellen Sie zuerst eine SGA-Politik." },
        { status: 404 }
      );
    }

    const data = {
      companyName: company.name,
      companyCity: company.city,
      ohsPolicy: context.ohsPolicy,
      ohsPolicyDate: context.ohsPolicyDate
        ? context.ohsPolicyDate.toISOString()
        : null,
      ohsPolicyApprovedBy: context.ohsPolicyApprovedBy,
      version: context.version,
    };

    const buffer = await renderSgaPolicyPdf(data);

    const filename = `SGA-Politik_${company.name.replace(
      /[^a-zA-Z0-9äöüÄÖÜß]/g,
      "_"
    )}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating SGA-Politik PDF:", error);
    return NextResponse.json(
      { error: "Fehler beim Generieren des PDF-Dokuments" },
      { status: 500 }
    );
  }
}
