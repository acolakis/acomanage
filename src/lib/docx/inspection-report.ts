import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  Packer,
  Paragraph,
  ShadingType,
  SimpleField,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

// === TYPES ===

interface FindingData {
  id: string;
  findingNumber: number;
  description: string;
  riskLevel: string | null;
  measure: string | null;
  responsible: string | null;
  deadline: string | null;
  status: string;
  section?: { title: string; sectionCode: string } | null;
  templateItem?: { label: string; itemKey: string } | null;
}

interface TemplateSection {
  id: string;
  sectionCode: string;
  title: string;
  sortOrder: number;
  items: TemplateItem[];
}

interface TemplateItem {
  id: string;
  itemKey: string;
  label: string;
  legalReference: string | null;
  sortOrder: number;
}

interface ItemCheck {
  templateItemId: string;
  status: string;
  lastTestDate: string | null;
  nextTestDate: string | null;
}

export interface PrevItemCheck {
  templateItemId: string;
  status: string;
  lastTestDate: string | null;
  nextTestDate: string | null;
}

interface InspectionData {
  id: string;
  inspectionNumber: string | null;
  inspectionDate: string;
  inspectionType: string;
  attendees: string | null;
  generalNotes: string | null;
  status: string;
  completedAt: string | null;
  company: { name: string; city: string | null; street: string | null; zip: string | null };
  inspector: { firstName: string | null; lastName: string | null };
  template?: { name: string; sections: TemplateSection[] } | null;
  findings: FindingData[];
  itemChecks?: ItemCheck[];
}

// === HELPERS ===

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function getBegehungStand(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function buildAddress(company: InspectionData["company"]): string {
  const parts: string[] = [];
  if (company.street) parts.push(company.street);
  const cityLine = [company.zip, company.city].filter(Boolean).join(" ");
  if (cityLine) parts.push(cityLine);
  return parts.join(", ") || "—";
}

function isPrueflisteSection(sectionCode: string): boolean {
  return sectionCode === "M_PRUEFLISTE";
}

// === DIFF LOGIC ===

type DiffMap = Map<
  string,
  { statusChanged: boolean; lastChanged: boolean; nextChanged: boolean; isNew: boolean }
>;

function buildDiffMap(
  currentChecks: ItemCheck[] | undefined,
  prevChecks: PrevItemCheck[] | undefined
): DiffMap {
  const diff: DiffMap = new Map();
  if (!prevChecks || prevChecks.length === 0) return diff;

  const prevMap = new Map<string, PrevItemCheck>();
  for (const p of prevChecks) prevMap.set(p.templateItemId, p);

  for (const cur of currentChecks || []) {
    const prev = prevMap.get(cur.templateItemId);
    if (!prev) {
      const hasData =
        cur.status !== "UNCHECKED" || cur.lastTestDate || cur.nextTestDate;
      if (hasData) {
        diff.set(cur.templateItemId, {
          statusChanged: true,
          lastChanged: !!cur.lastTestDate,
          nextChanged: !!cur.nextTestDate,
          isNew: true,
        });
      }
      continue;
    }
    const prevWasEmpty =
      prev.status === "UNCHECKED" || prev.status === "NICHT_RELEVANT";
    const statusChanged = !prevWasEmpty && prev.status !== cur.status;
    const lastChanged =
      (prev.lastTestDate || null) !== (cur.lastTestDate || null);
    const nextChanged =
      (prev.nextTestDate || null) !== (cur.nextTestDate || null);
    if (statusChanged || lastChanged || nextChanged) {
      diff.set(cur.templateItemId, {
        statusChanged,
        lastChanged,
        nextChanged,
        isNew: false,
      });
    }
  }
  return diff;
}

// === DOCX STYLE CONSTANTS ===

// A4 page with 2cm margins: ~9638 DXA content width
// Using WidthType.PERCENTAGE keeps it responsive
const TOTAL_W = 100; // percent

// Colors
const COLOR_SECTION_BG = "C8C8C8"; // gray section header background
const COLOR_COL_HEADER_BG = "555555"; // dark gray column header background
const COLOR_ALT_ROW_BG = "F5F5F5"; // alternating row
const COLOR_FIND_HEADER_BG = "7A0000"; // dark red findings header
const COLOR_DARKBLUE = "1A3A6B";
const COLOR_RED = "CC0000";
const COLOR_GREEN = "1A6B1A";
const COLOR_MEDGRAY = "777777";
const COLOR_WHITE = "FFFFFF";
const COLOR_BORDER = "AAAAAA";

// Font sizes (in half-points: 16 = 8pt, 18 = 9pt, 20 = 10pt)
const SZ = { tiny: 14, small: 16, body: 17, label: 18, heading: 20, title: 22 };

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER };
const cellBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
};
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noSideBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: noBorder,
  right: noBorder,
};

