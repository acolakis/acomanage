import JSZip from "jszip";

interface ReplacementRule {
  search: string;
  replace: string;
}

// XML files within a .docx that may contain text content
const DOCX_XML_PARTS = [
  "word/document.xml",
  "word/header1.xml",
  "word/header2.xml",
  "word/header3.xml",
  "word/footer1.xml",
  "word/footer2.xml",
  "word/footer3.xml",
  "word/footnotes.xml",
  "word/endnotes.xml",
];

/**
 * Performs text replacement in a .docx file.
 *
 * DOCX files are ZIP archives containing XML. Text may be split across
 * multiple <w:r> (run) elements due to formatting changes, spell-check marks,
 * or revision tracking. This function handles both simple cases (text in a
 * single <w:t> tag) and split cases by merging adjacent runs when needed.
 *
 * @param buffer - The original .docx file as a Buffer
 * @param replacements - Array of search/replace pairs
 * @returns The personalized .docx file as a Buffer
 */
export async function personalizeDocx(
  buffer: Buffer,
  replacements: ReplacementRule[]
): Promise<Buffer> {
  if (replacements.length === 0) return buffer;

  const zip = await JSZip.loadAsync(buffer);

  for (const partName of DOCX_XML_PARTS) {
    const file = zip.file(partName);
    if (!file) continue;

    let xml = await file.async("string");
    let modified = false;

    for (const { search, replace } of replacements) {
      if (!search) continue;

      // First try simple replacement within <w:t> tags
      if (xml.includes(search)) {
        xml = xml.split(search).join(replace);
        modified = true;
        continue;
      }

      // Handle split runs: Word sometimes splits a word across multiple <w:t> tags
      // e.g. <w:t>Franken</w:t></w:r><w:r ...><w:t>berg</w:t>
      // Strategy: extract all text from consecutive runs, check for match,
      // and consolidate if found
      xml = mergeSplitRuns(xml, search, replace);
      if (xml.includes(replace)) {
        modified = true;
      }
    }

    if (modified) {
      zip.file(partName, xml);
    }
  }

  const result = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return Buffer.from(result);
}

/**
 * Handles the case where a search term is split across multiple <w:r> (run) elements.
 * Finds paragraphs containing the search text split across runs and merges them.
 */
function mergeSplitRuns(
  xml: string,
  search: string,
  replace: string
): string {
  // Extract all <w:p> paragraphs
  const paragraphRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let match;

  while ((match = paragraphRegex.exec(xml)) !== null) {
    const paragraph = match[0];

    // Extract text from all <w:t> tags in this paragraph
    const textParts: string[] = [];
    const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(paragraph)) !== null) {
      textParts.push(tMatch[1]);
    }

    const fullText = textParts.join("");
    if (!fullText.includes(search)) continue;

    // This paragraph contains the search term split across runs
    // Strategy: Find the <w:t> tags and merge the text, then do replacement
    let newParagraph = paragraph;
    let accumulated = "";
    const runTexts: { fullMatch: string; text: string; index: number }[] = [];

    const tRegex2 = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let tMatch2;
    while ((tMatch2 = tRegex2.exec(paragraph)) !== null) {
      runTexts.push({
        fullMatch: tMatch2[0],
        text: tMatch2[1],
        index: tMatch2.index,
      });
    }

    // Try to find which consecutive runs contain the search term
    for (let i = 0; i < runTexts.length; i++) {
      accumulated = "";
      for (let j = i; j < runTexts.length; j++) {
        accumulated += runTexts[j].text;
        if (accumulated.includes(search)) {
          // Found! Replace text in first run, clear subsequent runs
          const replaced = accumulated.split(search).join(replace);
          // Update first run's text
          const firstTag = runTexts[i].fullMatch;
          const newFirstTag = firstTag.replace(
            `>${runTexts[i].text}<`,
            `>${replaced}<`
          );
          newParagraph = newParagraph.replace(firstTag, newFirstTag);

          // Clear text in subsequent runs (i+1 to j)
          for (let k = i + 1; k <= j; k++) {
            const tag = runTexts[k].fullMatch;
            const emptyTag = tag.replace(`>${runTexts[k].text}<`, `><`);
            newParagraph = newParagraph.replace(tag, emptyTag);
          }
          break;
        }
      }
      if (accumulated.includes(search)) break;
    }

    xml = xml.replace(paragraph, newParagraph);
  }

  return xml;
}

/**
 * Checks if a file is a .docx file based on extension.
 */
export function isDocxFile(fileType: string | null): boolean {
  return fileType === "docx";
}

interface SourceTemplateData {
  companyName: string;
  street: string;
  zip: string;
  city: string;
  geschaeftsfuehrer: string;
  produktionsleiter: string;
  technischerLeiter: string;
}

interface TargetCompanyData {
  name: string;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  contactName?: string | null;
}

/**
 * Builds replacement rules from source template data and target company data.
 * Rules are sorted by search string length (longest first) to prevent partial matches.
 */
export function buildReplacementRules(
  source: SourceTemplateData,
  target: TargetCompanyData
): ReplacementRule[] {
  const rules: ReplacementRule[] = [];

  // Company name
  if (source.companyName && target.name) {
    rules.push({ search: source.companyName, replace: target.name });
  }

  // Full address: "Straße, PLZ Stadt"
  if (source.street && source.zip && source.city) {
    const targetParts = [
      target.street,
      [target.zip, target.city].filter(Boolean).join(" "),
    ].filter(Boolean);
    if (targetParts.length > 0) {
      rules.push({
        search: `${source.street}, ${source.zip} ${source.city}`,
        replace: targetParts.join(", "),
      });
    }
  }

  // Street alone
  if (source.street && target.street) {
    rules.push({ search: source.street, replace: target.street });
  }

  // ZIP + City combined
  if (source.zip && source.city && target.zip && target.city) {
    rules.push({
      search: `${source.zip} ${source.city}`,
      replace: `${target.zip} ${target.city}`,
    });
  }

  // Geschäftsführer → contactName
  if (source.geschaeftsfuehrer && target.contactName) {
    rules.push({ search: source.geschaeftsfuehrer, replace: target.contactName });
  }

  // Produktionsleiter → contactName
  if (source.produktionsleiter && target.contactName) {
    rules.push({ search: source.produktionsleiter, replace: target.contactName });
  }

  // Technischer Leiter → contactName
  if (source.technischerLeiter && target.contactName) {
    rules.push({ search: source.technischerLeiter, replace: target.contactName });
  }

  // Sort by search length descending to prevent partial matches
  rules.sort((a, b) => b.search.length - a.search.length);

  return rules;
}
