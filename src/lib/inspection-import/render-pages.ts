import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execFileAsync = promisify(execFile);

/**
 * Renders every PDF page to a JPEG image (150 dpi) with poppler's pdftoppm.
 *
 * GoodNotes/macOS exports embed an automatic handwriting-OCR text layer that is
 * frequently wrong ("Stapher 10/16" instead of "Stapler 10/26"). Sending only
 * rendered images forces the model to read the actual handwriting and also keeps
 * large exports (50+ MB) under the API request limit.
 */
export async function renderPdfPages(pdf: Buffer): Promise<string[]> {
  const dir = await mkdtemp(join(tmpdir(), "begehung-import-"));
  try {
    const pdfPath = join(dir, "input.pdf");
    await writeFile(pdfPath, pdf);
    await execFileAsync(
      "pdftoppm",
      ["-r", "150", "-jpeg", "-jpegopt", "quality=85", pdfPath, join(dir, "p")],
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }
    );
    const files = (await readdir(dir)).filter((f) => f.endsWith(".jpg")).sort();
    if (files.length === 0) throw new Error("PDF enthält keine lesbaren Seiten");
    return Promise.all(
      files.map(async (f) => (await readFile(join(dir, f))).toString("base64"))
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