// === TEXT HELPERS ===

function run(
  text: string,
  opts: {
    bold?: boolean;
    size?: number;
    color?: string;
    italic?: boolean;
  } = {}
): TextRun {
  return new TextRun({
    text,
    bold: opts.bold,
    size: opts.size ?? SZ.small,
    color: opts.color,
    italics: opts.italic,
  });
}

function para(
  runs: TextRun | TextRun[],
  align?: (typeof AlignmentType)[keyof typeof AlignmentType],
  spacing?: number
): Paragraph {
  return new Paragraph({
    children: Array.isArray(runs) ? runs : [runs],
    alignment: align,
    spacing: spacing ? { before: spacing, after: spacing } : { before: 20, after: 20 },
  });
}

function emptyPara(): Paragraph {
  return new Paragraph({ children: [], spacing: { before: 0, after: 0 } });
}

// === CELL BUILDERS ===

function makeCell(
  paragraphs: Paragraph[],
  opts: {
    widthPct?: number;
    shading?: string;
    borders?: object;
    verticalAlign?: "top" | "center" | "bottom";
  } = {}
): TableCell {
  return new TableCell({
    children: paragraphs,
    width: opts.widthPct
      ? { size: opts.widthPct, type: WidthType.PERCENTAGE }
      : undefined,
    shading: opts.shading
      ? { type: ShadingType.SOLID, fill: opts.shading }
      : undefined,
    borders: opts.borders ?? cellBorders,
    verticalAlign: opts.verticalAlign ?? "center",
  });
}

function labelValueCell(
  label: string,
  value: string,
  widthPct: number,
  valueRed?: boolean
): TableCell {
  return makeCell(
    [
      para([
        run(label + " ", { color: COLOR_MEDGRAY, size: SZ.tiny }),
        run(value, { bold: true, size: SZ.body, color: valueRed ? COLOR_RED : undefined }),
      ]),
    ],
    { widthPct, borders: cellBorders }
  );
}

// === DOCUMENT HEADER TABLE ===

function buildHeaderTable(data: InspectionData): Table {
  const address = buildAddress(data.company);
  const stand = getBegehungStand(data.inspectionDate);
  const dateStr = formatDate(data.inspectionDate);

  return new Table({
    width: { size: TOTAL_W, type: WidthType.PERCENTAGE },
    borders: {
      top: thinBorder,
      bottom: thinBorder,
      left: thinBorder,
      right: thinBorder,
    },
    rows: [
      // Row 1: Firma | Begehung Stand
      new TableRow({
        height: { value: 400, rule: HeightRule.ATLEAST },
        children: [
          makeCell(
            [
              para([
                run("Firma:  ", { color: COLOR_MEDGRAY, size: SZ.tiny }),
                run(data.company.name, { bold: true, size: SZ.heading }),
              ]),
            ],
            { widthPct: 60, borders: cellBorders }
          ),
          makeCell(
            [
              para([
                run("Begehung Stand:  ", {
                  color: COLOR_MEDGRAY,
                  size: SZ.tiny,
                }),
                run(stand, {
                  bold: true,
                  size: 24,
                  color: COLOR_DARKBLUE,
                }),
              ]),
            ],
            { widthPct: 40, borders: cellBorders }
          ),
        ],
      }),
      // Row 2: Anschrift | Datum
      new TableRow({
        height: { value: 360, rule: HeightRule.ATLEAST },
        children: [
          labelValueCell("Anschrift:", address, 60),
          labelValueCell("Datum:", dateStr, 40),
        ],
      }),
      // Row 3: Teilnehmer (full width)
      new TableRow({
        height: { value: 360, rule: HeightRule.ATLEAST },
        children: [
          makeCell(
            [
              para([
                run("Teilnehmer:  ", { color: COLOR_MEDGRAY, size: SZ.tiny }),
                run(data.attendees || "—", { bold: true, size: SZ.body }),
              ]),
            ],
            { widthPct: 100, borders: cellBorders }
          ),
        ],
      }),
    ],
  });
}

// === CHECKLIST TABLE ===

