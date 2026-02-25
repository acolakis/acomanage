import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://acomanage:acomanage_secret@localhost:5432/acomanage";

async function main() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const kpis = [
    {
      code: "UNFALLQUOTE",
      name: "Unfallquote",
      description: "Anzahl meldepflichtiger Arbeitsunfälle pro 1.000 Beschäftigte",
      unit: "pro 1.000 MA",
      formula: "(Meldepflichtige Unfälle / Beschäftigte) × 1.000",
      isoClause: "9.1.2",
      isAutomatic: false,
      targetDirection: "lower_is_better",
      sortOrder: 1,
    },
    {
      code: "LTIFR",
      name: "LTIFR (Lost Time Injury Frequency Rate)",
      description: "Arbeitsunfälle mit Ausfalltagen pro 1 Mio. Arbeitsstunden",
      unit: "pro 1 Mio. h",
      formula: "(Unfälle mit Ausfalltagen / Arbeitsstunden) × 1.000.000",
      isoClause: "9.1.2",
      isAutomatic: false,
      targetDirection: "lower_is_better",
      sortOrder: 2,
    },
    {
      code: "AUSFALLTAGE",
      name: "Ausfalltage durch Arbeitsunfälle",
      description: "Summe der Ausfalltage durch Arbeitsunfälle im Zeitraum",
      unit: "Tage",
      formula: "Summe aller Ausfalltage",
      isoClause: "9.1.2",
      isAutomatic: false,
      targetDirection: "lower_is_better",
      sortOrder: 3,
    },
    {
      code: "BEINAHEUNFAELLE",
      name: "Beinaheunfälle (gemeldet)",
      description: "Anzahl gemeldeter Beinaheunfälle — eine hohe Zahl zeigt gute Meldekultur",
      unit: "Anzahl",
      formula: "Anzahl Beinaheunfall-Meldungen",
      isoClause: "9.1.2",
      isAutomatic: false,
      targetDirection: "higher_is_better",
      sortOrder: 4,
    },
    {
      code: "SCHULUNGSQUOTE",
      name: "Schulungsquote",
      description: "Anteil der Mitarbeiter mit aktueller Unterweisung",
      unit: "%",
      formula: "(Unterwiesene MA / Gesamtbeschäftigte) × 100",
      isoClause: "7.2",
      isAutomatic: false,
      targetDirection: "higher_is_better",
      sortOrder: 5,
    },
    {
      code: "MASSNAHMEN_QUOTE",
      name: "Maßnahmen-Abschlussquote",
      description: "Anteil termingerecht abgeschlossener Korrekturmaßnahmen",
      unit: "%",
      formula: "(Abgeschlossene Maßnahmen / Gesamtmaßnahmen) × 100",
      isoClause: "10.2",
      isAutomatic: false,
      targetDirection: "higher_is_better",
      sortOrder: 6,
    },
    {
      code: "BEGEHUNGSQUOTE",
      name: "Begehungsquote",
      description: "Anteil der planmäßig durchgeführten Begehungen",
      unit: "%",
      formula: "(Durchgeführte Begehungen / Geplante Begehungen) × 100",
      isoClause: "9.1.2",
      isAutomatic: false,
      targetDirection: "higher_is_better",
      sortOrder: 7,
    },
    {
      code: "GBU_AKTUALITAET",
      name: "GBU-Aktualitätsquote",
      description: "Anteil der aktuellen Gefährdungsbeurteilungen (nicht review_needed)",
      unit: "%",
      formula: "(Aktuelle GBU / Gesamt-GBU) × 100",
      isoClause: "6.1.2",
      isAutomatic: false,
      targetDirection: "higher_is_better",
      sortOrder: 8,
    },
    {
      code: "ERSTEHILFE_QUOTE",
      name: "Ersthelferquote",
      description: "Anteil ausgebildeter Ersthelfer an Gesamtbelegschaft",
      unit: "%",
      formula: "(Ausgebildete Ersthelfer / Beschäftigte) × 100",
      isoClause: "8.2",
      isAutomatic: false,
      targetDirection: "higher_is_better",
      sortOrder: 9,
    },
    {
      code: "COMPLIANCE_QUOTE",
      name: "Rechts-Compliance-Quote",
      description: "Anteil konformer Rechtsanforderungen im Rechtskataster",
      unit: "%",
      formula: "(Konforme Anforderungen / Gesamt-Anforderungen) × 100",
      isoClause: "6.1.3",
      isAutomatic: false,
      targetDirection: "higher_is_better",
      sortOrder: 10,
    },
  ];

  console.log("Seeding KPI definitions...");

  for (const kpi of kpis) {
    await prisma.kpiDefinition.upsert({
      where: { code: kpi.code },
      update: {
        name: kpi.name,
        description: kpi.description,
        unit: kpi.unit,
        formula: kpi.formula,
        isoClause: kpi.isoClause,
        isAutomatic: kpi.isAutomatic,
        targetDirection: kpi.targetDirection,
        sortOrder: kpi.sortOrder,
      },
      create: kpi,
    });
    console.log(`  ✓ ${kpi.code}: ${kpi.name}`);
  }

  console.log(`\nDone! ${kpis.length} KPI definitions seeded.`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
