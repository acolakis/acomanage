/**
 * Convert data to CSV with UTF-8 BOM for Excel compatibility.
 */
export function toCSV(
  headers: { key: string; label: string }[],
  rows: Record<string, unknown>[]
): Buffer {
  const BOM = "\uFEFF";
  const separator = ";"; // German Excel default

  const headerLine = headers.map((h) => escapeCSV(h.label)).join(separator);

  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h.key];
        if (val === null || val === undefined) return "";
        if (val instanceof Date) return val.toLocaleDateString("de-DE");
        if (Array.isArray(val)) return escapeCSV(val.join(", "));
        return escapeCSV(String(val));
      })
      .join(separator)
  );

  const csv = BOM + [headerLine, ...dataLines].join("\r\n");
  return Buffer.from(csv, "utf-8");
}

function escapeCSV(value: string): string {
  if (
    value.includes('"') ||
    value.includes(";") ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
