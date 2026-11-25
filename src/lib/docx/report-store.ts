import { mkdir, unlink, writeFile, access } from "fs/promises";
import { basename, extname, join } from "path";
import { prisma } from "@/lib/prisma";
import { findOldReport } from "@/lib/docx/inspection-report-ai";

/**
 * Word reports stored with their inspection (uploads/inspections/<id>/). The stored report of
 * the previous inspection is the basis for next year's Word export; only when there is none,
 * the old reports folder (/root/acomanagement/Berichte) is used.
 */

export type ReportSource = "generated" | "uploaded";

const exists = (p: string) =>
  access(p)
    .then(() => true)
    .catch(() => false);

/** Stores `buffer` as the report of the inspection and replaces a previously stored file. */
export async function saveInspectionReport(
  inspectionId: string,
  buffer: Buffer,
  fileName: string,
  source: ReportSource
) {
  const current = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    select: { reportPath: true },
  });
  const ext = extname(fileName).toLowerCase() === ".doc" ? ".doc" : ".docx";
  const relPath = `uploads/inspections/${inspectionId}/bericht-${Date.now()}${ext}`;
  await mkdir(join(process.cwd(), "uploads", "inspections", inspectionId), { recursive: true });
  await writeFile(join(process.cwd(), relPath), buffer);
  await prisma.inspection.update({
    where: { id: inspectionId },
    data: { reportPath: relPath, reportFileName: fileName, reportSource: source, reportUpdatedAt: new Date() },
  });
  if (current?.reportPath && current.reportPath !== relPath) {
    await unlink(join(process.cwd(), current.reportPath)).catch(() => {});
  }
}

export async function deleteInspectionReport(inspectionId: string) {
  const current = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    select: { reportPath: true },
  });
  if (current?.reportPath) await unlink(join(process.cwd(), current.reportPath)).catch(() => {});
  await prisma.inspection.update({
    where: { id: inspectionId },
    data: { reportPath: null, reportFileName: null, reportSource: null, reportUpdatedAt: null },
  });
}

export interface BaseReport {
  /** Absolute path of the .doc/.docx */
  path: string;
  /** Shown to the user, e.g. "Bericht der Begehung BEG-2026-014 vom 15.07.2026" */
  label: string;
  /** Inspection whose stored report is used (null = old reports folder) */
  inspectionId: string | null;
}

/**
 * Basis for the Word export: the stored report of the nearest earlier inspection
 * (previousInspection chain, then latest earlier inspection of the company), otherwise last
 * year's report from the old reports folder.
 */
export async function findBaseReport(inspection: {
  id: string;
  companyId: string;
  inspectionDate: Date;
  previousInspectionId: string | null;
  company: { name: string };
}): Promise<BaseReport | null> {
  const candidates = await prisma.inspection.findMany({
    where: {
      companyId: inspection.companyId,
      id: { not: inspection.id },
      inspectionDate: { lte: inspection.inspectionDate },
      reportPath: { not: null },
    },
    orderBy: { inspectionDate: "desc" },
    select: { id: true, inspectionNumber: true, inspectionDate: true, reportPath: true },
  });
  // Prefer the linked previous inspection, then the most recent one
  const ordered = [
    ...candidates.filter((c) => c.id === inspection.previousInspectionId),
    ...candidates.filter((c) => c.id !== inspection.previousInspectionId),
  ];
  for (const c of ordered) {
    const path = join(process.cwd(), c.reportPath!);
    if (await exists(path)) {
      return {
        path,
        label: `Bericht der Begehung ${c.inspectionNumber ?? ""} vom ${c.inspectionDate.toLocaleDateString("de-DE")}`.replace("  ", " "),
        inspectionId: c.id,
      };
    }
  }
  const old = await findOldReport(inspection.company.name);
  return old ? { path: old, label: basename(old), inspectionId: null } : null;
}
