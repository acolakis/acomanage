import { randomUUID } from "crypto";
import { describeAiError } from "./client";

/**
 * Background jobs for the GoodNotes import. Transcription and analysis take minutes, but
 * Cloudflare (in front of acomanage.aco-as.de) cuts every request after 100 s. So the routes
 * start a job and return its id at once; the page polls /api/inspection-import/jobs/[id].
 *
 * Kept in memory of the single `next start` process (on globalThis, so all route bundles
 * share it). A restart loses running jobs; the page then shows an error and can retry.
 */

export type JobState =
  | { status: "running"; userId: string; startedAt: number }
  | { status: "done"; userId: string; startedAt: number; result: unknown }
  | { status: "error"; userId: string; startedAt: number; error: string };

const MAX_AGE_MS = 60 * 60 * 1000;

const store = ((globalThis as { __inspectionImportJobs?: Map<string, JobState> }).__inspectionImportJobs ??=
  new Map<string, JobState>());

function cleanup() {
  const now = Date.now();
  store.forEach((job, id) => {
    if (now - job.startedAt > MAX_AGE_MS) store.delete(id);
  });
}

export function startJob(userId: string, label: string, work: () => Promise<unknown>): string {
  cleanup();
  const id = randomUUID();
  const startedAt = Date.now();
  store.set(id, { status: "running", userId, startedAt });
  work()
    .then((result) => store.set(id, { status: "done", userId, startedAt, result }))
    .catch((error) => {
      console.error(`${label} error:`, error);
      store.set(id, { status: "error", userId, startedAt, error: describeAiError(error).message });
    });
  return id;
}

export function getJob(id: string): JobState | undefined {
  return store.get(id);
}
