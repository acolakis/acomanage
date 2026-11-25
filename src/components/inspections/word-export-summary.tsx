"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface WordExportSummary {
  oldReport: string;
  costUsd?: number;
  model?: string;
  basedOnInspection?: boolean;
  unchangedTopics?: number;
  stored?: "saved" | "kept-uploaded";
  applied: number;
  skipped: { id: number; reason: string }[];
  changedTopics: string[];
  notInReport: { key: string; label: string; status: string; detail: string }[];
  notAdjusted?: { key: string; label: string; status: string; detail: string }[];
  hints: string[];
}

/** Check list shown after the Word export: what was changed, what has to be added by hand. */
export function WordExportSummaryDialog({
  summary,
  onClose,
}: {
  summary: WordExportSummary | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!summary} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Word-Bericht erstellt</DialogTitle>
          <DialogDescription>
            Grundlage: {summary?.oldReport}. Alle inhaltlichen Änderungen sind im Dokument rot markiert.
          </DialogDescription>
        </DialogHeader>
        {summary && (
          <div className="space-y-4 text-sm">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {summary.applied} Änderungen eingetragen, {summary.changedTopics.length} Checklistenpunkte betroffen.
            </p>
            {summary.costUsd !== undefined && (
              <p className="text-muted-foreground">
                KI-Kosten dieses Berichts:{" "}
                {summary.costUsd.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
              </p>
            )}
            {summary.basedOnInspection && (
              <p className="text-muted-foreground">
                Grundlage war der gespeicherte Bericht der letzten Begehung. {summary.unchangedTopics ?? 0} unveränderte
                Punkte wurden nicht angefasst.
              </p>
            )}
            <p className="text-muted-foreground">
              {summary.stored === "kept-uploaded"
                ? "Bei der Begehung bleibt deine hochgeladene endgültige Fassung gespeichert; dieser Export wurde nur heruntergeladen."
                : "Der Bericht ist bei der Begehung gespeichert. Überarbeitest du ihn in Word, lade die fertige Fassung dort hoch – sie ist die Grundlage für das nächste Jahr."}
            </p>

            {(summary.notAdjusted?.length ?? 0) > 0 && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 dark:bg-red-950/20">
                <p className="mb-2 flex items-center gap-2 font-medium text-red-900 dark:text-red-200">
                  <AlertTriangle className="h-4 w-4" />
                  {summary.notAdjusted!.length} geänderte Punkte wurden im Bericht nicht angepasst – bitte von Hand
                  korrigieren:
                </p>
                <ul className="space-y-1">
                  {summary.notAdjusted!.map((t) => (
                    <li key={t.key}>
                      <span className="font-medium">{t.label}</span>: {t.status}
                      {t.detail && <span className="text-muted-foreground"> · {t.detail}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.notInReport.length > 0 && (
              <div className="rounded-md border border-orange-300 bg-orange-50 p-3 dark:bg-orange-950/20">
                <p className="mb-2 flex items-center gap-2 font-medium text-orange-900 dark:text-orange-200">
                  <AlertTriangle className="h-4 w-4" />
                  {summary.notInReport.length} Punkte kommen im alten Bericht nicht vor – bitte von Hand ergänzen:
                </p>
                <ul className="space-y-1">
                  {summary.notInReport.map((t) => (
                    <li key={t.key}>
                      <span className="font-medium">{t.label}</span>: {t.status}
                      {t.detail && <span className="text-muted-foreground"> · {t.detail}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.hints.length > 0 && (
              <div className="rounded-md border p-3">
                <p className="mb-2 flex items-center gap-2 font-medium">
                  <Info className="h-4 w-4" />
                  Hinweise zum Prüfen
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {summary.hints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {summary.skipped.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {summary.skipped.length} vorgeschlagene Änderungen konnten nicht eingetragen werden (z. B. Absatz mit
                Bild). Bitte die rot markierten Stellen kurz gegenlesen.
              </p>
            )}

            {summary.changedTopics.length > 0 && (
              <details>
                <summary className="cursor-pointer text-muted-foreground">Geänderte Punkte anzeigen</summary>
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
                  {summary.changedTopics.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Schließen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