function sectionHeaderRow(title: string): TableRow {
  return new TableRow({
    height: { value: 380, rule: HeightRule.ATLEAST },
    children: [
      makeCell(
        [para(run(title, { bold: true, size: SZ.label }))],
        { widthPct: 100, shading: COLOR_SECTION_BG, borders: cellBorders }
      ),
    ],
  });
}

function colHeaderRow(
  cols: Array<{ label: string; widthPct: number; align?: "center" | "left" }>
): TableRow {
  return new TableRow({
    height: { value: 320, rule: HeightRule.ATLEAST },
    children: cols.map((col) =>
      makeCell(
        [
          para(
            run(col.label, { bold: true, size: SZ.tiny, color: COLOR_WHITE }),
            col.align === "left"
              ? AlignmentType.LEFT
              : AlignmentType.CENTER
          ),
        ],
        { widthPct: col.widthPct, shading: COLOR_COL_HEADER_BG, borders: cellBorders }
      )
    ),
  });
}

function statusText(status: string, changed: boolean): TextRun {
  if (status === "IO") {
    return run("JA", {
      bold: true,
      size: SZ.small,
      color: changed ? COLOR_RED : COLOR_GREEN,
    });
  }
  if (status === "MANGEL") {
    return run("NEIN", { bold: true, size: SZ.small, color: COLOR_RED });
  }
  if (status === "NICHT_RELEVANT") {
    return run("n/v", { italic: true, size: SZ.tiny, color: COLOR_MEDGRAY });
  }
  return run("—", { size: SZ.tiny, color: COLOR_MEDGRAY });
}

function regularItemRow(
  item: TemplateItem,
  check: ItemCheck | undefined,
  diff: DiffMap,
  altRow: boolean
): TableRow {
  const d = diff.get(item.id);
  const shading = altRow ? COLOR_ALT_ROW_BG : undefined;

  const lastFmt = formatMonthYear(check?.lastTestDate);
  const nextFmt = formatMonthYear(check?.nextTestDate);
  const dateParts: string[] = [];
  if (lastFmt) dateParts.push(lastFmt);
  if (nextFmt) dateParts.push(`nächste: ${nextFmt}`);
  const dateStr = dateParts.join("  |  ");

  const dateIsRed = !!(d?.lastChanged || d?.nextChanged || d?.isNew);

  return new TableRow({
    height: { value: 320, rule: HeightRule.ATLEAST },
    children: [
      // Code
      makeCell(
        [
          para(
            run(item.itemKey, { bold: true, size: SZ.tiny }),
            AlignmentType.LEFT
          ),
        ],
        { widthPct: 14, shading, borders: cellBorders }
      ),
      // Label
      makeCell(
        [para(run(item.label, { size: SZ.small }))],
        { widthPct: 56, shading, borders: cellBorders }
      ),
      // Status
      makeCell(
        [
          para(
            statusText(check?.status || "UNCHECKED", !!(d?.statusChanged || d?.isNew)),
            AlignmentType.CENTER
          ),
        ],
        { widthPct: 15, shading, borders: cellBorders }
      ),
      // Date
      makeCell(
        [
          para(
            run(dateStr || " ", {
              size: SZ.tiny,
              color: dateIsRed ? COLOR_RED : undefined,
              bold: dateIsRed,
            })
          ),
        ],
        { widthPct: 15, shading, borders: cellBorders }
      ),
    ],
  });
}

function prueflisteItemRow(
  item: TemplateItem,
  check: ItemCheck | undefined,
  diff: DiffMap,
  altRow: boolean
): TableRow {
  const d = diff.get(item.id);
  const shading = altRow ? COLOR_ALT_ROW_BG : undefined;

  const lastFmt = formatMonthYear(check?.lastTestDate);
  const nextFmt = formatMonthYear(check?.nextTestDate);

  const lastIsRed = !!(d?.lastChanged || d?.isNew);
  const nextIsRed = !!(d?.nextChanged || d?.isNew);

  return new TableRow({
    height: { value: 320, rule: HeightRule.ATLEAST },
    children: [
      // Code
      makeCell(
        [para(run(item.itemKey, { bold: true, size: SZ.tiny }))],
        { widthPct: 15, shading, borders: cellBorders }
      ),
      // Label
      makeCell(
        [para(run(item.label, { size: SZ.small }))],
        { widthPct: 45, shading, borders: cellBorders }
      ),
      // Last test date
      makeCell(
        [
          para([
            run("Letzte:  ", { size: SZ.tiny, color: COLOR_MEDGRAY }),
            run(lastFmt || "—", {
              bold: !!lastFmt,
              size: SZ.small,
              color: lastIsRed ? COLOR_RED : undefined,
            }),
          ]),
        ],
        { widthPct: 20, shading, borders: cellBorders }
      ),
      // Next test date
      makeCell(
        [
          para([
            run("Nächste:  ", { size: SZ.tiny, color: COLOR_MEDGRAY }),
            run(nextFmt || "—", {
              bold: !!nextFmt,
              size: SZ.small,
              color: nextIsRed ? COLOR_RED : undefined,
            }),
          ]),
        ],
        { widthPct: 20, shading, borders: cellBorders }
      ),
    ],
  });
}

