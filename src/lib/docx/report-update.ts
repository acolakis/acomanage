import Anthropic from "@anthropic-ai/sdk";
import { execFile } from "child_process";
import { promisify } from "util";
import { copyFile, mkdtemp, readFile, readdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { prisma } from "@/lib/prisma";
import { anthropic, IMPORT_MODEL } from "@/lib/inspection-import/client";
import { findBaseReport } from "@/lib/docx/report-store";
import { recordUsage } from "@/lib/ai/usage";
import { randomUUID } from "crypto";

/**
 * Word export of an inspection: last year's report (Berichte/…doc) is updated paragraph by
 * paragraph with the results of this inspection. Changes are marked red.
 *
 * 1. Convert the old .doc to .docx (LibreOffice) and number all paragraphs (scripts/docx-paragraphs.py).
 * 2. The report is split into parts; for each part Claude returns edits by paragraph number
 *    (replace / delete / insert after / swap a text passage) – in parallel.
 * 3. The edits are applied by number, so nothing depends on finding text verbatim.
 * 4. A check list names inspection items that appear nowhere in the old report.
 */

const execFileAsync = promisify(execFile);
const SCRIPT = join(process.cwd(), "scripts/docx-paragraphs.py");
/** Characters of report text per AI call; parts run in parallel. */
const CHUNK_CHARS = 18000;
const EFFORT = "high" as const;

interface Paragraph {
  id: number;
  part: string;
  pos: { table: number; row: number; cell: number } | null;
  text: string;
  fixed: boolean;
}

type Action = "ersetzen" | "loeschen" | "einfuegen_nach" | "tauschen";

interface AiEdit {
  absatz: number;
  aktion: Action;
  alt: string | null;
  text: string;
  rot: boolean;
  bezug: string | null;
}

interface AiResult {
  aenderungen: AiEdit[];
  abgedeckt: string[];
  hinweise: string[];
}

export interface ReportUpdateSummary {
  oldReport: string;
  /** Cost of the AI calls of this export in USD */
  costUsd: number;
  model: string;
  /** Basis was the stored report of an earlier inspection (only changes went to the AI) */
  basedOnInspection: boolean;
  unchangedTopics: number;
  applied: number;
  skipped: { id: number; reason: string }[];
  changedTopics: string[];
  /** Changed since the base inspection and mentioned in the report, but no edit was made – check by hand. */
  notAdjusted: { key: string; label: string; status: string; detail: string }[];
  /** Inspection items with a result that the old report does not mention – add by hand. */
  notInReport: { key: string; label: string; status: string; detail: string }[];
  hints: string[];
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["aenderungen", "abgedeckt", "hinweise"],
  properties: {
    aenderungen: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["absatz", "aktion", "alt", "text", "rot", "bezug"],
        properties: {
          absatz: { type: "integer" },
          aktion: { type: "string", enum: ["ersetzen", "loeschen", "einfuegen_nach", "tauschen"] },
          alt: { type: ["string", "null"], description: "nur bei tauschen: exakte alte Textstelle" },
          text: { type: "string" },
          rot: { type: "boolean" },
          bezug: { type: ["string", "null"], description: "itemKey oder BEFUND-n" },
        },
      },
    },
    abgedeckt: { type: "array", items: { type: "string" } },
    hinweise: { type: "array", items: { type: "string" } },
  },
};

const STATUS_DE: Record<string, string> = {
  IO: "JA (in Ordnung)",
  MANGEL: "NEIN (Mangel)",
  NICHT_RELEVANT: "nicht relevant",
  UNCHECKED: "nicht geprüft",
};
const de = (d: Date | null | undefined) => (d ? d.toLocaleDateString("de-DE") : null);

