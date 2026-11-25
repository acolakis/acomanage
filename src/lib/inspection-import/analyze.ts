import Anthropic from "@anthropic-ai/sdk";
import { IMPORT_MODEL, anthropic } from "./client";
import { recordUsage } from "@/lib/ai/usage";
import type { OldReport } from "./old-report";
import type { ImportAnalysis, ImportItem, TemplateItemInfo } from "./types";

const nullableString = { type: ["string", "null"] };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["betrieb", "datum", "teilnehmer", "items", "maengel", "weiterePruefdaten", "kurznotizen"],
  properties: {
    betrieb: nullableString,
    datum: { type: ["string", "null"], description: "YYYY-MM-DD" },
    teilnehmer: nullableString,
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "itemKey", "antwort", "status", "lastTestDate", "nextTestDate",
          "note", "unsicher", "abgleich", "abgleichHinweis",
        ],
        properties: {
          itemKey: { type: "string" },
          antwort: { type: "string", enum: ["JA", "NEIN", "OFFEN", "GESTRICHEN"] },
          status: { type: "string", enum: ["IO", "MANGEL", "NICHT_RELEVANT", "UNCHECKED"] },
          lastTestDate: { type: ["string", "null"], description: "YYYY-MM-DD" },
          nextTestDate: { type: ["string", "null"], description: "YYYY-MM-DD" },
          note: nullableString,
          unsicher: { type: "boolean" },
          abgleich: { type: "string", enum: ["BESTAETIGT", "KORRIGIERT", "ABWEICHUNG", "KEIN_VERGLEICH"] },
          abgleichHinweis: nullableString,
        },
      },
    },
    maengel: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["itemKey", "beschreibung", "massnahme", "risiko"],
        properties: {
          itemKey: nullableString,
          beschreibung: { type: "string" },
          massnahme: nullableString,
          risiko: { type: "string", enum: ["NIEDRIG", "MITTEL", "HOCH", "KRITISCH"] },
        },
      },
    },
    weiterePruefdaten: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["bezeichnung", "datum", "hinweis"],
        properties: {
          bezeichnung: { type: "string" },
          datum: { type: "string" },
          hinweis: nullableString,
        },
      },
    },
    kurznotizen: { type: "array", items: { type: "string" } },
  },
};