function buildChecklistTable(
  sections: TemplateSection[],
  checkMap: Map<string, ItemCheck>,
  diff: DiffMap
): Table {
  const rows: TableRow[] = [];

  for (const section of sections) {
    const isPreufliste = isPrueflisteSection(section.sectionCode);
    const visibleItems = section.items.filter((item) => {
      const check = checkMap.get(item.id);
      return !check || check.status !== "NICHT_RELEVANT";
    });
    if (visibleItems.length === 0) continue;

    // Section header (spans full width)
    rows.push(sectionHeaderRow(section.title));

    // Column headers
    if (isPreufliste) {
      rows.push(
        colHeaderRow([
          { label: "Code", widthPct: 15 },
          { label: "Prüfgegenstand", widthPct: 45, align: "left" },
          { label: "Letzte Prüfung", widthPct: 20 },
          { label: "Nächste Prüfung", widthPct: 20 },
        ])
      );
    } else {
      rows.push(
        colHeaderRow([
          { label: "Code", widthPct: 14 },
          { label: "Prüfpunkt / Beschreibung", widthPct: 56, align: "left" },
          { label: "Vorhanden", widthPct: 15 },
          { label: "Datum / Bemerkung", widthPct: 15, align: "left" },
        ])
      );
    }

    // Item rows
    visibleItems.forEach((item, idx) => {
      const check = checkMap.get(item.id);
      const altRow = idx % 2 !== 0;
      if (isPreufliste) {
        rows.push(prueflisteItemRow(item, check, diff, altRow));
      } else {
        rows.push(regularItemRow(item, check, diff, altRow));
      }
    });
  }

  return new Table({
    width: { size: TOTAL_W, type: WidthType.PERCENTAGE },
    borders: {
      top: thinBorder,
      bottom: thinBorder,
      left: thinBorder,
      right: thinBorder,
    },
    rows,
  });
}

// === FINDINGS TABLE ===

const riskLabels: Record<string, string> = {
  NIEDRIG: "Niedrig",
  MITTEL: "Mittel",
  HOCH: "Hoch",
  KRITISCH: "Kritisch",
};

function buildFindingsTable(findings: FindingData[]): Table {
  const rows: TableRow[] = [
    // Header
    new TableRow({
      height: { value: 380, rule: HeightRule.ATLEAST },
      children: [
        makeCell(
          [
            para(
              run(
                `Festgestellte Mängel / Maßnahmen (${findings.length})`,
                { bold: true, size: SZ.label, color: COLOR_WHITE }
              )
            ),
          ],
          { widthPct: 100, shading: COLOR_FIND_HEADER_BG, borders: cellBorders }
        ),
      ],
    }),
    // Column headers
    colHeaderRow([
      { label: "Nr.", widthPct: 7 },
      { label: "Mangelbeschreibung", widthPct: 40, align: "left" },
      { label: "Risiko", widthPct: 18 },
      { label: "Maßnahme / Verantwortlich / Termin", widthPct: 35, align: "left" },
    ]),
    // Finding rows
    ...findings.map((f, idx) => {
      const shading = idx % 2 !== 0 ? "FFF5F5" : undefined;
      const detailParts: string[] = [];
      if (f.measure) detailParts.push(f.measure);
      if (f.responsible) detailParts.push(`Verantw.: ${f.responsible}`);
      if (f.deadline) detailParts.push(`bis: ${formatDate(f.deadline)}`);
      const isHighRisk =
        f.riskLevel === "HOCH" || f.riskLevel === "KRITISCH";

      return new TableRow({
        height: { value: 360, rule: HeightRule.ATLEAST },
        children: [
          makeCell(
            [para(run(`${f.findingNumber}.`, { bold: true, size: SZ.small }))],
            { widthPct: 7, shading, borders: cellBorders }
          ),
          makeCell(
            [para(run(f.description, { size: SZ.small }))],
            { widthPct: 40, shading, borders: cellBorders }
          ),
          makeCell(
            [
              para(
                run(f.riskLevel ? riskLabels[f.riskLevel] || f.riskLevel : "—", {
                  size: SZ.small,
                  color: isHighRisk ? COLOR_RED : undefined,
                  bold: isHighRisk,
                }),
                AlignmentType.CENTER
              ),
            ],
            { widthPct: 18, shading, borders: cellBorders }
          ),
          makeCell(
            [para(run(detailParts.join(" | ") || "—", { size: SZ.tiny }))],
            { widthPct: 35, shading, borders: cellBorders }
          ),
        ],
      });
    }),
  ];

  return new Table({
    width: { size: TOTAL_W, type: WidthType.PERCENTAGE },
    borders: {
      top: thinBorder,
      bottom: thinBorder,
      left: thinBorder,
      right: thinBorder,
    },
    rows,
  });
}

