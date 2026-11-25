import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FEATURE_LABEL: Record<string, string> = {
  "import-transcribe": "GoodNotes: Handschrift lesen",
  "import-analyze": "GoodNotes: Auswertung",
  "word-export": "Word-Bericht",
  "word-dedupe": "Word-Bericht (Duplikat-Prüfung)",
  "sds-extract": "Sicherheitsdatenblätter",
  "manual-extract": "Bedienungsanleitungen",
  "inspection-doc-extract": "Begehung aus Dokument",
};

// GET /api/ai-usage – Claude API costs: this month, last 30 days by feature, recent Word exports
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  if (session.user.role === "CLIENT") {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [month, byFeature, total, exports] = await Promise.all([
    prisma.aiUsage.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { costUsd: true } }),
    prisma.aiUsage.groupBy({
      by: ["feature"],
      where: { createdAt: { gte: since30 } },
      _sum: { costUsd: true },
      _count: true,
    }),
    prisma.aiUsage.aggregate({ _sum: { costUsd: true }, _min: { createdAt: true } }),
    prisma.aiUsage.groupBy({
      by: ["runId", "inspectionId"],
      where: { feature: { in: ["word-export", "word-dedupe"] }, runId: { not: null } },
      _sum: { costUsd: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      take: 10,
    }),
  ]);

  const inspections = await prisma.inspection.findMany({
    where: { id: { in: exports.map((e) => e.inspectionId).filter((x): x is string => !!x) } },
    select: { id: true, inspectionNumber: true, company: { select: { name: true } } },
  });
  const byId = new Map(inspections.map((i) => [i.id, i]));

  return NextResponse.json({
    monthUsd: month._sum.costUsd ?? 0,
    totalUsd: total._sum.costUsd ?? 0,
    trackedSince: total._min.createdAt,
    last30Days: byFeature
      .map((f) => ({ feature: FEATURE_LABEL[f.feature] ?? f.feature, calls: f._count, costUsd: f._sum.costUsd ?? 0 }))
      .sort((a, b) => b.costUsd - a.costUsd),
    recentWordExports: exports.map((e) => {
      const i = e.inspectionId ? byId.get(e.inspectionId) : undefined;
      return {
        label: i ? `${i.company.name} (${i.inspectionNumber ?? "–"})` : "Begehung gelöscht",
        costUsd: e._sum.costUsd ?? 0,
        at: e._max.createdAt,
      };
    }),
  });
}