function buildPrompt(
  transcript: string,
  items: TemplateItemInfo[],
  oldReport: OldReport | null,
  previousChecks: string | null
): string {
  const itemList = items.map((i) => `${i.itemKey} | ${i.label}`).join("\n");
  return `Du wertest eine Arbeitsschutz-Begehung (Ordnerprüfung nach ASiG) aus. Grundlage ist die wörtliche Abschrift einer handschriftlich ausgefüllten GoodNotes-Checkliste.

<abschrift>
${transcript}
</abschrift>

<checklistenpunkte>
itemKey | Bezeichnung
${itemList}
</checklistenpunkte>

${oldReport ? `<vorbericht datei="${oldReport.fileName}">
${oldReport.text.slice(0, 60000)}
</vorbericht>` : "<vorbericht>Kein Vorbericht gefunden.</vorbericht>"}
${previousChecks ? `\n<letzte_digitale_begehung>\n${previousChecks}\n</letzte_digitale_begehung>\n` : ""}
AUFGABE
Ordne jeden Eintrag der Abschrift dem passenden itemKey zu und gib für jeden Checklistenpunkt, zu dem die Abschrift etwas enthält, einen Eintrag in "items" zurück. Punkte, zu denen nichts in der Abschrift steht, lässt du weg. Formular-Codes wie "A 01 B" entsprechen itemKey "A01B"; Unterpunkte (z. B. Inhaltsverzeichnis/Deckblätter bei A 00) haben eigene itemKeys (A00-INH, A00-DECK).

FELDER
- antwort: was auf dem Formular eingekreist ist (JA / NEIN / OFFEN = nichts eingekreist / GESTRICHEN = Punkt durchgestrichen).
- status:
  - IO: vorhanden und aktuell, keine Beanstandung.
  - MANGEL: NEIN eingekreist, ODER JA eingekreist, aber als veraltet/nicht aktuell/"nein" im Feld Aktuell/Datum/"alte Adresse"/defekt/beschädigt vermerkt, ODER Prüftermin vor dem Begehungsdatum abgelaufen.
  - NICHT_RELEVANT: Punkt durchgestrichen.
  - UNCHECKED: nichts eingekreist und kein verwertbarer Eintrag.
- lastTestDate / nextTestDate im Format YYYY-MM-DD. Monatsangaben "MM/JJ" → erster des Monats (10/26 → 2026-10-01). Ein Datum nach dem Begehungsdatum ist ein Prüf-/Ablauftermin → nextTestDate. Ein Datum davor (Ausstellungsdatum, letzte Prüfung, letzte Unterweisung) → lastTestDate.
- note: Namen, Funktionen, Bemerkungen in Kurzform (z. B. "Naser Baliu, Marktleiter").
- unsicher: true, wenn die Abschrift [?] enthält und es durch den Vorbericht NICHT geklärt werden konnte.

NOTIZSEITE (freie Handschrift mit Prüfdaten)
Abkürzungen: FL = Feuerlöscher (M01B-FL), Stapler/FF7 = M01B-FF7, Automatiktüre/Schiebetür = M01B-ESCHIEBE, Rauchabzug/RWA = M01B-RWA, E-Check = M01B-FESTNETZ, Rolltore = M01B-ROLLTORE, Bs-Tür/Brandschutztür = M01B-BRAND, Leitern = M01B-LEITERN, Regale = M01B-REGALE, Presse = M01B-PRESSE, Säge/Plattensäge = M01B-SAEGE, Absaugung = M01B-ABSAUG, Verbandbuch = TV02.
Prüfdaten ohne passenden Checklistenpunkt (z. B. Augenspülung, Verbandkästen, Ladegerät, Putzmaschine) kommen in "weiterePruefdaten" (datum als Text wie notiert, z. B. "07/27"). Sonstige freie Notizen in "kurznotizen".

GEGENPRÜFUNG MIT DEM VORBERICHT (wichtig)
Vergleiche jeden Punkt mit dem Vorbericht (und der letzten digitalen Begehung, falls vorhanden):
- Unsichere Handschrift (Namen, Daten) mit dem Vorbericht auflösen, wenn eindeutig dasselbe gemeint ist. Beispiel: Abschrift "Naser Balic [?], 01.12.2018 [?]", Vorbericht "Herrn Naser Baliu, Marktleiter, vom 03.12.2018" → note "Naser Baliu, Marktleiter", lastTestDate 2018-12-03, abgleich KORRIGIERT, abgleichHinweis nennt die Korrektur. Unvollständige Daten ("07.2018") mit dem genauen Datum aus dem Vorbericht ergänzen, wenn Monat/Jahr übereinstimmen.
- Antwort und Status prüfen und anpassen, wenn Abschrift und Vorbericht zusammen ein klares Bild ergeben: z. B. JA eingekreist, aber der Vorbericht nennt das Dokument mit demselben alten Datum als veraltet und die Abschrift zeigt kein neues Datum → status MANGEL, abgleich KORRIGIERT mit Begründung. Die aktuelle Checkliste hat Vorrang, wenn sie eindeutig etwas Neues zeigt (neues Datum, neuer Name).
- abgleich BESTAETIGT: Vorbericht passt zur Checkliste. ABWEICHUNG: Widerspruch, den du nicht sicher auflösen kannst → Status aus der Checkliste lassen, Widerspruch in abgleichHinweis beschreiben. KEIN_VERGLEICH: Punkt kommt im Vorbericht nicht vor.
- Erfinde keine Werte: Daten und Namen nur aus Abschrift oder Vorbericht.

MÄNGEL
Für jeden Punkt mit status MANGEL einen Eintrag in "maengel" mit kurzer sachlicher Beschreibung (wie im Bericht: "Das Firmenorganigramm lag nicht aktuell vor.") und konkreter Maßnahme. Zusätzlich Mängel aus der Notizseite (z. B. "stark beschädigt") mit itemKey null, falls kein Punkt passt. Risiko: Brandschutz/Erste Hilfe/Prüffristen überschritten meist HOCH, fehlende Dokumente MITTEL, Formalien NIEDRIG.

KÜRZE: note und abgleichHinweis jeweils höchstens ein kurzer Satz (max. ca. 20 Wörter). Bei BESTAETIGT reicht abgleichHinweis null.

Kopf: betrieb (Ort/Firma oben auf der Notizseite), datum (Begehungsdatum, YYYY-MM-DD), teilnehmer (Namen aus dem Kopf, kommagetrennt, mit Anrede).`;
}

