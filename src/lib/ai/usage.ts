import { prisma } from "@/lib/prisma";

/**
 * Cost tracking for every Claude API call. Prices are Anthropic first-party list prices in
 * USD per million tokens (as of 2026-11). Cache writes (5-minute TTL) cost 1.25× input,
 * cache reads a model-specific fraction of input.
 */
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
  "claude-sonnet-4-6": { input: 3, output: 15, cacheRead: 0.3 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
};

export type AiFeature =
  | "import-transcribe"
  | "import-analyze"
  | "word-export"
  | "word-dedupe"
  | "sds-extract"
  | "manual-extract"
  | "inspection-doc-extract";

/** The usage fields of a Messages API response that matter for billing. */
export interface UsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function costOf(model: string, usage: UsageLike): number {
  const p = PRICES[model] ?? PRICES["claude-opus-5-5"];
  const write = usage.cache_creation_input_tokens ?? 0;
  const read = usage.cache_read_input_tokens ?? 0;
  return (
    (usage.input_tokens * p.input + write * p.input * 1.25 + read * p.cacheRead + usage.output_tokens * p.output) /
    1_000_000
  );
}

/**
 * Stores one call and returns its cost in USD. Never throws – cost tracking must not break the
 * feature that made the call.
 */
export async function recordUsage(params: {
  feature: AiFeature;
  model: string;
  usage: UsageLike;
  inspectionId?: string | null;
  companyId?: string | null;
  runId?: string | null;
}): Promise<number> {
  const cost = costOf(params.model, params.usage);
  try {
    await prisma.aiUsage.create({
      data: {
        feature: params.feature,
        model: params.model,
        inspectionId: params.inspectionId ?? null,
        companyId: params.companyId ?? null,
        runId: params.runId ?? null,
        inputTokens: params.usage.input_tokens,
        outputTokens: params.usage.output_tokens,
        cacheReadTokens: params.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: params.usage.cache_creation_input_tokens ?? 0,
        costUsd: cost,
      },
    });
  } catch (error) {
    console.error("KI-Kosten konnten nicht gespeichert werden:", error);
  }
  return cost;
}

export const formatUsd = (usd: number) =>
  `${usd.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
