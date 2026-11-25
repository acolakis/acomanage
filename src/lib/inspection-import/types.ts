// Shared between the import API routes and the import page (client-safe, no server imports).

export type ImportItemStatus = "IO" | "MANGEL" | "NICHT_RELEVANT" | "UNCHECKED";
export type ImportAnswer = "JA" | "NEIN" | "OFFEN" | "GESTRICHEN";
export type CrossCheckResult = "BESTAETIGT" | "KORRIGIERT" | "ABWEICHUNG" | "KEIN_VERGLEICH";

export interface ImportItem {
  itemKey: string;
  /** What was circled on the paper form. */
  antwort: ImportAnswer;
  status: ImportItemStatus;
  /** YYYY-MM-DD: date of document / last test. */
  lastTestDate: string | null;
  /** YYYY-MM-DD: next test due. */
  nextTestDate: string | null;
  /** Names, remarks, other handwritten entries. */
  note: string | null;
  /** Handwriting was hard to read – user should check. */
  unsicher: boolean;
  abgleich: CrossCheckResult;
  /** Why the answer/status was corrected, or what differs from the previous report. */
  abgleichHinweis: string | null;
}

export interface ImportFinding {
  itemKey: string | null;
  beschreibung: string;
  massnahme: string | null;
  risiko: "NIEDRIG" | "MITTEL" | "HOCH" | "KRITISCH";
}

export interface ImportExtraDate {
  bezeichnung: string;
  datum: string;
  hinweis: string | null;
}

export interface ImportAnalysis {
  betrieb: string | null;
  datum: string | null;
  teilnehmer: string | null;
  items: ImportItem[];
  maengel: ImportFinding[];
  /** Test dates from the notes page without a matching checklist item (e.g. Augenspülung). */
  weiterePruefdaten: ImportExtraDate[];
  kurznotizen: string[];
  /** File name of last year's report used for the cross-check, if any. */
  vorbericht: string | null;
}

export interface TemplateItemInfo {
  id: string;
  itemKey: string;
  label: string;
  sectionTitle: string;
  suggestedMeasure: string | null;
  defaultRiskLevel: "NIEDRIG" | "MITTEL" | "HOCH" | "KRITISCH" | null;
}