// === SIGNATURE TABLE ===

function buildSignatureTable(data: InspectionData): Table {
  const sigCellStyle = {
    widthPct: 50,
    borders: noSideBorders,
  };

  return new Table({
    width: { size: TOTAL_W, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
    },
    rows: [
      // Blank row (signature space)
      new TableRow({
        height: { value: 1200, rule: HeightRule.EXACT },
        children: [
          makeCell(
            [emptyPara()],
            { ...sigCellStyle, borders: { ...noSideBorders, bottom: thinBorder } }
          ),
          makeCell([emptyPara()], { widthPct: 5, borders: noBorder }),
          makeCell(
            [emptyPara()],
            { widthPct: 45, borders: { ...noSideBorders, bottom: thinBorder } }
          ),
        ],
      }),
      // Labels
      new TableRow({
        height: { value: 300, rule: HeightRule.ATLEAST },
        children: [
          makeCell(
            [para(run("Ort, Datum", { size: SZ.tiny, color: COLOR_MEDGRAY }))],
            { ...sigCellStyle, borders: noSideBorders }
          ),
          makeCell([emptyPara()], { widthPct: 5, borders: noBorder }),
          makeCell(
            [
              para(
                run("Fachkraft für Arbeitssicherheit", {
                  size: SZ.tiny,
                  color: COLOR_MEDGRAY,
                })
              ),
              para(
                run(
                  `${data.inspector.firstName || ""} ${data.inspector.lastName || ""}`.trim(),
                  { size: SZ.small }
                )
              ),
            ],
            { widthPct: 45, borders: noSideBorders }
          ),
        ],
      }),
      // Second signature row (space)
      new TableRow({
        height: { value: 1200, rule: HeightRule.EXACT },
        children: [
          makeCell(
            [emptyPara()],
            { ...sigCellStyle, borders: { ...noSideBorders, bottom: thinBorder } }
          ),
          makeCell([emptyPara()], { widthPct: 5, borders: noBorder }),
          makeCell(
            [emptyPara()],
            { widthPct: 45, borders: { ...noSideBorders, bottom: thinBorder } }
          ),
        ],
      }),
      // Labels row 2
      new TableRow({
        height: { value: 300, rule: HeightRule.ATLEAST },
        children: [
          makeCell(
            [para(run("Arbeitgeber / Vertreter", { size: SZ.tiny, color: COLOR_MEDGRAY }))],
            { ...sigCellStyle, borders: noSideBorders }
          ),
          makeCell([emptyPara()], { widthPct: 5, borders: noBorder }),
          makeCell(
            [para(run("Datum Kenntnisnahme", { size: SZ.tiny, color: COLOR_MEDGRAY }))],
            { widthPct: 45, borders: noSideBorders }
          ),
        ],
      }),
    ],
  });
}

// === MAIN EXPORT ===

