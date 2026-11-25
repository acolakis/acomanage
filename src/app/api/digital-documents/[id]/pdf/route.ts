import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";
import { renderDigitalDocument, hasRenderer } from "@/lib/pdf/documents";
import { CATEGORY_META } from "@/types/digital-documents";

// GET /api/digital-documents/[id]/pdf — Generate PDF
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const document = await prisma.digitalDocument.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, document.companyId)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    if (!hasRenderer(document.categoryCode)) {
      return NextResponse.json(
        { error: `PDF-Generierung für Kategorie "${document.categoryCode}" noch nicht verfügbar` },
        { status: 501 }
      );
    }

    const buffer = await renderDigitalDocument(
      document.categoryCode,
      JSON.parse(JSON.stringify(document))
    );

    const meta = CATEGORY_META[document.categoryCode];
    const categoryLabel = meta?.label || document.categoryCode;
    const safeTitle = `${categoryLabel} - ${document.company.name}`
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, "")
      .substring(0, 80);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Fehler beim Generieren des PDFs:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des PDF" },
      { status: 500 }
    );
  }
}
