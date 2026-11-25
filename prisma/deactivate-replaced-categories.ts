/**
 * Deactivates document categories that are now replaced by:
 * 1. Digital document system (19 document types)
 * 2. Other dedicated modules (Begehungen, Schulungen, Gefahrstoffe, GBU, Vorfälle, Kennzahlen)
 *
 * Run with: npx tsx prisma/deactivate-replaced-categories.ts
 */

import pg from "pg";

const pool = new pg.Pool({
  connectionString: "postgresql://acomanage:acomanage_secret@localhost:5432/acomanage",
});

// Categories replaced by the digital document system
const DIGITAL_REPLACED = [
  "A01", // Grundsatzerklärung → A01 digital
  "A02", // Unternehmerpflichten → A02 digital
  "A03", // Beauftragung Fahrzeuge → A03 digital
  "A04", // Befähigte Person → A04 digital
  "B01", // Bestellungsurkunde SIFA → B01 + B01_AUSWEIS digital
  "G01", // Erstinformation neue MA → G01 + G01_INFO digital
  "G05", // Maschinenerstunterweisung → G05 digital
  "G06", // Anlassbez. Unterweisung → G06 digital
  "IJ07", // Einzelunterweisung Gefahrstoffe → IJ07 digital
  "PQ01", // Fremdfirmen Unfallverhütung → PQ01 digital
  "PQ02", // Fremdfirmeninformation → PQ02_UW digital
  "S02",  // Brandschutzhelfer → S02 + S02_EVAK digital
  "S03",  // Brandschutzordnung → S03 digital
  "S06",  // Feuererlaubnisschein → S06 digital
  "TV01", // Aushang Unfallverhalten → TV01 digital
  "W01",  // Ersthelfer → W01 digital
];

// Categories replaced by dedicated modules
const MODULE_REPLACED = [
  "E01",  // Begehungsbericht SIFA → /begehungen Modul
  "G02",  // Jährl. Unterweisung → /schulungen Modul
  "G03",  // Unterweisung Höhenarbeit → /schulungen Modul
  "G04",  // Fortbildung Staplerfahrer → /schulungen Modul
  "S04",  // Brandschutzunterweisung → /schulungen Modul
  "IJ01", // Gefahrstofferfassung → /gefahrstoffe Modul
  "IJ02", // Gefahrstoffkataster → /gefahrstoffe Modul
  "IJ06", // Gefahrstoff-GB → /gefaehrdungsbeurteilungen Modul
  "K01",  // Gefährdungsbeurteilung → /gefaehrdungsbeurteilungen Modul
  "K02",  // Wirksamkeitskontrolle → /massnahmen Modul
  "TV02", // Unfallaufnahme → /vorfaelle Modul
  "TV03", // Unfallstatistik → /kennzahlen Modul
];

async function main() {
  const allCodes = [...DIGITAL_REPLACED, ...MODULE_REPLACED];

  console.log(`Deactivating ${allCodes.length} document categories...`);
  console.log("");
  console.log("Replaced by digital documents:", DIGITAL_REPLACED.join(", "));
  console.log("Replaced by modules:", MODULE_REPLACED.join(", "));
  console.log("");

  const result = await pool.query(
    `UPDATE document_categories SET is_active = false WHERE code = ANY($1::text[]) RETURNING code, name`,
    [allCodes]
  );

  console.log(`Deactivated ${result.rowCount} categories:`);
  for (const row of result.rows) {
    console.log(`  - ${row.code}: ${row.name}`);
  }

  // Show remaining active categories
  const remaining = await pool.query(
    `SELECT code, name FROM document_categories WHERE is_active = true ORDER BY sort_order`
  );

  console.log(`\nRemaining active categories (${remaining.rowCount}):`);
  for (const row of remaining.rows) {
    console.log(`  - ${row.code}: ${row.name}`);
  }

  await pool.end();
}

main().catch(console.error);