export async function renderInspectionDocx(
  data: InspectionData,
  prevChecks?: PrevItemCheck[]
): Promise<Buffer> {
  const checkMap = new Map<string, ItemCheck>();
  for (const c of data.itemChecks || []) {
    checkMap.set(c.templateItemId, c);
  }

  const diff = buildDiffMap(data.itemChecks, prevChecks);
  const sections = data.template?.sections || [];
  const stand = getBegehungStand(data.inspectionDate);

  const hasChanges = diff.size > 0;

  // --- Page header / footer ---
  const docHeader = new Header({
    children: [
      new Table({
        width: { size: TOTAL_W, type: WidthType.PERCENTAGE },
        borders: {
          top: noBorder,
          bottom: thinBorder,
          left: noBorder,
          right: noBorder,
        },
        rows: [
          new TableRow({
            children: [
              makeCell(
                [
                  para(
                    run(
                      `${data.company.name}  |  Begehungsprotokoll A00–XYZ03  |  Stand: ${stand}`,
                      { bold: true, size: SZ.tiny }
                    )
                  ),
                ],
                { widthPct: 70, borders: noBorder }
              ),
              makeCell(
                [
                  para(
                    run(formatDate(data.inspectionDate), {
                      size: SZ.tiny,
                      color: COLOR_MEDGRAY,
                    }),
                    AlignmentType.RIGHT
                  ),
                ],
                { widthPct: 30, borders: noBorder }
              ),
            ],
          }),
        ],
      }),
    ],
  });

  const docFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Begehungsprotokoll A00-XYZ03  |  Seite ", size: SZ.tiny, color: COLOR_MEDGRAY }),
          new SimpleField("PAGE"),
          new TextRun({ text: "  |  AcoManage", size: SZ.tiny, color: COLOR_MEDGRAY }),
        ],
        spacing: { before: 60, after: 0 },
        border: { top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" } },
      }),
    ],
  });

  // --- Document body ---
  const body: (Paragraph | Table)[] = [];

  // Title
  body.push(
    new Paragraph({
      children: [
        run("Begehungsprotokoll – Checkliste A00-XYZ03", {
          bold: true,
          size: 26,
          color: COLOR_DARKBLUE,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      shading: { type: ShadingType.SOLID, fill: "EEF2FF" },
    }),
    new Paragraph({
      children: [
        run("Arbeitsschutz-Begehung gemäß ASiG und DGUV Vorschrift 2", {
          italic: true,
          size: SZ.small,
          color: COLOR_MEDGRAY,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 200 },
    })
  );

  // Info header
  body.push(buildHeaderTable(data));
  body.push(emptyPara());

  // Changed-data notice
  if (hasChanges) {
    body.push(
      new Paragraph({
        children: [
          run(
            "Hinweis: Rot markierte Einträge sind gegenüber der letzten Begehung geändert. " +
              "Bitte nach Prüfung die rote Schriftfarbe entfernen.",
            { size: SZ.small, color: COLOR_RED, italic: true }
          ),
        ],
        spacing: { before: 60, after: 120 },
      })
    );
  }

  // Checklist
  if (sections.length > 0) {
    body.push(buildChecklistTable(sections, checkMap, diff));
    body.push(emptyPara());
  }

  // General notes
  if (data.generalNotes) {
    body.push(
      new Paragraph({
        children: [run("Allgemeine Anmerkungen", { bold: true, size: SZ.label })],
        spacing: { before: 200, after: 60 },
      }),
      new Paragraph({
        children: [run(data.generalNotes, { size: SZ.body })],
        spacing: { before: 0, after: 200 },
      })
    );
  }

  // Findings
  if (data.findings.length > 0) {
    body.push(buildFindingsTable(data.findings));
    body.push(emptyPara());
  }

  // Disclaimer
  body.push(
    new Paragraph({
      children: [
        run(
          "Bitte beachten Sie, dass bei einer stichprobenartigen Besichtigung nicht alle Mängel " +
            "offenkundig werden müssen. Es bleibt in der Verantwortung der Führungskräfte und " +
            "Mitarbeitenden, alles Erforderliche zur Vermeidung von Arbeitsunfällen, Berufserkrankungen " +
            "und arbeitsbedingten Gesundheitsgefahren zu unternehmen. Alle Maßnahmen sind Empfehlungen " +
            "und müssen an die betrieblichen Gegebenheiten angepasst werden.",
          { size: SZ.tiny, color: COLOR_MEDGRAY, italic: true }
        ),
      ],
      spacing: { before: 160, after: 160 },
      border: {
        top: thinBorder,
        bottom: thinBorder,
        left: thinBorder,
        right: thinBorder,
      },
    })
  );

  // Signature block
  body.push(emptyPara());
  body.push(buildSignatureTable(data));

  const doc = new Document({
    title: `Begehungsprotokoll ${stand} – ${data.company.name}`,
    description: "Begehungsprotokoll A00-XYZ03",
    creator: "AcoManage",
    sections: [
      {
        headers: { default: docHeader },
        footers: { default: docFooter },
        properties: {
          page: {
            margin: {
              top: 1134, // ~2cm in DXA
              bottom: 1134,
              left: 1134,
              right: 1134,
            },
          },
        },
        children: body,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