async function loadInspection(id: string) {
  return prisma.inspection.findUnique({
    where: { id },
    include: {
      company: { select: { name: true, city: true } },
      inspector: { select: { firstName: true, lastName: true } },
      template: {
        include: {
          sections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } },
        },
      },
      findings: {
        orderBy: { findingNumber: "asc" },
        include: { templateItem: { select: { itemKey: true } } },
      },
      itemChecks: true,
    },
  });
}

type InspectionFull = NonNullable<Awaited<ReturnType<typeof loadInspection>>>;

interface Topic {
  key: string;
  label: string;
  status: string;
  line: string;
  /** Content without finding numbers – equal signature = unchanged since the base inspection */
  sig: string;
  next: Date | null;
}

/** One line per checklist item with a result, plus findings without item. */
function buildTopics(inspection: InspectionFull): Topic[] {
  const checks = new Map(inspection.itemChecks.map((c) => [c.templateItemId, c]));
  const topics: Topic[] = [];
  const findingText = (f: InspectionFull["findings"][number]) =>
    `${f.description}${f.measure ? ` → Maßnahme: ${f.measure}` : ""}`;
  for (const section of inspection.template?.sections ?? []) {
    for (const item of section.items) {
      const c = checks.get(item.id);
      if (!c || c.status === "UNCHECKED") continue;
      const findings = inspection.findings.filter((f) => f.templateItemId === item.id);
      const base = [
        STATUS_DE[c.status],
        c.lastTestDate && `Datum/letzte Prüfung ${de(c.lastTestDate)}`,
        c.nextTestDate && `nächste Prüfung ${de(c.nextTestDate)}`,
        c.note && `Bemerkung: ${c.note}`,
      ].filter(Boolean) as string[];
      topics.push({
        key: item.itemKey,
        label: item.label,
        status: c.status,
        line: `${item.itemKey} | ${item.label} | ${[...base, ...findings.map((f) => `Befund #${f.findingNumber}: ${findingText(f)}`)].join(" | ")}`,
        sig: [...base, ...findings.map(findingText).sort()].join(" | "),
        next: c.nextTestDate,
      });
    }
  }
  for (const f of inspection.findings.filter((f) => !f.templateItemId)) {
    topics.push({
      key: `BEFUND-${f.findingNumber}`,
      label: `Befund #${f.findingNumber}`,
      status: "MANGEL",
      line: `BEFUND-${f.findingNumber} | allgemeiner Befund | ${findingText(f)}`,
      sig: `allgemein | ${findingText(f)}`,
      next: null,
    });
  }
  return topics;
}

/**
 * Topics that changed since the base inspection (whose stored report is the basis). Unchanged
 * topics are already described correctly in that report and are not sent to the AI.
 */
function changedTopics(
  current: Topic[],
  base: Topic[],
  currentDate: Date,
  baseDate: Date
): { changed: Topic[]; unchanged: number } {
  const byKey = new Map(base.map((t) => [t.key, t]));
  const generalBase = new Set(base.filter((t) => t.key.startsWith("BEFUND-")).map((t) => t.sig));
  const changed: Topic[] = [];
  let unchanged = 0;
  for (const t of current) {
    if (t.key.startsWith("BEFUND-")) {
      if (generalBase.has(t.sig)) unchanged++;
      else changed.push(t);
      continue;
    }
    const before = byKey.get(t.key);
    // Same data, but the test date has passed since the base inspection: the report still says "due"
    const expired = !!t.next && t.next < currentDate && t.next >= baseDate;
    if (before && before.sig === t.sig && !expired) {
      unchanged++;
      continue;
    }
    if (before && before.sig === t.sig && expired) {
      changed.push({
        ...t,
        line: `${t.line} | unverändert, aber Prüftermin ${de(t.next)} ist seit der letzten Begehung abgelaufen → jetzt überfällig`,
      });
      continue;
    }
    changed.push({ ...t, line: `${t.line} | vorher: ${before ? before.sig : "kein Ergebnis"}` });
  }
  return { changed, unchanged };
}

