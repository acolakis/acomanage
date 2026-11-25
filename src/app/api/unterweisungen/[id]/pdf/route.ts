import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompanyAccess } from "@/lib/access-control";
import { renderUnterweisungNachweis } from "@/lib/pdf/unterweisung-nachweis";

// GET /api/unterweisungen/[id]/pdf
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const unterweisung = await prisma.unterweisung.findUnique({
      where: { id: params.id },
      include: {
        company: true,
      },
    });

    if (!unterweisung) {
      return NextResponse.json(
        { error: "Unterweisung nicht gefunden" },
        { status: 404 }
      );
    }

    if (!hasCompanyAccess(session, unterweisung.companyId)) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    const buffer = await renderUnterweisungNachweis(
      JSON.parse(JSON.stringify(unterweisung))
    );

    const companyName = unterweisung.company.name
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, "")
      .substring(0, 40);
    const dateStr = new Date(unterweisung.datum)
      .toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
      .replace(/\./g, "");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Unterweisung-${companyName}-${dateStr}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating Unterweisung PDF:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des PDF" },
      { status: 500 }
    );
  }
}
