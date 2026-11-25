import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanyFilter } from "@/lib/access-control";
import { parsePaginationParams, paginatedResponse } from "@/lib/pagination";

// GET /api/unterweisungen - List all Unterweisungen
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {
    ...getCompanyFilter(session),
    status: { not: "archiviert" },
  };
  if (companyId) where.companyId = companyId;
  if (status) where.status = status;

  const pagination = parsePaginationParams(searchParams);

  try {
    const unterweisungen = await prisma.unterweisung.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { datum: "desc" },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    if (pagination) {
      const total = await prisma.unterweisung.count({ where });
      return NextResponse.json(paginatedResponse(unterweisungen, total, pagination));
    }

    return NextResponse.json(unterweisungen);
  } catch (error) {
    console.error("Error fetching Unterweisungen:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Unterweisungen" },
      { status: 500 }
    );
  }
}

// POST /api/unterweisungen - Create a new Unterweisung
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      companyId,
      abteilung,
      ort,
      datum,
      zeitVon,
      zeitBis,
      anlass,
      inhalt,
      naechsterTermin,
      teilnehmerAnzahl,
    } = body;

    if (!companyId || !inhalt || !datum) {
      return NextResponse.json(
        { error: "Betrieb, Datum und Inhalt sind erforderlich" },
        { status: 400 }
      );
    }

    const unterweisung = await prisma.unterweisung.create({
      data: {
        companyId,
        abteilung: abteilung || null,
        ort: ort || null,
        datum: new Date(datum),
        zeitVon: zeitVon || null,
        zeitBis: zeitBis || null,
        anlass: anlass || [],
        inhalt,
        naechsterTermin: naechsterTermin || null,
        teilnehmerAnzahl: teilnehmerAnzahl ? parseInt(teilnehmerAnzahl) : 10,
        createdById: session.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "unterweisung",
      entityId: unterweisung.id,
      details: { companyId },
    });

    return NextResponse.json(unterweisung, { status: 201 });
  } catch (error) {
    console.error("Error creating Unterweisung:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Unterweisung" },
      { status: 500 }
    );
  }
}
