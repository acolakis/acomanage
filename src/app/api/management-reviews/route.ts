import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanyFilter } from "@/lib/access-control";
import { parsePaginationParams, paginatedResponse } from "@/lib/pagination";

// GET /api/management-reviews - List management reviews
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  const where: Record<string, unknown> = {
    ...getCompanyFilter(session),
  };
  if (companyId) where.companyId = companyId;

  const pagination = parsePaginationParams(searchParams);

  try {
    const reviews = await prisma.managementReview.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { reviewDate: "desc" },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    if (pagination) {
      const total = await prisma.managementReview.count({ where });
      return NextResponse.json(paginatedResponse(reviews, total, pagination));
    }

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Error fetching management reviews:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Managementbewertungen" },
      { status: 500 }
    );
  }
}

// POST /api/management-reviews - Create a new management review
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { companyId, reviewDate, attendees } = body;

    if (!companyId || !reviewDate) {
      return NextResponse.json(
        { error: "Betrieb und Bewertungsdatum sind erforderlich" },
        { status: 400 }
      );
    }

    // Generate review number: MB-YYYY-NNN
    const year = new Date(reviewDate).getFullYear();
    const count = await prisma.managementReview.count({
      where: {
        reviewDate: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const reviewNumber = `MB-${year}-${String(count + 1).padStart(3, "0")}`;

    // Auto-populate: Incident summary for the company in the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const incidentsByStatus = await prisma.incident.groupBy({
      by: ["status"],
      where: {
        companyId,
        incidentDate: { gte: twelveMonthsAgo },
      },
      _count: { id: true },
    });

    const statusLabels: Record<string, string> = {
      GEMELDET: "Gemeldet",
      IN_UNTERSUCHUNG: "In Untersuchung",
      MASSNAHMEN: "Maßnahmen eingeleitet",
      ABGESCHLOSSEN: "Abgeschlossen",
    };

    let incidentSummary = "";
    if (incidentsByStatus.length > 0) {
      const totalIncidents = incidentsByStatus.reduce(
        (sum, g) => sum + g._count.id,
        0
      );
      const lines = incidentsByStatus.map(
        (g) =>
          `- ${statusLabels[g.status] || g.status}: ${g._count.id}`
      );
      incidentSummary = `Vorfälle der letzten 12 Monate (Gesamt: ${totalIncidents}):\n${lines.join("\n")}`;
    } else {
      incidentSummary =
        "Keine Vorfälle in den letzten 12 Monaten registriert.";
    }

    // Auto-populate: Audit results for the company in the last 12 months
    interface AuditRow {
      auditNumber: string | null;
      title: string;
      status: string;
      actualDate: Date | null;
      _count: { findings: number };
    }

    let audits: AuditRow[] = [];
    try {
      audits = await prisma.internalAudit.findMany({
        where: {
          companyId,
          createdAt: { gte: twelveMonthsAgo },
        },
        select: {
          auditNumber: true,
          title: true,
          status: true,
          actualDate: true,
          _count: { select: { findings: true } },
        },
        orderBy: { createdAt: "desc" },
      }) as AuditRow[];
    } catch {
      audits = [];
    }

    let auditResults = "";
    if (audits.length > 0) {
      const auditStatusLabels: Record<string, string> = {
        GEPLANT: "Geplant",
        IN_DURCHFUEHRUNG: "In Durchführung",
        BERICHT: "Bericht",
        ABGESCHLOSSEN: "Abgeschlossen",
      };
      const lines = audits.map((a: AuditRow) => {
        const dateStr = a.actualDate
          ? new Date(a.actualDate).toLocaleDateString("de-DE")
          : "k.A.";
        return `- ${a.auditNumber || "Ohne Nr."}: ${a.title} (${auditStatusLabels[a.status] || a.status}, ${dateStr}, ${a._count.findings} Feststellung(en))`;
      });
      auditResults = `Interne Audits der letzten 12 Monate (${audits.length}):\n${lines.join("\n")}`;
    } else {
      auditResults =
        "Keine internen Audits in den letzten 12 Monaten durchgeführt.";
    }

    // Auto-populate: Objective progress for the company
    const objectives = await prisma.ohsObjective.findMany({
      where: {
        companyId,
        status: { not: "ARCHIVIERT" },
      },
      select: {
        title: true,
        status: true,
        targetValue: true,
        currentValue: true,
        unit: true,
        targetDate: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let objectiveProgress = "";
    if (objectives.length > 0) {
      const objStatusLabels: Record<string, string> = {
        ENTWURF: "Entwurf",
        AKTIV: "Aktiv",
        ERREICHT: "Erreicht",
        NICHT_ERREICHT: "Nicht erreicht",
      };
      const lines = objectives.map((o) => {
        const progress =
          o.currentValue && o.targetValue
            ? ` (Ist: ${o.currentValue}${o.unit ? " " + o.unit : ""} / Ziel: ${o.targetValue}${o.unit ? " " + o.unit : ""})`
            : "";
        const deadline = o.targetDate
          ? ` bis ${new Date(o.targetDate).toLocaleDateString("de-DE")}`
          : "";
        return `- ${o.title}: ${objStatusLabels[o.status] || o.status}${progress}${deadline}`;
      });
      objectiveProgress = `SGA-Ziele (${objectives.length}):\n${lines.join("\n")}`;
    } else {
      objectiveProgress = "Keine SGA-Ziele für diesen Betrieb definiert.";
    }

    const review = await prisma.managementReview.create({
      data: {
        companyId,
        reviewNumber,
        reviewDate: new Date(reviewDate),
        attendees: attendees || null,
        incidentSummary,
        auditResults,
        objectiveProgress,
        createdById: session.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "create",
      entityType: "management_review",
      entityId: review.id,
      details: { reviewNumber },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Error creating management review:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Managementbewertung" },
      { status: 500 }
    );
  }
}