function formatParagraph(p: Paragraph): string {
  const where =
    p.part !== "document" ? `${p.part} ` : p.pos ? `T${p.pos.table}/Z${p.pos.row}/S${p.pos.cell} ` : "";
  return `[${p.id}] ${where}${p.fixed ? "[fest] " : ""}${JSON.stringify(p.text)}`;
}

/** Splits the paragraphs into parts of about CHUNK_CHARS, preferring a cut before a heading. */
function chunkParagraphs(paragraphs: Paragraph[]): Paragraph[][] {
  const chunks: Paragraph[][] = [];
  let current: Paragraph[] = [];
  let size = 0;
  const isHeading = (p: Paragraph) =>
    p.text.trim().length < 70 && !/^(Die SIFA|Weiterhin|Der SIFA|Nachfolgend)/.test(p.text.trim());
  for (const p of paragraphs) {
    const len = p.text.length + 20;
    if (size > CHUNK_CHARS * 0.8 && isHeading(p)) {
      chunks.push(current);
      current = [];
      size = 0;
    } else if (size > CHUNK_CHARS * 1.3) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(p);
    size += len;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function buildPrompt(params: {
  inspection: InspectionFull;
  topics: Topic[];
  chunk: Paragraph[];
  partNo: number;
  partCount: number;
  oldReport: string;
  /** Base is the stored report of the last digital inspection; topics contain only changes */
  diffMode: boolean;
  /** Second pass: paragraphs already changed in the first pass (id → new text) */
  edited?: Map<number, string>;
}): { shared: string; part: string } {
  const { inspection, topics, chunk, partNo, partCount, oldReport, diffMode, edited } = params;
  const nachtrag = edited
    ? `\nNACHTRAG: Die oben aufgeführten Punkte haben sich geändert, wurden im ersten Durchgang aber nirgends eingetragen. Suche in deinem Teil die Absätze, die diese Punkte behandeln, und passe sie an. Absätze mit [bereits geändert] zeigen den neuen Text: diese nicht ersetzen oder löschen (nur tauschen mit Text daraus oder einfuegen_nach). Kommt ein Punkt in deinem Teil nicht vor, gib dafür nichts zurück und nimm ihn nicht in "abgedeckt" auf. Datum und Jahr des Berichts sind bereits aktualisiert – nicht erneut ändern.\n`
    : "";
  const show = (p: Paragraph) =>
    edited?.has(p.id) ? formatParagraph({ ...p, text: edited.get(p.id)! }).replace(/^(\[\d+\] )/, "$1[bereits geändert] ") : formatParagraph(p);
  const date = de(inspection.inspectionDate)!;
  // Shared prefix (identical for every part of one run) first, so it can be cached; the part
  // with its paragraphs and part number comes after the cache breakpoint.
  const shared = `Du aktualisierst einen Begehungsbericht einer Fachkraft für Arbeitssicherheit (SIFA) für die neue Begehung.

Der ALTE BERICHT (${oldReport}) beschreibt den Stand der letzten Begehung. Er soll so geändert werden, dass er den Stand der NEUEN BEGEHUNG vom ${date} wiedergibt. Stil, Aufbau und Standardtexte bleiben erhalten; nur was sich geändert hat, wird angepasst.

<neue_begehung>
Betrieb: ${inspection.company.name}
Datum: ${date}
Teilnehmer: ${inspection.attendees || "–"}
${inspection.generalNotes ? `Anmerkungen: ${inspection.generalNotes}\n` : ""}
${
  diffMode
    ? `Der alte Bericht wurde aus der letzten digitalen Begehung erstellt. Unten stehen NUR die Punkte, die sich seitdem geändert haben ("vorher:" = Stand im alten Bericht). Alle anderen Punkte sind unverändert: deren Absätze NICHT ändern.
Jeder unten aufgeführte Punkt, der in deinem Teil vorkommt, MUSS angepasst werden – auch wenn nur ein Termin abgelaufen ist (z. B. "… im 08/2026 wieder erforderlich ist" → "… im 08/2026 erforderlich war und somit überfällig ist" plus Empfehlung).
Geänderte Checklistenpunkte (itemKey | Bezeichnung | Ergebnis | Daten | Befunde | vorher):`
    : "Ergebnisse je Checklistenpunkt (itemKey | Bezeichnung | Ergebnis | Daten | Befunde):"
}
${topics.map((t) => t.line).join("\n") || "– keine Änderungen, nur Datum/Jahr aktualisieren –"}
</neue_begehung>

Du bekommst den alten Bericht in mehreren Teilen; jede Anfrage enthält genau einen Teil.

AKTIONEN
- tauschen: ersetzt die exakte Textstelle "alt" im Absatz durch "text" (Formatierung bleibt). Bevorzugt für kleine Änderungen wie Datum, Jahr, Name, Symbol. Bei [fest]-Absätzen ist nur tauschen erlaubt.
- ersetzen: der ganze Absatz bekommt den neuen Text "text". Für umformulierte Feststellungen.
- loeschen: Absatz entfällt (text leer lassen).
- einfuegen_nach: neuer Absatz mit "text" direkt nach dem Absatz (gleiche Formatierung), z. B. eine neue Empfehlung.
- rot: true für inhaltliche Änderungen (werden rot markiert); false nur für reine Aktualisierung von Jahr/Datum des Berichts (Deckblatt, Kopfzeile, Unterschriftsdatum).
- bezug: itemKey bzw. BEFUND-n, zu dem die Änderung gehört – bei jeder inhaltlichen Änderung Pflicht; null nur bei Datum/Jahr des Berichts.

REGELN
1. Berichtsdatum, Jahr und Ort/Datum der Unterschrift auf die neue Begehung (${date}, Jahr ${inspection.inspectionDate.getFullYear()}) setzen, rot = false. Im Fließtext genannte frühere Jahre (z. B. "Protokolle von 2021 bis 2025") nur ändern, wenn die neuen Daten es belegen.
2. Punkt jetzt JA, alter Bericht nennt einen Mangel: Feststellung umformulieren ("Die SIFA stellte fest, dass … vorlag." mit Datum/Name aus den Daten), Empfehlungen, die nur diesen Mangel betrafen, löschen. Allgemeine Erläuterungen (Rechtsgrundlagen, Hinweise) bleiben stehen.
3. Punkt jetzt NEIN, alter Bericht sagt in Ordnung: Feststellung zum Mangel umformulieren (aus Befund/Bemerkung) und danach eine Empfehlung einfügen ("Die SIFA empfahl, …" aus der Maßnahme).
4. Punkt NEIN und auch im alten Bericht ein Mangel: Daten und Details aktualisieren, Empfehlung beibehalten bzw. an die neue Maßnahme anpassen.
5. Punkt JA und alter Bericht passt: nur abweichende Daten/Namen aktualisieren, sonst nichts ändern.
6. Daten, Namen und Termine nur aus der neuen Begehung übernehmen, nichts erfinden. Fehlt bei JA ein neues Datum, bleibt der alte Text; nenne das in "hinweise", wenn das alte Datum offensichtlich veraltet ist (z. B. jährliche Unterweisung von vor mehreren Jahren).
7. Punkte "nicht relevant" und Punkte ohne Ergebnis nicht ändern. Name und Unterschriftsblock der SIFA bleiben wie im alten Bericht.
8. Übersichtstabellen mit Symbolen (Legende: + o.B., - Mängel, +/- teilweise) nur anpassen, wenn die Ergebnisse den Bereich eindeutig abdecken (z. B. "Prüfung Feuerlöscher" ↔ M01B-FL). Gleiche Inhalte, die doppelt vorkommen (Textfeld und Ersatzdarstellung), beide gleich ändern.
9. Schreibstil des Berichts beibehalten: Vergangenheit, "Die SIFA stellte fest, dass …", "Die SIFA empfahl, …". Keine Änderungsvermerke wie "neu" oder "geändert" in den Text schreiben.
10. Ein Absatz = ein Thema. Hänge keine fremden Sachverhalte an einen bestehenden Absatz an; neue Sachverhalte bekommen einen eigenen Absatz (einfuegen_nach).
11. Jeden Befund bzw. neuen Sachverhalt nur an EINER Stelle eintragen, und zwar im thematisch passenden Abschnitt (z. B. Prüfungen von Geräten im Prüfungsteil, Beschilderung beim jeweiligen Bereich). Gibt es in deinem Teil keine passende Stelle, trage ihn nicht ein – er wird dann in einem anderen Teil oder in der Kontrollliste behandelt.
12. Text mit Tabulator/Zeilenumbruch: \\t bzw. \\n verwenden.

abgedeckt: alle itemKeys/BEFUND-n, deren Thema in diesem Teil des Berichts behandelt wird (geändert oder bestätigt).
hinweise: kurze Hinweise an die SIFA (Unklarheiten, Widersprüche), höchstens 5, sonst leer.`;
  const part = `<alter_bericht teil="${partNo} von ${partCount}">
Format: [Absatznummer] Position (T=Tabelle/Z=Zeile/S=Spalte, header/footer = Kopf-/Fußzeile) [fest] = Absatz mit Bild oder Feld, Text als JSON-String
${chunk.map(show).join("\n")}
</alter_bericht>
${nachtrag}

AUFGABE
Gib die Änderungen für DIESEN TEIL des Berichts zurück. Du siehst nur Teil ${partNo} von ${partCount}; ändere nur Absätze, deren Nummer oben steht.`;
  return { shared, part };
}

interface RunContext {
  model: string;
  effort: "low" | "medium" | "high" | "max";
  inspectionId: string;
  companyId: string;
  runId: string;
  costUsd: number;
}

async function runPart(
  prompt: { shared: string; part: string },
  ctx: RunContext,
  onStreamStart?: () => void
): Promise<AiResult> {
  const stream = anthropic.messages.stream({
    model: ctx.model,
    max_tokens: 64000,
    output_config: { effort: ctx.effort, format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt.shared, cache_control: { type: "ephemeral" } },
          { type: "text", text: prompt.part },
        ],
      },
    ],
  });
  if (onStreamStart) {
    let fired = false;
    stream.on("streamEvent", () => {
      if (!fired) {
        fired = true;
        onStreamStart();
      }
    });
  }
  const message = await stream.finalMessage();
  ctx.costUsd += await recordUsage({
    feature: "word-export",
    model: ctx.model,
    usage: message.usage,
    inspectionId: ctx.inspectionId,
    companyId: ctx.companyId,
    runId: ctx.runId,
  });
  if (message.stop_reason === "refusal") throw new Error("Die KI hat den Abgleich abgelehnt");
  if (message.stop_reason === "max_tokens") throw new Error("KI-Antwort war zu lang und wurde abgeschnitten");
  const text = message.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("");
  return JSON.parse(text) as AiResult;
}

