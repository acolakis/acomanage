import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  Packer,
  Paragraph,
  SimpleField,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import Anthropic from "@anthropic-ai/sdk";
import { exec } from "child_process";
import { promisify } from "util";
import { readdir } from "fs/promises";
import { join } from "path";

const execAsync = promisify(exec);
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY || "" });

const OLD_REPORTS_DIR = "/root/acomanagement/Berichte";

// === Find matching old .doc file for a company ===
export async function findOldReport(companyName: string): Promise<string | null> {
  try {
    const files = await readdir(OLD_REPORTS_DIR);
    const companyWords = companyName
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (companyWords.length === 0) return null;

    // Score each file: count how many company words appear in the filename
    let bestFile: string | null = null;
    let bestScore = 0;

    for (const file of files) {
      if (!file.endsWith(".doc") && !file.endsWith(".docx")) continue;
      const fileLower = file.toLowerCase();
      const matches = companyWords.filter((word) => fileLower.includes(word)).length;
      if (matches > bestScore) {
        bestScore = matches;
        bestFile = file;
      }
    }

    // Only use the file if it matches at least 2 words, or all words if fewer than 2
    const minRequired = Math.min(companyWords.length, 2);
    if (bestFile && bestScore >= minRequired) {
      return join(OLD_REPORTS_DIR, bestFile);
    }
    return null;
  } catch {
    return null;
  }
}

// === Extract text from .doc with antiword ===
async function extractDocText(filePath: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`antiword "${filePath}" 2>/dev/null`);
    return stdout;
  } catch {
    return "";
  }
}

// === Parse text with <<<ROT>>>...<<<ENDROT>>> markers into TextRun[] ===
function parseColoredText(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(<<<ROT>>>|<<<ENDROT>>>)/);
  let inRed = false;

  for (const part of parts) {
    if (part === "<<<ROT>>>") {
      inRed = true;
      continue;
    }
    if (part === "<<<ENDROT>>>") {
      inRed = false;
      continue;
    }
    if (!part) continue;

    runs.push(
      new TextRun({
        text: part,
        color: inRed ? "CC0000" : "000000",
        font: "Arial",
        size: 20,
      })
    );
  }

  return runs.length > 0 ? runs : [new TextRun({ text: text, font: "Arial", size: 20 })];
}

// === Build a table row for the main content table ===
function contentRow(text: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 400, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.SINGLE, size: 4 },
          right: { style: BorderStyle.NONE },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: "", font: "Arial", size: 20 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 8600, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.SINGLE, size: 4 },
          right: { style: BorderStyle.SINGLE, size: 4 },
        },
        children: [
          new Paragraph({
            children: parseColoredText(text),
            spacing: { before: 60, after: 60 },
          }),
        ],
      }),
      new TableCell({
        width: { size: 1800, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.SINGLE, size: 4 },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: "", font: "Arial", size: 20 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 1200, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.SINGLE, size: 4 },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: "", font: "Arial", size: 20 })],
          }),
        ],
      }),
    ],
  });
}

// === Section header row ===
function sectionHeaderRow(title: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 400, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4 },
          bottom: { style: BorderStyle.SINGLE, size: 4 },
          left: { style: BorderStyle.SINGLE, size: 4 },
          right: { style: BorderStyle.NONE },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: "", font: "Arial", size: 20 })],
          }),
        ],
      }),
      new TableCell({
        columnSpan: 3,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4 },
          bottom: { style: BorderStyle.SINGLE, size: 4 },
          left: { style: BorderStyle.SINGLE, size: 4 },
          right: { style: BorderStyle.SINGLE, size: 4 },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                bold: true,
                font: "Arial",
                size: 20,
              }),
            ],
            spacing: { before: 80, after: 80 },
          }),
        ],
      }),
    ],
  });
}

// === Empty separator row ===
function emptyRow(): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: 4,
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.SINGLE, size: 4 },
          right: { style: BorderStyle.SINGLE, size: 4 },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: " ", font: "Arial", size: 20 })],
            spacing: { before: 20, after: 20 },
          }),
        ],
      }),
    ],
  });
}

interface ReportSection {
  title: string;
  paragraphs: string[];
}

interface GeneratedReport {
  begehungsDatum: string;
  teilnehmer: string[];
  sections: ReportSection[];
  signatureOrt: string;
  signatureDatum: string;
  signerName: string;
  signerTitle: string;
  customerName: string;
  customerTitle: string;
  companyName: string;
}

