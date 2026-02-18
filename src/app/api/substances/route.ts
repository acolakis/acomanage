import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/substances - List hazardous substances
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { status: "active" };
  if (companyId) where.companyId = companyId;
  if (search) {
    where.OR = [
      { tradeName: { contains: search, mode: "insensitive" } },
      { manufacturer: { contains: search, mode: "insensitive" } },
      { casNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const substances = await prisma.hazardousSubstance.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: [{ companyId: "asc" }, { lfdNr: "asc" }],
    });

    return NextResponse.json(substances);
  } catch (error) {
    console.error("Error fetching substances:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Gefahrstoffe" },
      { status: 500 }
    );
  }
}

// POST /api/substances - Create a hazardous substance
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { companyId, tradeName, ...rest } = body;

    if (!companyId || !tradeName) {
      return NextResponse.json(
        { error: "Betrieb und Handelsname sind erforderlich" },
        { status: 400 }
      );
    }

    // Auto-assign lfdNr
    const maxLfdNr = await prisma.hazardousSubstance.aggregate({
      where: { companyId, status: "active" },
      _max: { lfdNr: true },
    });

    const substance = await prisma.hazardousSubstance.create({
      data: {
        companyId,
        tradeName,
        lfdNr: (maxLfdNr._max.lfdNr || 0) + 1,
        manufacturer: rest.manufacturer || null,
        casNumber: rest.casNumber || null,
        sdsDate: rest.sdsDate ? new Date(rest.sdsDate) : null,
        gbaDate: rest.gbaDate ? new Date(rest.gbaDate) : null,
        gbaNumber: rest.gbaNumber || null,
        usageLocation: rest.usageLocation || null,
        usageProcess: rest.usageProcess || null,
        exposedPersons: rest.exposedPersons || null,
        skinContact: rest.skinContact || false,
        usageFrequency: rest.usageFrequency || null,
        labeling: rest.labeling || null,
        protectiveMeasures: rest.protectiveMeasures || null,
        containerSize: rest.containerSize || null,
        storageLocation: rest.storageLocation || null,
        storageAmount: rest.storageAmount || null,
        ghsPictograms: rest.ghsPictograms || [],
        hStatements: rest.hStatements || [],
        pStatements: rest.pStatements || [],
        signalWord: rest.signalWord || null,
        wgk: rest.wgk || null,
        createdById: (session.user as { id: string }).id,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(substance, { status: 201 });
  } catch (error) {
    console.error("Error creating substance:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Gefahrstoffs" },
      { status: 500 }
    );
  }
}