// Tested on Kaarst 07/2026: "medium" saved only ~50 s (225 s vs. 277 s) and missed an overdue
// yearly instruction (G01B), so the analysis runs on "high".
const ANALYZE_EFFORT = "high" as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (d: string | null | undefined) =>
  d && DATE_RE.test(d) && !Number.isNaN(new Date(d).getTime()) ? d : null;

/**
 * Deterministic post-processing: drop unknown keys, normalise dates and flag overdue tests.
 */
function postProcess(
  raw: Omit<ImportAnalysis, "vorbericht">,
  items: TemplateItemInfo[],
  inspectionDate: string | null
): Omit<ImportAnalysis, "vorbericht"> {
  const known = new Set(items.map((i) => i.itemKey));
  const seen = new Set<string>();
  const cleaned: ImportItem[] = [];
  const refDate = validDate(inspectionDate ?? raw.datum);

  for (const it of raw.items) {
    if (!known.has(it.itemKey) || seen.has(it.itemKey)) continue;
    seen.add(it.itemKey);
    const item: ImportItem = {
      ...it,
      lastTestDate: validDate(it.lastTestDate),
      nextTestDate: validDate(it.nextTestDate),
    };
    if (item.antwort === "GESTRICHEN") item.status = "NICHT_RELEVANT";
    if (refDate && item.nextTestDate && item.nextTestDate < refDate && item.status !== "NICHT_RELEVANT") {
      if (item.status !== "MANGEL") {
        item.status = "MANGEL";
        item.abgleich = "KORRIGIERT";
        const due = new Date(item.nextTestDate).toLocaleDateString("de-DE", { month: "2-digit", year: "numeric" });
        item.abgleichHinweis = [item.abgleichHinweis, `Prüftermin ${due} vor dem Begehungsdatum – überfällig`]
          .filter(Boolean)
          .join(" · ");
      }
    }
    cleaned.push(item);
  }

  const maengel = raw.maengel.map((m) => ({
    ...m,
    itemKey: m.itemKey && known.has(m.itemKey) ? m.itemKey : null,
  }));
  // Every MANGEL item needs a finding (e.g. overdue tests added above).
  for (const item of cleaned) {
    if (item.status === "MANGEL" && !maengel.some((m) => m.itemKey === item.itemKey)) {
      const info = items.find((i) => i.itemKey === item.itemKey)!;
      maengel.push({
        itemKey: item.itemKey,
        beschreibung: `${info.label}: ${item.abgleichHinweis || item.note || "Mangel festgestellt"}`,
        massnahme: info.suggestedMeasure,
        risiko: info.defaultRiskLevel || "MITTEL",
      });
    }
  }

  return { ...raw, datum: validDate(raw.datum), items: cleaned, maengel };
}

export async function analyzeTranscript(params: {
  transcript: string;
  items: TemplateItemInfo[];
  oldReport: OldReport | null;
  previousChecks: string | null;
  inspectionDate: string | null;
  companyId: string;
}): Promise<ImportAnalysis & { costUsd: number }> {
  const message = await anthropic.messages
    .stream({
      model: IMPORT_MODEL,
      max_tokens: 64000,
      output_config: {
        effort: ANALYZE_EFFORT,
        format: { type: "json_schema", schema: SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: buildPrompt(params.transcript, params.items, params.oldReport, params.previousChecks),
        },
      ],
    })
    .finalMessage();

  const costUsd = await recordUsage({
    feature: "import-analyze",
    model: IMPORT_MODEL,
    usage: message.usage,
    companyId: params.companyId,
  });
  if (message.stop_reason === "refusal") throw new Error("Die KI hat die Auswertung abgelehnt");
  if (message.stop_reason === "max_tokens") throw new Error("KI-Antwort war zu lang und wurde abgeschnitten");

  const text = message.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("");
  const raw = JSON.parse(text) as Omit<ImportAnalysis, "vorbericht">;
  const result = postProcess(raw, params.items, params.inspectionDate);
  return { ...result, vorbericht: params.oldReport?.fileName ?? null, costUsd };
}