// === Main generation function ===
export async function generateInspectionDocx(
  companyName: string,
  inspectionDate: string,
  attendees: string | null,
  itemChecksData: string,
  findingsData: string,
  inspectorName: string
): Promise<Buffer> {
  // 1. Find old report
  const oldReportPath = await findOldReport(companyName);
  let oldReportText = "";
  let hasTemplate = false;

  if (oldReportPath) {
    oldReportText = await extractDocText(oldReportPath);
    hasTemplate = oldReportText.trim().length > 100;
  }

  // 2. Build the inspection date string
  const dateObj = new Date(inspectionDate);
  const dateDE = dateObj.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const year = dateObj.getFullYear();

  // 3. Call Claude to generate the updated report

  const systemPrompt = `Du bist ein Experte für Betriebsbegehungsberichte nach ASiG. Du schreibst Berichte im Stil eines erfahrenen SIFA (Fachkraft für Arbeitssicherheit).

Stil-Regeln:
- Verwende immer "Die SIFA stellte fest, dass..." oder "Die SIFA empfahl..."
- Schreibe im Präteritum
- Verwende formelle, juristische Sprache
- Jeder Prüfpunkt bekommt einen eigenen Absatz
- Daten werden als "Monat Jahr" oder "DD.MM.YYYY" angegeben`;

  const userPrompt = hasTemplate
    ? `ALTEN BERICHT (als Vorlage, Stil und Struktur übernehmen):\n${oldReportText.slice(0, 15000)}\n\n---\n\nNEUE BEGEHUNGSDATEN:\nDatum: ${dateDE}\nBetrieb: ${companyName}\nTeilnehmer: ${attendees || "nicht angegeben"}\nPrüfergebnis:\n${itemChecksData}\nBefunde:\n${findingsData}\n\nAufgabe: Schreibe einen NEUEN Begehungsbericht ${year} für "${companyName}" im EXAKT GLEICHEN STIL und FORMAT wie der alte Bericht. Ersetze alle alten Daten mit den neuen. Alle geänderten/aktualisierten Stellen (Daten, Status, Empfehlungen die sich geändert haben) MUSST du mit <<<ROT>>> und <<<ENDROT>>> einschließen.\n\nAntworte NUR mit JSON:`
    : `BEGEHUNGSDATEN:\nDatum: ${dateDE}\nBetrieb: ${companyName}\nTeilnehmer: ${attendees || "nicht angegeben"}\nPrüfergebnis:\n${itemChecksData}\nBefunde:\n${findingsData}\n\nSchreibe einen professionellen Betriebsbegehungsbericht ${year} für "${companyName}" im Standard-SIFA-Stil. Geänderte Stellen mit <<<ROT>>>...<<<ENDROT>>> markieren.\n\nAntworte NUR mit JSON:`;

  const jsonSchema = `{
  "begehungsDatum": "${dateDE}",
  "teilnehmer": ["Name 1, Funktion", "Name 2, Funktion"],
  "sections": [
    {
      "title": "I. Personal",
      "paragraphs": ["Text Absatz 1 mit <<<ROT>>>roten Teilen<<<ENDROT>>>", "Text Absatz 2"]
    }
  ],
  "signatureOrt": "Würselen",
  "signatureDatum": "DD.MM.${year}",
  "signerName": "${inspectorName}",
  "signerTitle": "Fachkraft für Arbeitssicherheit",
  "customerName": "Marktleiter",
  "customerTitle": "Marktleiter",
  "companyName": "${companyName}"
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt + "\n\nSchema:\n" + jsonSchema,
      },
    ],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Keine KI-Antwort");
  }

  const raw = textContent.text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("KI-Antwort konnte nicht verarbeitet werden");

  const reportData: GeneratedReport = JSON.parse(jsonMatch[0]);

  // 4. Build the .docx document
  const tableRows: TableRow[] = [];

  // Table header row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 400, type: WidthType.DXA },
          shading: { fill: "CCCCCC" },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Lfd", bold: true, font: "Arial", size: 18 }),
              ],
            }),
          ],
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4 },
            bottom: { style: BorderStyle.SINGLE, size: 4 },
            left: { style: BorderStyle.SINGLE, size: 4 },
            right: { style: BorderStyle.SINGLE, size: 4 },
          },
        }),
        new TableCell({
          width: { size: 8600, type: WidthType.DXA },
          shading: { fill: "CCCCCC" },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Vorgang / Projekt / Durchführung",
                  bold: true,
                  font: "Arial",
                  size: 18,
                }),
              ],
            }),
          ],
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4 },
            bottom: { style: BorderStyle.SINGLE, size: 4 },
            left: { style: BorderStyle.SINGLE, size: 4 },
            right: { style: BorderStyle.SINGLE, size: 4 },
          },
        }),
        new TableCell({
          width: { size: 1800, type: WidthType.DXA },
          shading: { fill: "CCCCCC" },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Verantwortl.\nErledigt am",
                  bold: true,
                  font: "Arial",
                  size: 18,
                }),
              ],
            }),
          ],
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4 },
            bottom: { style: BorderStyle.SINGLE, size: 4 },
            left: { style: BorderStyle.SINGLE, size: 4 },
            right: { style: BorderStyle.SINGLE, size: 4 },
          },
        }),
        new TableCell({
          width: { size: 1200, type: WidthType.DXA },
          shading: { fill: "CCCCCC" },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Hand-zeichen",
                  bold: true,
                  font: "Arial",
                  size: 18,
                }),
              ],
            }),
          ],
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4 },
            bottom: { style: BorderStyle.SINGLE, size: 4 },
            left: { style: BorderStyle.SINGLE, size: 4 },
            right: { style: BorderStyle.SINGLE, size: 4 },
          },
        }),
      ],
    })
  );

  // Add sections
  for (const section of reportData.sections) {
    tableRows.push(sectionHeaderRow(section.title));
    for (const para of section.paragraphs) {
      if (para.trim()) {
        tableRows.push(contentRow(para));
      }
    }
    tableRows.push(emptyRow());
  }

  const mainTable = new Table({
    width: { size: 12000, type: WidthType.DXA },
    rows: tableRows,
  });

  // Signature table
  const sigTable = new Table({
    width: { size: 12000, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5500, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Für die fachliche Richtigkeit",
                    font: "Arial",
                    size: 20,
                  }),
                ],
                spacing: { before: 240 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${reportData.signatureOrt}, den ${reportData.signatureDatum}`,
                    font: "Arial",
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                children: [new TextRun({ text: " ", font: "Arial", size: 20 })],
                spacing: { before: 600 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: reportData.signerName,
                    font: "Arial",
                    size: 20,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: reportData.signerTitle,
                    font: "Arial",
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "AWS Arbeitsschutz",
                    font: "Arial",
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 500, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({ children: [new TextRun({ text: "" })] }),
            ],
          }),
          new TableCell({
            width: { size: 6000, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Zur Kenntnisnahme:",
                    font: "Arial",
                    size: 20,
                  }),
                ],
                spacing: { before: 240 },
              }),
              new Paragraph({
                children: [new TextRun({ text: " ", font: "Arial", size: 20 })],
                spacing: { before: 600 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: reportData.customerName,
                    font: "Arial",
                    size: 20,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: reportData.customerTitle,
                    font: "Arial",
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: reportData.companyName,
                    font: "Arial",
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 20 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 851, right: 851 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        borders: {
                          top: { style: BorderStyle.NONE },
                          bottom: { style: BorderStyle.SINGLE, size: 4 },
                          left: { style: BorderStyle.NONE },
                          right: { style: BorderStyle.NONE },
                        },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: `Betriebsbegehung ${year}  –  Dokumentation  –  gemäß §§ 6 und 11 ASiG sowie DGUV Vorschrift 2`,
                                bold: true,
                                font: "Arial",
                                size: 22,
                                color: "1F3864",
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Sicherheitstechnisches Ing.-Büro  AWS – Arbeitsschutz  |  Carlo-Schmid-Str. 12  |  52146 Würselen  |  Seite ",
                    font: "Arial",
                    size: 16,
                    color: "666666",
                  }),
                  new SimpleField("PAGE"),
                  new TextRun({
                    text: " / ",
                    font: "Arial",
                    size: 16,
                    color: "666666",
                  }),
                  new SimpleField("NUMPAGES"),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          // Cover info block
          new Paragraph({
            children: [
              new TextRun({
                text: `Dokumentation der Betriebsbegehung vom ${reportData.begehungsDatum}`,
                bold: true,
                font: "Arial",
                size: 24,
              }),
            ],
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Teilnehmer:", bold: true, font: "Arial", size: 20 }),
            ],
            spacing: { after: 60 },
          }),
          ...reportData.teilnehmer.map(
            (t) =>
              new Paragraph({
                children: [new TextRun({ text: t, font: "Arial", size: 20 })],
                spacing: { after: 40 },
              })
          ),
          new Paragraph({
            children: [
              new TextRun({
                text: "Besprechungsthemen: Vorhandene Arbeitsschutzunterlagen",
                font: "Arial",
                size: 20,
              }),
            ],
            spacing: { before: 120, after: 240 },
          }),
          // Main content table
          mainTable,
          new Paragraph({
            children: [new TextRun({ text: " " })],
            spacing: { before: 480 },
          }),
          // Signature table
          sigTable,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
