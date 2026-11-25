import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY || "" });

/**
 * Model for the GoodNotes import. Tested 2026-11-25 on real exports: Sonnet 5.5
 * misread the handwritten notes page ("Rangierhilfe" for "Rauchabzug",
 * "Automtildine" for "Automatiktüre"), Opus 5.5 read them correctly.
 * Override with INSPECTION_IMPORT_MODEL if needed.
 */
export const IMPORT_MODEL = process.env.INSPECTION_IMPORT_MODEL || "claude-opus-5-5";

/** Maps SDK/API errors to a German user-facing message and HTTP status. */
export function describeAiError(error: unknown): { message: string; status: number } {
  if (error instanceof Anthropic.RateLimitError) {
    return { message: "KI momentan überlastet. Bitte in 1 Minute erneut versuchen.", status: 429 };
  }
  if (error instanceof Anthropic.APIError) {
    const msg = error.message || "";
    if (msg.includes("credit balance") || msg.includes("billing")) {
      return {
        message: "KI-Guthaben aufgebraucht. Bitte unter console.anthropic.com Guthaben aufladen.",
        status: 402,
      };
    }
    if (error.status === 529 || msg.includes("overloaded")) {
      return { message: "KI momentan überlastet. Bitte in 1 Minute erneut versuchen.", status: 503 };
    }
    return { message: `KI-Fehler: ${msg}`, status: 502 };
  }
  return { message: error instanceof Error ? error.message : String(error), status: 500 };
}
