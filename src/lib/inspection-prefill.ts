import { prisma } from "@/lib/prisma";

/**
 * Latest earlier inspection of the same company with the same checklist template
 * (the "Vorjahr" whose dates/names are carried over into a new inspection).
 */
export async function findPreviousInspection(params: {
  companyId: string;
  templateId: string;
  before: Date;
  excludeId?: string;
}) {
  return prisma.inspection.findFirst({
    where: {
      companyId: params.companyId,
      templateId: params.templateId,
      inspectionDate: { lt: params.before },
      ...(params.excludeId && { id: { not: params.excludeId } }),
      itemChecks: { some: {} },
    },
    orderBy: { inspectionDate: "desc" },
    select: {
      id: true,
      itemChecks: {
        select: { templateItemId: true, status: true, note: true, lastTestDate: true, nextTestDate: true },
      },
      findings: {
        where: { status: { not: "COMPLETED" } },
        orderBy: { findingNumber: "asc" },
        select: {
          id: true,
          sectionId: true,
          templateItemId: true,
          description: true,
          measure: true,
          riskLevel: true,
          responsible: true,
        },
      },
    },
  });
}

/**
 * Item checks for a new inspection, pre-filled from the previous one: every answer (JA, NEIN,
 * n.r.), names, remarks and test dates are carried over, so only changes need a tap.
 * `checkedAt` stays null until the user touches the item ("aus Vorjahr übernommen").
 */
export function prefillChecks(
  previous: NonNullable<Awaited<ReturnType<typeof findPreviousInspection>>>,
  inspectionId: string
) {
  return previous.itemChecks
    .filter((c) => c.status !== "UNCHECKED" || c.note || c.lastTestDate || c.nextTestDate)
    .map((c) => ({
      inspectionId,
      templateItemId: c.templateItemId,
      status: c.status,
      note: c.note,
      lastTestDate: c.lastTestDate,
      nextTestDate: c.nextTestDate,
      checkedAt: null,
    }));
}

/**
 * Open findings of the previous inspection, copied into the new one (linked via
 * previousFindingId). Findings of items that were not NEIN last year are left out.
 * The old deadline is not carried over.
 */
export function prefillFindings(
  previous: NonNullable<Awaited<ReturnType<typeof findPreviousInspection>>>,
  inspectionId: string
) {
  const mangel = new Set(previous.itemChecks.filter((c) => c.status === "MANGEL").map((c) => c.templateItemId));
  return previous.findings
    .filter((f) => !f.templateItemId || mangel.has(f.templateItemId))
    .map((f, i) => ({
      inspectionId,
      sectionId: f.sectionId,
      templateItemId: f.templateItemId,
      findingNumber: i + 1,
      description: f.description,
      measure: f.measure,
      riskLevel: f.riskLevel,
      responsible: f.responsible,
      previousFindingId: f.id,
    }));
}

/**
 * Preselected JA items whose next test date is before the new inspection date are overdue:
 * they become NEIN with a finding (same rule as when the user taps JA).
 */
export async function applyOverdueRule(inspectionId: string, inspectionDate: Date) {
  const overdue = await prisma.inspectionItemCheck.findMany({
    where: { inspectionId, status: "IO", nextTestDate: { lt: inspectionDate } },
    include: {
      templateItem: { select: { label: true, sectionId: true, suggestedMeasure: true, defaultRiskLevel: true } },
    },
  });
  if (overdue.length === 0) return 0;
  let number = await prisma.inspectionFinding.count({ where: { inspectionId } });
  await prisma.$transaction(
    overdue.flatMap((c) => {
      const due = c.nextTestDate!.toLocaleDateString("de-DE", { month: "2-digit", year: "numeric" });
      return [
        prisma.inspectionItemCheck.update({ where: { id: c.id }, data: { status: "MANGEL" } }),
        prisma.inspectionFinding.create({
          data: {
            inspectionId,
            sectionId: c.templateItem.sectionId,
            templateItemId: c.templateItemId,
            findingNumber: ++number,
            description: `${c.templateItem.label}: Prüftermin ${due} vor dem Begehungsdatum – überfällig`,
            measure: c.templateItem.suggestedMeasure,
            riskLevel: c.templateItem.defaultRiskLevel ?? "MITTEL",
          },
        }),
      ];
    })
  );
  return overdue.length;
}

/** A test date before the inspection date means the test is overdue. */
export function isOverdue(nextTestDate: Date | string | null | undefined, inspectionDate: Date | string) {
  if (!nextTestDate) return false;
  const due = new Date(nextTestDate).toISOString().slice(0, 10);
  const ref = new Date(inspectionDate).toISOString().slice(0, 10);
  return due < ref;
}
