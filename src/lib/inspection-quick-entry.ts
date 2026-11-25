// Quick entry for the notes page of the paper checklist ("FL 07/26, 08/27", "Leitern 05/27 Herr Müller").
// Client-safe: no server imports.

/** Device/topic abbreviations as written on the notes page → item key of the A00–XYZ03 checklist. */
const ALIASES: [string, string][] = [
  ["feuerloescher", "M01B-FL"],
  ["loescher", "M01B-FL"],
  ["fl", "M01B-FL"],
  ["gabelstapler", "M01B-FF7"],
  ["ladestapler", "M01B-FF7"],
  ["stapler", "M01B-FF7"],
  ["flurfoerderfahrzeug", "M01B-FF7"],
  ["ff7", "M01B-FF7"],
  ["ff", "M01B-FF7"],
  ["automatiktuer", "M01B-ESCHIEBE"],
  ["automatiktuere", "M01B-ESCHIEBE"],
  ["schiebetuer", "M01B-ESCHIEBE"],
  ["schiebetuere", "M01B-ESCHIEBE"],
  ["e-schiebetuer", "M01B-ESCHIEBE"],
  ["rauchabzug", "M01B-RWA"],
  ["rwa", "M01B-RWA"],
  ["e-check", "M01B-FESTNETZ"],
  ["echeck", "M01B-FESTNETZ"],
  ["e check", "M01B-FESTNETZ"],
  ["festnetz", "M01B-FESTNETZ"],
  ["ortsfest", "NO01A"],
  ["ortsfeste", "NO01A"],
  ["ortsveraenderlich", "NO01B"],
  ["ortsveraenderliche", "NO01B"],
  ["nicht ortsfest", "NO01B"],
  ["mehrfachsteckdose", "NO01B"],
  ["mehrfachsteckdosen", "NO01B"],
  ["kabeltrommel", "NO01B"],
  ["dguv v3", "NO01B"],
  ["rolltor", "M01B-ROLLTORE"],
  ["rolltore", "M01B-ROLLTORE"],
  ["brandschutztuer", "M01B-BRAND"],
  ["brandschutztueren", "M01B-BRAND"],
  ["bs-tuer", "M01B-BRAND"],
  ["bs-tueren", "M01B-BRAND"],
  ["bs tuer", "M01B-BRAND"],
  ["leiter", "M01B-LEITERN"],
  ["leitern", "M01B-LEITERN"],
  ["tritt", "M01B-LEITERN"],
  ["regal", "M01B-REGALE"],
  ["regale", "M01B-REGALE"],
  ["presse", "M01B-PRESSE"],
  ["ballenpresse", "M01B-PRESSE"],
  ["saege", "M01B-SAEGE"],
  ["plattensaege", "M01B-SAEGE"],
  ["absaugung", "M01B-ABSAUG"],
  ["absauganlage", "M01B-ABSAUG"],
  ["hebebuehne", "M01B-HEBEBUEHN"],
  ["hebebuehnen", "M01B-HEBEBUEHN"],
  ["blitzschutz", "M01B-BLITZ"],
  ["hochdruckreiniger", "M01B-HDREINIG"],
  ["hdr", "M01B-HDREINIG"],
  ["aufzug", "M01B-AUFZUG"],
  ["notbeleuchtung", "M01B-FLUCHTB"],
  ["fluchtwegbeleuchtung", "M01B-FLUCHTB"],
  ["rettungswegbeleuchtung", "M01B-FLUCHTB"],
  ["sicherheitsbeleuchtung", "M01B-FLUCHTB"],
  ["auffanggurt", "M01B-PSA"],
  ["psa absturz", "M01B-PSA"],
  ["psaga", "M01B-PSA"],
  ["verbandbuch", "TV02"],
  ["evakuierung", "S02B"],
  ["evakuierungsuebung", "S02B"],
  ["raeumungsuebung", "S02B"],
  ["brandschutzhelfer", "S02"],
  ["ersthelfer", "W01"],
  ["asa", "L01"],
  ["unterweisung", "G02A"],
  ["fuehrerscheinkontrolle", "A03C"],
  ["fuehrerschein", "A03C"],
  ["mitarbeiterzahl", "B01D"],
];

/**
 * Usual test intervals in months (DGUV / BetrSichV / ASR defaults) to compute the next due date
 * from a last test date. Only used when no later date was written down.
 */
