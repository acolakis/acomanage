import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || "",
});

export interface ManualExtractionResult {
  machineName: string;
  manufacturer: string | null;
  modelType: string | null;
  scope: {
    intendedUse: string;
    limitations: string;
  };
  hazards: {
    mechanicalHazards: string[];
    electricalHazards: string[];
    thermalHazards: string[];
    noiseHazards: string[];
    otherHazards: string[];
  };
  protectiveMeasures: {
    ppe: string[];
    safetyDevices: string;
    warnings: string[];
    operatingInstructions: string[];
  };
  malfunctions: {
    commonIssues: string[];
    emergencyProcedures: string;
    emergencyStop: string;
  };
  firstAid: {
    generalMeasures: string;
    specificInstructions: string[];
  };
  maintenance: {
    dailyChecks: string[];
    periodicMaintenance: string[];
    maintenanceIntervals: string;
  };
  confidenceScore: number;
}

const EXTRACTION_PROMPT = `Du bist ein Experte für Maschinensicherheit und Betriebsanweisungen nach BetrSichV und DIN EN ISO 12100.

Analysiere das folgende Maschinenhandbuch/Betriebsanleitung und extrahiere strukturiert die Informationen für eine Betriebsanweisung.
Antworte ausschließlich im folgenden JSON-Format, ohne zusätzlichen Text:

{
  "machineName": "Bezeichnung der Maschine",
  "manufacturer": "Herstellername",
  "modelType": "Modell / Typ",
  "scope": {
    "intendedUse": "Bestimmungsgemäße Verwendung",
    "limitations": "Einschränkungen und verbotene Verwendung"
  },
  "hazards": {
    "mechanicalHazards": ["Quetschen", "Schneiden", "Einziehen"],
    "electricalHazards": ["Elektrischer Schlag", "Lichtbogen"],
    "thermalHazards": ["Heiße Oberflächen", "Verbrennungsgefahr"],
    "noiseHazards": ["Lärmpegel > 85 dB(A)"],
    "otherHazards": ["Staubentwicklung", "Vibration"]
  },
  "protectiveMeasures": {
    "ppe": ["Schutzbrille", "Gehörschutz", "Sicherheitsschuhe"],
    "safetyDevices": "Beschreibung der Schutzeinrichtungen",
    "warnings": ["Warnhinweis 1", "Warnhinweis 2"],
    "operatingInstructions": ["Schritt 1", "Schritt 2"]
  },
  "malfunctions": {
    "commonIssues": ["Problem 1 und Lösung", "Problem 2 und Lösung"],
    "emergencyProcedures": "Verhalten bei Störungen",
    "emergencyStop": "NOT-AUS Beschreibung"
  },
  "firstAid": {
    "generalMeasures": "Allgemeine Erste-Hilfe-Maßnahmen",
    "specificInstructions": ["Bei Schnittwunden...", "Bei Verbrennungen..."]
  },
  "maintenance": {
    "dailyChecks": ["Sichtprüfung", "Funktionsprüfung Schutzeinrichtungen"],
    "periodicMaintenance": ["Wöchentlich: ...", "Monatlich: ...", "Jährlich: ..."],
    "maintenanceIntervals": "Zusammenfassung der Wartungsintervalle"
  },
  "confidenceScore": 0.85
}

Wichtig:
- Alle Texte auf Deutsch.
- Wenn Informationen nicht im Handbuch zu finden sind, verwende leere Strings oder leere Arrays.
- confidenceScore: 0-1, wie vollständig die Extraktion ist.
- Fokussiere auf sicherheitsrelevante Informationen für die Betriebsanweisung.`;

export async function extractFromManual(
  filePath: string
): Promise<ManualExtractionResult> {
  const fullPath = filePath.startsWith("/")
    ? filePath
    : `${process.cwd()}/${filePath}`;

  const fileBuffer = fs.readFileSync(fullPath);
  const base64 = fileBuffer.toString("base64");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Keine Textantwort von der KI erhalten");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Konnte keine JSON-Daten aus der KI-Antwort extrahieren");
  }

  const result: ManualExtractionResult = JSON.parse(jsonMatch[0]);
  return result;
}