/**
 * Runs all parts of one pass. The parts share the cached prefix, but a cache entry is readable
 * only once the first response starts streaming – so part 1 goes first and the others start as
 * soon as it streams (instead of all at once, which would pay the full input price N times).
 */
async function runParts(prompts: { shared: string; part: string }[], ctx: RunContext): Promise<AiResult[]> {
  if (prompts.length === 0) return [];
  let release: () => void = () => {};
  const started = new Promise<void>((resolve) => (release = resolve));
  const first = runPart(prompts[0], ctx, release);
  first.catch(() => release());
  await started;
  return Promise.all([first, ...prompts.slice(1).map((p) => runPart(p, ctx))]);
}

const DEDUPE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["korrekturen"],
  properties: {
    korrekturen: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nr", "entscheidung", "text"],
        properties: {
          nr: { type: "integer" },
          entscheidung: { type: "string", enum: ["verwerfen", "neuer_text"] },
          text: { type: "string", description: "bei neuer_text: korrigierter Absatztext, sonst leer" },
        },
      },
    },
  },
};

/**
 * The parts are edited in parallel, so the same new fact can end up in several places.
 * One short review over all new texts removes the duplicates.
 */
async function dedupeEdits(
  edits: { id: number; action: string; text: string; old: string | null; red: boolean; topic: string | null }[],
  headingOf: (id: number) => string,
  ctx: RunContext
) {
  const candidates = edits
    .map((e, nr) => ({ e, nr }))
    .filter(({ e }) => (e.action === "replace" || e.action === "insert_after") && e.red && e.text.trim());
  if (candidates.length < 2) return edits;
  const list = candidates
    .map(({ e, nr }) => `#${nr} | Absatz ${e.id} | Abschnitt: ${headingOf(e.id)} | ${e.action === "replace" ? "ersetzt" : "neu eingefügt"} | ${e.topic ?? "–"} | ${JSON.stringify(e.text)}`)
    .join("\n");
  const message = await anthropic.messages
    .stream({
      model: ctx.model,
      max_tokens: 32000,
      output_config: { effort: "medium", format: { type: "json_schema", schema: DEDUPE_SCHEMA } },
      messages: [
        {
          role: "user",
          content: `Ein Begehungsbericht wurde in mehreren Teilen gleichzeitig aktualisiert. Hier sind alle neuen bzw. umgeschriebenen Absätze (in Dokumentreihenfolge):

${list}

Prüfe, ob derselbe Sachverhalt (gleicher Mangel, gleiche Prüfung, gleiche Empfehlung) mehrfach eingetragen wurde. Behalte ihn nur an der thematisch passendsten Stelle.
- Für eine überzählige neu eingefügte Stelle: entscheidung "verwerfen".
- Für einen ersetzten Absatz, der den Sachverhalt zusätzlich zu seinem eigenen Thema enthält: entscheidung "neuer_text" mit dem Absatz ohne den doppelten Teil.
- Ein ersetzter Absatz, der nur den doppelten Sachverhalt enthält: "neuer_text" mit dem Text, der sein ursprüngliches Thema beschreibt, falls erkennbar; sonst "verwerfen".
Gib nur Korrekturen zurück; ist nichts doppelt, eine leere Liste.`,
        },
      ],
    })
    .finalMessage();
  ctx.costUsd += await recordUsage({
    feature: "word-dedupe",
    model: ctx.model,
    usage: message.usage,
    inspectionId: ctx.inspectionId,
    companyId: ctx.companyId,
    runId: ctx.runId,
  });
  const text = message.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("");
  const { korrekturen } = JSON.parse(text) as {
    korrekturen: { nr: number; entscheidung: "verwerfen" | "neuer_text"; text: string }[];
  };
  const drop = new Set<number>();
  const result = edits.map((e) => ({ ...e }));
  for (const k of korrekturen) {
    const e = result[k.nr];
    if (!e || !candidates.some((c) => c.nr === k.nr)) continue;
    if (k.entscheidung === "neuer_text" && k.text.trim()) e.text = k.text;
    else if (e.action === "insert_after") drop.add(k.nr);
    else drop.add(k.nr); // replaced paragraph: keep the old text
  }
  return result.filter((_, nr) => !drop.has(nr));
}