export const TEST_INTERVAL_MONTHS: Record<string, number> = {
  "M01B-FL": 24,
  "M01B-FF7": 12,
  "M01B-ESCHIEBE": 12,
  "M01B-RWA": 12,
  "M01B-FESTNETZ": 48,
  "M01B-ROLLTORE": 12,
  "M01B-BRAND": 12,
  "M01B-LEITERN": 12,
  "M01B-REGALE": 12,
  "M01B-PRESSE": 12,
  "M01B-SAEGE": 12,
  "M01B-ABSAUG": 12,
  "M01B-HEBEBUEHN": 12,
  "M01B-BLITZ": 48,
  "M01B-HDREINIG": 12,
  "M01B-AUFZUG": 24,
  "M01B-FLUCHTB": 12,
  "M01B-PSA": 12,
  NO01A: 48,
  NO01B: 12,
  G02A: 12,
  G03: 12,
  S02B: 12,
};

export interface QuickEntryLine {
  /** The text as typed (all segments that belong to the same item). */
  text: string;
  itemKey: string | null;
  /** YYYY-MM-DD: oldest date on/before the inspection date (the oldest device decides). */
  lastTestDate: string | null;
  /** YYYY-MM-DD: earliest due date – written down, or last test + usual interval. */
  nextTestDate: string | null;
  /** nextTestDate was computed from the interval, not written down. */
  nextComputed: boolean;
}

export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-${pad(d)}`;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");

const pad = (n: number) => String(n).padStart(2, "0");
const fullYear = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));

/** All dates in a text: "03.12.2018", "07/26", "7/2026", "07.26" (month dates → first of month). */
export function extractDates(text: string): string[] {
  const dates: string[] = [];
  // Full dates first and blank them out, so "03.12.2018" is not read as month date "12.20…"
  const rest = text.replace(/\b(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})\b/g, (m, d, mo, y) => {
    const day = Number(d), month = Number(mo);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) dates.push(`${fullYear(y)}-${pad(month)}-${pad(day)}`);
    return " ";
  });
  rest.replace(/\b(\d{1,2})[/.](\d{4}|\d{2})\b/g, (m, mo, y) => {
    const month = Number(mo);
    if (month >= 1 && month <= 12) dates.push(`${fullYear(y)}-${pad(month)}-01`);
    return " ";
  });
  return dates;
}

/** Longest alias or item key in the segment, or null. */
function matchItem(segment: string, knownKeys: Set<string>): string | null {
  for (const token of segment.toUpperCase().match(/[A-Z]{1,3}\d{2}[A-Z]{0,2}(?:-[A-Z0-9]+)?/g) ?? []) {
    if (knownKeys.has(token)) return token;
  }
  const norm = ` ${normalize(segment).replace(/[^a-z0-9\- ]/g, " ").replace(/\s+/g, " ")} `;
  let best: [string, string] | null = null;
  for (const [alias, key] of ALIASES) {
    if (!knownKeys.has(key)) continue;
    if (norm.includes(` ${alias} `) && (!best || alias.length > best[0].length)) best = [alias, key];
  }
  return best?.[1] ?? null;
}

/**
 * Parses the typed notes. Lines are split at line breaks, ";" and ","; a segment without
 * its own device ("08/27" in "FL 07/26, 08/27") belongs to the item before it.
 * Several lines for the same item are merged.
 */
export function parseQuickEntry(input: string, knownKeys: Set<string>, inspectionDate: string): QuickEntryLine[] {
  const ref = inspectionDate.slice(0, 10);
  const groups: { text: string[]; itemKey: string | null; dates: string[] }[] = [];

  for (const line of input.split(/\n/)) {
    let current: (typeof groups)[number] | null = null;
    for (const raw of line.split(/[;,]/)) {
      const segment = raw.trim();
      if (!segment) continue;
      const key = matchItem(segment, knownKeys);
      const dates = extractDates(segment);
      if (key || !current) {
        const existing = key ? groups.find((g) => g.itemKey === key) : undefined;
        current = existing ?? { text: [], itemKey: key, dates: [] };
        if (!existing) groups.push(current);
      }
      current.text.push(segment);
      current.dates.push(...dates);
    }
  }

  return groups.map((g) => {
    const future = g.dates.filter((d) => d > ref).sort();
    const past = g.dates.filter((d) => d <= ref).sort();
    const lastTestDate = past[0] ?? null;
    const interval = g.itemKey ? TEST_INTERVAL_MONTHS[g.itemKey] : undefined;
    const computed = lastTestDate && interval ? addMonths(lastTestDate, interval) : null;
    const written = future[0] ?? null;
    const useComputed = !!computed && (!written || computed < written);
    return {
      text: g.text.join(", "),
      itemKey: g.itemKey,
      lastTestDate,
      nextTestDate: useComputed ? computed : written,
      nextComputed: useComputed,
    };
  });
}
