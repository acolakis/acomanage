import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || "",
});

export interface SdsExtractionResult {
  substanceName: string;
  manufacturer: string | null;
  casNumber: string | null;
  ghsPictograms: string[];
  signalWord: string | null;
  hStatements: string[];
  pStatements: string[];
  hazards: {
    physicalHazards: string[];
    healthHazards: string[];
    environmentalHazards: string[];
  };
  protectiveMeasures: {
    eyeProtection: string;
    handProtection: string;
    skinProtection: string;
    respiratoryProtection: string;
    generalMeasures: string;
  };
  firstAid: {
    inhalation: string;
    skinContact: string;
    eyeContact: string;
    ingestion: string;
    generalNotes: string;
  };
  emergencyBehavior: {
    fireExtinguishing: string;
    spillCleanup: string;
    personalPrecautions: string;
  };
  disposal: {
    wasteCode: string;
    disposalMethod: string;
  };
  storage: {
    conditions: string;
    incompatibleMaterials: string;
  };
  confidenceScore: number;
}

const EXTRACTION_PROMPT = `Du bist ein Experte für Sicherheitsdatenblätter (SDB/SDS) nach GHS/CLP-Verordnung.

Analysiere das folgende Sicherheitsdatenblatt und extrahiere strukturiert die folgenden Informationen.
Antworte ausschließlich im folgenden JSON-Format, ohne zusätzlichen Text:

{
  "substanceName": "Handelsname des Produkts",
  "manufacturer": "Herstellername",
  "casNumber": "CAS-Nummer oder null",
  "ghsPictograms": ["GHS02", "GHS07"],
  "signalWord": "Gefahr" oder "Achtung" oder null,
  "hStatements": ["H225", "H319"],
  "pStatements": ["P210", "P233"],
  "hazards": {
    "physicalHazards": ["Beschreibung physikalischer Gefahren"],
    "healthHazards": ["Beschreibung gesundheitlicher Gefahren"],
    "environmentalHazards": ["Beschreibung Umweltgefahren"]
  },
  "protectiveMeasures": {
    "eyeProtection": "Art des Augenschutzes",
    "handProtection": "Art der Handschuhe inkl. Material und Durchbruchzeit",
    "skinProtection": "Schutzkleidung",
    "respiratoryProtection": "Atemschutz wenn nötig",
    "generalMeasures": "Allgemeine Schutzmaßnahmen"
  },
  "firstAid": {
    "inhalation": "Maßnahmen bei Einatmen",
    "skinContact": "Maßnahmen bei Hautkontakt",
    "eyeContact": "Maßnahmen bei Augenkontakt",
    "ingestion": "Maßnahmen bei Verschlucken",
    "generalNotes": "Allgemeine Hinweise"
  },
  "emergencyBehavior": {
    "fireExtinguishing": "Geeignete Löschmittel",
    "spillCleanup": "Maßnahmen bei Freisetzung",
    "personalPrecautions": "Persönliche Vorsichtsmaßnahmen"
  },
  "disposal": {
    "wasteCode": "Abfallschlüssel",
    "disposalMethod": "Entsorgungshinweise"
  },
  "storage": {
    "conditions": "Lagerbedingungen",
    "incompatibleMaterials": "Unverträgliche Materialien"
  },
  "confidenceScore": 0.95
}

GHS-Piktogramme müssen im Format "GHS01" bis "GHS09" sein.
H-Sätze im Format "H200" etc., P-Sätze im Format "P200" etc.
Das Signalwort ist "Gefahr" oder "Achtung" (deutsch).
confidenceScore: 0-1, wie sicher du dir bei der Extraktion bist.
Wenn Informationen nicht im SDB zu finden sind, verwende leere Strings oder leere Arrays.`;

export async function extractFromSds(
  filePath: string
): Promise<SdsExtractionResult> {
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

  // Extract the text content
  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Keine Textantwort von der KI erhalten");
  }

  // Parse the JSON response
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Konnte keine JSON-Daten aus der KI-Antwort extrahieren");
  }

  const result: SdsExtractionResult = JSON.parse(jsonMatch[0]);
  return result;
}
