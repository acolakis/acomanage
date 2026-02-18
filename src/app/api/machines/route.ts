import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanyFilter } from "@/lib/access-control";
import { parsePaginationParams, paginatedResponse } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      status: { not: "archived" },
      ...getCompanyFilter(session),
    };

    if (companyId) where.companyId = companyId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { manufacturer: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const pagination = parsePaginationParams(searchParams);

    const machines = await prisma.machine.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    if (pagination) {
      const total = await prisma.machine.count({ where });
      return NextResponse.json(paginatedResponse(machines, total, pagination));
    }

    return NextResponse.json(machines);
  } catch (error) {
    console.error("Fehler beim Abrufen der Maschinen:", error);
    return NextResponse.json({ error: "Fehler beim Abrufen der Maschinen" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();

    if (!body.companyId || !body.name) {
      return NextResponse.json({ error: "Betrieb und Name sind erforderlich" }, { status: 400 });
    }

    const machine = await prisma.machine.create({
      data: {
        companyId: body.companyId,
        name: body.name,
        machineNumber: body.machineNumber || null,
        manufacturer: body.manufacturer || null,
        model: body.model || null,
        serialNumber: body.serialNumber || null,
        location: body.location || null,
        yearOfManufacture: body.yearOfManufacture ? parseInt(body.yearOfManufacture) : null,
        createdById: userId,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    logAudit({ userId, action: "create", entityType: "machine", entityId: machine.id, details: { name: body.name } });

    return NextResponse.json(machine, { status: 201 });
  } catch (error) {
    console.error("Fehler beim Erstellen der Maschine:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen der Maschine" }, { status: 500 });
  }
}
