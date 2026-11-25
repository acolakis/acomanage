import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { recordUsage } from "@/lib/ai/usage";

const execAsync = promisify(exec);
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY || "" });

const PROMPT = `Du bist ein Experte für deutsche Arbeitsschutz-Begehungsberichte (Betriebsbegehungen nach ASiG).

Der folgende Text ist ein alter Begehungsbericht (Fließtext-Format). Analysiere ihn und extrahiere alle Informationen. Mappe die Inhalte auf das A00-XYZ03-Checklisten-Format.

WICHTIG: Antworte NUR mit gültigem JSON (kein Text davor oder danach, keine Markdown-Blöcke):

{
  "betrieb": "Name des Betriebs",
  "datum": "YYYY-MM-DD",
  "teilnehmer": "Namen der Teilnehmer",
  "checklistItems": [
    {
      "code": "A00",
      "status": "IO",
      "lastTestDate": "YYYY-MM-DD oder null",
      "note": "Bemerkung oder null"
    }
  ],
  "maengel": [
    {
      "beschreibung": "Was die SIFA empfohlen hat zu korrigieren",
      "code": "betroffener Code oder null"
    }
  ]
}

STATUS-REGELN:
- "IO" = wenn der Text sagt: "lag vor", "war aktuell", "war vorhanden", "wurde durchgeführt", "erfolgte", "lagen vor", "waren aktuell", "war ordnungsgemäß"
- "MANGEL" = wenn der Text sagt: "empfahl", "fehlte", "war veraltet", "lag nicht vor", "nicht vorhanden", "ohne ... Punkt", "noch nicht", "muss erneuert"
- "NICHT_RELEVANT" = wenn der Prüfpunkt im Bericht gar nicht erwähnt wird

CODE-MAPPING (aus dem Fließtext auf A00-XYZ03):
- Arbeitsschutzordner → A00
- Inhaltsverzeichnis/Deckblätter → A00-INH, A00-DECK
- Firmenorganigramm → A01
- Grundsatzerklärung → A01B
- Zusatz zum Arbeitsvertrag Leitungskraft → A02B
- Übertragung Unternehmerpflichten → A02
- Leitungskräfteunterweisung → A02X
- Info-Broschüre Führungskräfte → A02Z
- Stellenbeschreibungen → STELL
- Beauftragung Fahrzeuge/Führen → A03
- Beauftragung Elektrofahrzeuge → A03A
- Beauftragung Gasfahrzeuge → A03B
- Führerscheinkontrolle → A03C (lastTestDate = Datum der letzten Kontrolle)
- Beauftragung befähigte Person Leitern → A04 (lastTestDate = Datum der Beauftragung)
- Beauftragung befähigte Person Regale → A04B (lastTestDate = Datum)
- Beauftragung befähigte Person Gerüst → A04C
- Bestellungsurkunde SIFA → B01 (lastTestDate = Datum)
- Fortbildungsnachweis SIFA → B01B (lastTestDate = Datum)
- Beratungsplan SIFA → CD01
- Beratungsabschlussbericht SIFA → CD01B
- Begehungsbericht → E01 (lastTestDate = Datum)
- Kenntnisnahme Begehungsbericht → E01B
- Mängelbehebung aus vorherigem Bericht → E01C
- Aushangpflichtige Gesetze → F01 (lastTestDate = Jahr/Datum)
- DGUV Vorschrift 1 → F01B
- DGUV Vorschrift 38 → F01C
- Mutterschutzgesetz → F01D
- Erstinformation neue Mitarbeiter → G01A
- Unterweisungsnachweis allgemein → G01B (lastTestDate = Datum der letzten Unterweisung)
- Jährliche Arbeitsschutzunterweisung → G02A (lastTestDate = Datum)
- Unterweisung hochgelegener Arbeitsplatz → G02B
- Fachliche Qualifikation/Maschineneinweisung → G02E
- Maschineneinzelunterweisung → G02F
- Fortbildung Fahrer Flurförderfahrzeug/Stapler → G03 (lastTestDate = Datum)
- Fortbildung Fahrer Hubarbeitsbühne → G03B
- Maschinenbedienungsanleitungen → H01A
- Maschinenbetriebsanweisungen → H01B (lastTestDate = Datum)
- Gefahrstofferfassung → IJ01A (lastTestDate = Datum)
- Gefahrstoffkataster → IJ01B
- Sicherheitsdatenblätter → IJ02
- Gefahrstoffbetriebsanweisungen → IJ02C (lastTestDate = Datum)
- Gefahrstoffunterweisung → IJ02D (lastTestDate = Datum)
- Gefahrstoff-GBU → IJ03 (lastTestDate = Datum)
- Allg. Gefährdungsbeurteilung → K01A (lastTestDate = Datum Inkraftsetzung)
- Wirksamkeitskontrolle GBU → K01A-WK (lastTestDate = Datum)
- Arbeitsschutzausschuss (ASA) → L_ASA-Bereich
- Feuerlöscher Prüfdatum → M01B-FL (lastTestDate = letzte Prüfung, nextTestDate = nächste)
- Rolltore → M01B-ROLLTORE
- Hebebühnen → M01B-HEBEBUEHN
- Blitzschutz → M01B-BLITZ
- Hochdruckreiniger → M01B-HDREINIG
- Leitern Prüfung → M01B-LEITERN (lastTestDate)
- Regale Prüfung → M01B-REGALE (lastTestDate)
- Flurförderfahrzeug/Stapler Prüfung → M01B-FF7 (lastTestDate)
- Automatiktüren/E-Schiebetüren → M01B-ESCHIEBE
- Absauganlage → M01B-ABSAUG
- Aufzug → M01B-AUFZUG
- E-Check/Festnetz → M01B-FESTNETZ (lastTestDate)
- Flucht-Rettungswegbeleuchtung → M01B-FLUCHTB
- RWA/Rauchabzug → M01B-RWA
- Presse → M01B-PRESSE
- Brandschutztüren → M01B-BRAND
- PSA gegen Absturz → M01B-PSA
- Elektrische Anlagen/DGUV V3 → NO01
- Elektrofachkraft → NO02
- Fremdfirmenkoordination → PQ01
- Fremdfirmen-Unterweisung → PQ02
- Sicherheitsbeauftragter → R01 (lastTestDate = Datum Beauftragung)
- Brandschutzordnung → S01
- Brandschutzbeauftragter → S02
- Feuerlöscher vorhanden/Anzahl → S03
- Flucht-/Rettungswegplan → S04
- Schriftverkehr → SCH-Bereich
- Betriebsarzt Bestellungsurkunde → ST01 (lastTestDate = Datum)
- Arbeitsmedizinische Vorsorge → ST02 (lastTestDate = Datum)
- Unfallmeldungen → TV01 (lastTestDate = Datum letzter Unfall)
- Verbandbuch → TV02
- Ersthelferausbildung/Quote → W01 (lastTestDate = Datum)
- Ersthelfer Folgeausbildung → W02
- Betriebsanweisungen allg. → XYZ01

Extrahiere NUR was tatsächlich im Text erwähnt wird. Setze nicht erwähnte Codes auf NICHT_RELEVANT (lass sie weg aus der Liste).`;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("doc") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
    }

    // Write file to temp location
    const tmpPath = join(tmpdir(), `begehung_${randomUUID()}.doc`);
    const buffer = await file.arrayBuffer();
    await writeFile(tmpPath, Buffer.from(buffer));

    // Extract text with antiword
    let docText = "";
    try {
      const { stdout } = await execAsync(`antiword "${tmpPath}" 2>/dev/null`);
      docText = stdout;
    } catch {
      // Try python-docx for .docx files
      try {
        const { stdout } = await execAsync(
          `python3 -c "import docx; d=docx.Document('${tmpPath}'); print('\\n'.join([p.text for p in d.paragraphs]))" 2>/dev/null`
        );
        docText = stdout;
      } catch {
        await unlink(tmpPath).catch(() => {});
        return NextResponse.json({ error: "Datei konnte nicht gelesen werden (nur .doc und .docx)" }, { status: 400 });
      }
    }

    await unlink(tmpPath).catch(() => {});

    if (!docText.trim()) {
      return NextResponse.json({ error: "Dokument enthält keinen lesbaren Text" }, { status: 400 });
    }

    // Truncate to avoid token limits (old reports can be very long)
    const truncated = docText.length > 40000 ? docText.slice(0, 40000) + "\n...[gekürzt]" : docText;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `${PROMPT}\n\n--- BEGEHUNGSBERICHT TEXT ---\n${truncated}`,
        },
      ],
    });
    recordUsage({ feature: "inspection-doc-extract", model: message.model, usage: message.usage }).catch(() => {});

    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ error: "Keine Antwort von der KI" }, { status: 500 });
    }

    const rawText = textContent.text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "KI-Antwort konnte nicht verarbeitet werden" }, { status: 500 });
    }

    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      const repaired = jsonrepair(jsonMatch[0]);
      result = JSON.parse(repaired);
    }
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Doc extraction error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("credit balance") || msg.includes("billing")) {
      return NextResponse.json({ error: "KI-Guthaben aufgebraucht. Bitte unter console.anthropic.com Guthaben aufladen." }, { status: 402 });
    }
    return NextResponse.json({ error: `Fehler: ${msg}` }, { status: 500 });
  }
}
