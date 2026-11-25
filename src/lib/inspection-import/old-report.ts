import { execFile } from "child_process";
import { promisify } from "util";
import { basename } from "path";
import { findOldReport } from "@/lib/docx/inspection-report-ai";

const execFileAsync = promisify(execFile);

export interface OldReport {
  fileName: string;
  text: string;
}

/** Plain text of a .doc (antiword) or .docx (document.xml without tags). */
async function readReportText(filePath: string): Promise<string> {
  if (filePath.toLowerCase().endsWith(".docx")) {
    const { stdout } = await execFileAsync("unzip", ["-p", filePath, "word/document.xml"], {
      maxBuffer: 20 * 1024 * 1024,
    });
    return stdout
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"');
  }
  const { stdout } = await execFileAsync("antiword", [filePath], { maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}

/** Finds last year's report for the company (by file name) and returns its text, or null. */
export async function loadOldReport(companyName: string): Promise<OldReport | null> {
  const path = await findOldReport(companyName);
  if (!path) return null;
  try {
    const text = (await readReportText(path))
      .replace(/[ \t]+/g, " ")
      .replace(/\|\s*\|/g, "|")
      .replace(/\n\s*\n+/g, "\n")
      .trim();
    if (!text) return null;
    return { fileName: basename(path), text };
  } catch (error) {
    console.error("Alter Bericht konnte nicht gelesen werden:", error);
    return null;
  }
}
