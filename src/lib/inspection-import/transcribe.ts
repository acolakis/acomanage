import Anthropic from "@anthropic-ai/sdk";
import { IMPORT_MODEL, anthropic } from "./client";
import { recordUsage } from "@/lib/ai/usage";

const PAGES_PER_REQUEST = 4;

const TRANSCRIBE_PROMPT = `Dies sind Seiten eines Begehungsprotokolls (Arbeitsschutz), in GoodNotes handschriftlich ausgefüllt.

Schreibe jede Seite vollständig ab. Gliedere nach "## Seite N" (N = die oben angegebene Seitennummer).
- Handschriftliche Notizen: zeilengenau wörtlich abschreiben, inkl. aller Daten (z.B. 10/26, 20.07.2026).
- Formularseiten: für jeden Punkt Code (z.B. A 01) und Titel, dann was eingekreist ist (JA / NEIN / nichts), und alle handschriftlichen Einträge (Daten, Namen, Bemerkungen), jeweils mit dem Feld, in dem sie stehen. Nutze dafür eine Tabelle | Code | Titel | Eingekreist | Handschriftliche Einträge |.
- Gestrichene Punkte (ganzer Punkt durchgestrichen) als [durchgestrichen] kennzeichnen, geschwärzte oder durchgestrichene Texte als [durchgestrichen: ...].
- Unsichere Lesungen mit [?] markieren, Alternativen in Klammern angeben.
Nichts interpretieren oder zusammenfassen, nur abschreiben. Keine Einleitung, kein Schlusssatz.`;

async function transcribeChunk(pages: string[], startIndex: number, runId: string): Promise<{ text: string; cost: number }> {
  const content: Anthropic.ContentBlockParam[] = [];
  pages.forEach((data, i) => {
    content.push({ type: "text", text: `Seite ${startIndex + i + 1}:` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
  });
  content.push({ type: "text", text: TRANSCRIBE_PROMPT });

  const message = await anthropic.messages
    .stream({
      model: IMPORT_MODEL,
      max_tokens: 32000,
      output_config: { effort: "high" },
      messages: [{ role: "user", content }],
    })
    .finalMessage();

  const cost = await recordUsage({ feature: "import-transcribe", model: IMPORT_MODEL, usage: message.usage, runId });
  if (message.stop_reason === "refusal") {
    throw new Error("Die KI hat die Abschrift abgelehnt");
  }
  const text = message.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();
  return { text, cost };
}

/**
 * Transcribes rendered page images verbatim (handwriting, circled JA/NEIN, dates).
 * Pages are processed in parallel chunks to keep the wait short.
 */
export async function transcribePages(pages: string[], runId: string): Promise<{ transcript: string; costUsd: number }> {
  const chunks: Promise<{ text: string; cost: number }>[] = [];
  for (let i = 0; i < pages.length; i += PAGES_PER_REQUEST) {
    chunks.push(transcribeChunk(pages.slice(i, i + PAGES_PER_REQUEST), i, runId));
  }
  const parts = await Promise.all(chunks);
  return {
    transcript: parts.map((p) => p.text).join("\n\n---\n\n"),
    costUsd: parts.reduce((sum, p) => sum + p.cost, 0),
  };
}