/** Old report as .docx in `dir` (a .doc is converted with LibreOffice). */
async function prepareDocx(oldPath: string, dir: string): Promise<string> {
  if (oldPath.toLowerCase().endsWith(".docx")) {
    const target = join(dir, "alt.docx");
    await copyFile(oldPath, target);
    return target;
  }
  await execFileAsync("soffice", [
    `-env:UserInstallation=file://${join(dir, "lo-profile")}`,
    "--headless",
    "--convert-to",
    "docx",
    oldPath,
    "--outdir",
    dir,
  ]);
  const converted = (await readdir(dir)).find((f) => f.toLowerCase().endsWith(".docx"));
  if (!converted) throw new Error("Alter Bericht konnte nicht nach .docx umgewandelt werden");
  return join(dir, converted);
}

/** Model for the Word export; override with REPORT_MODEL (e.g. claude-sonnet-5-5). */
export const REPORT_MODEL = process.env.REPORT_MODEL || IMPORT_MODEL;

export async function updateReport(
  inspectionId: string,
  options: { model?: string; effort?: RunContext["effort"] } = {}
): Promise<{
  buffer: Buffer;
  filename: string;
  summary: ReportUpdateSummary;
}> {
  const inspection = await loadInspection(inspectionId);
  if (!inspection) throw new Error("Begehung nicht gefunden");

  const base = await findBaseReport(inspection);
  if (!base) {
    throw new Error(
      `Kein Bericht als Grundlage gefunden: weder bei einer früheren Begehung gespeichert noch im Ordner Berichte für „${inspection.company.name}“`
    );
  }
  const oldPath = base.path;
  const ctx: RunContext = {
    model: options.model ?? REPORT_MODEL,
    effort: options.effort ?? EFFORT,
    inspectionId,
    companyId: inspection.companyId,
    runId: randomUUID(),
    costUsd: 0,
  };

  const dir = await mkdtemp(join(tmpdir(), "acomanage-report-"));
  try {
    const docx = await prepareDocx(oldPath, dir);
    const { stdout } = await execFileAsync("python3", ["-I", SCRIPT, "extract", docx], {
      maxBuffer: 50 * 1024 * 1024,
    });
    const paragraphs = (JSON.parse(stdout) as Paragraph[]).filter((p) => p.text.trim());

    let topics = buildTopics(inspection);
    let unchangedCount = 0;
    const baseInspection = base.inspectionId ? await loadInspection(base.inspectionId) : null;
    if (baseInspection) {
      const diff = changedTopics(
        topics,
        buildTopics(baseInspection),
        inspection.inspectionDate,
        baseInspection.inspectionDate
      );
      topics = diff.changed;
      unchangedCount = diff.unchanged;
    }
    const chunks = chunkParagraphs(paragraphs);
    const firstPass = await runParts(
      chunks.map((chunk, i) =>
        buildPrompt({
          inspection,
          topics,
          chunk,
          partNo: i + 1,
          partCount: chunks.length,
          oldReport: base.label,
          diffMode: !!baseInspection,
        })
      ),
      ctx
    );
    const results = firstPass.map((r, i) => ({ r, ids: new Set(chunks[i].map((p) => p.id)) }));

    const actionMap: Record<Action, string> = {
      ersetzen: "replace",
      loeschen: "delete",
      einfuegen_nach: "insert_after",
      tauschen: "swap",
    };
    let edits: { id: number; action: string; text: string; old: string | null; red: boolean; topic: string | null }[] = [];
    const skipped: { id: number; reason: string }[] = [];
    const covered = new Set<string>();
    const changed = new Set<string>();
    const hints: string[] = [];
    const collect = (rs: { r: AiResult; ids: Set<number> }[], secondPass = false) => {
      const touched = new Set(edits.map((e) => e.id));
      for (const { r, ids } of rs) {
        r.abgedeckt.forEach((k) => covered.add(k));
        hints.push(...r.hinweise);
        for (const e of r.aenderungen) {
          if (!ids.has(e.absatz)) {
            skipped.push({ id: e.absatz, reason: "Absatz gehört nicht zu diesem Teil" });
            continue;
          }
          // Second pass: date/year updates and changes to paragraphs edited before are already done
          if (secondPass && (!e.bezug || (touched.has(e.absatz) && e.aktion !== "einfuegen_nach"))) continue;
          edits.push({ id: e.absatz, action: actionMap[e.aktion], text: e.text, old: e.alt, red: e.rot, topic: e.bezug });
          if (e.bezug) {
            changed.add(e.bezug);
            covered.add(e.bezug);
          }
        }
      }
    };
    collect(results);

    // Diff mode: every topic sent has changed, so each must lead to an edit. Topics without any
    // edit get one targeted second pass; what is still missing goes to the check list.
    let notAdjusted: Topic[] = [];
    if (baseInspection) {
      const missing = topics.filter((t) => !changed.has(t.key));
      if (missing.length > 0) {
        const editedText = new Map<number, string>();
        for (const e of edits) if (e.action === "replace") editedText.set(e.id, e.text);
        missing.forEach((t) => covered.delete(t.key));
        const second = await runParts(
          chunks.map((chunk, i) =>
            buildPrompt({
              inspection,
              topics: missing,
              chunk,
              partNo: i + 1,
              partCount: chunks.length,
              oldReport: base.label,
              diffMode: true,
              edited: editedText,
            })
          ),
          ctx
        );
        collect(
          second.map((r, i) => ({ r, ids: new Set(chunks[i].map((p) => p.id)) })),
          true
        );
        notAdjusted = missing.filter((t) => !changed.has(t.key) && covered.has(t.key));
      }
    }

    // Section heading of a paragraph (last short line before it) – context for the duplicate check
    const headingOf = (id: number) => {
      let heading = "–";
      for (const p of paragraphs) {
        if (p.id > id) break;
        const t = p.text.trim();
        if (t.length > 3 && t.length < 60 && !/^(Die SIFA|Weiterhin|Der SIFA|[+\-o0/ ]+$)/.test(t)) heading = t;
      }
      return heading;
    };
    edits.sort((a, b) => a.id - b.id);
    if (results.length > 1) edits = await dedupeEdits(edits, headingOf, ctx);

    const editsPath = join(dir, "edits.json");
    const outPath = join(dir, "neu.docx");
    await writeFile(editsPath, JSON.stringify(edits), "utf-8");
    const applied = await execFileAsync("python3", ["-I", SCRIPT, "apply", docx, editsPath, outPath], {
      maxBuffer: 10 * 1024 * 1024,
    });
    const applyResult = JSON.parse(applied.stdout) as { applied: number; skipped: { id: number; reason: string }[] };
    const buffer = await readFile(outPath);

    const topicByKey = new Map(topics.map((t) => [t.key, t]));
    const summary: ReportUpdateSummary = {
      oldReport: base.label,
      costUsd: ctx.costUsd,
      model: ctx.model,
      basedOnInspection: !!baseInspection,
      unchangedTopics: unchangedCount,
      applied: applyResult.applied,
      skipped: [...skipped, ...applyResult.skipped],
      changedTopics: Array.from(changed)
        .filter((k) => topicByKey.has(k))
        .map((k) => `${k} – ${topicByKey.get(k)!.label}`),
      notAdjusted: notAdjusted.map((t) => ({
        key: t.key,
        label: t.label,
        status: STATUS_DE[t.status],
        detail: t.line.split(" | ").slice(3).join(" | "),
      })),
      notInReport: topics
        .filter((t) => t.status !== "NICHT_RELEVANT" && !covered.has(t.key))
        .map((t) => ({
          key: t.key,
          label: t.label,
          status: STATUS_DE[t.status],
          detail: t.line.split(" | ").slice(3).join(" | "),
        })),
      hints,
    };

    const d = inspection.inspectionDate;
    const stand = `${String(d.getMonth() + 1).padStart(2, "0")}_${d.getFullYear()}`;
    const slug = inspection.company.name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
    return { buffer, filename: `Begehung_${stand}_${slug}.docx`, summary };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
