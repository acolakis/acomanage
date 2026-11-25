import { prisma } from "@/lib/prisma";
import type { TemplateItemInfo } from "./types";

/** The checklist template that mirrors the paper/GoodNotes form (seeded by prisma/seed-aws-begehung.ts). */
export const IMPORT_TEMPLATE_NAME = "AWS Begehungsvorlage (A00–XYZ03)";

export async function loadImportTemplate(): Promise<{ id: string; items: TemplateItemInfo[] } | null> {
  const template = await prisma.inspectionTemplate.findFirst({
    where: { name: IMPORT_TEMPLATE_NAME, isActive: true },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!template) return null;
  const items: TemplateItemInfo[] = template.sections.flatMap((s) =>
    s.items.map((i) => ({
      id: i.id,
      itemKey: i.itemKey,
      label: i.label,
      sectionTitle: s.title,
      suggestedMeasure: i.suggestedMeasure,
      defaultRiskLevel: i.defaultRiskLevel,
    }))
  );
  return { id: template.id, items };
}
