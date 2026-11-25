// ===== Shared Types =====

export interface PersonInfo {
  name: string;
  position?: string;
  qualifications?: string;
  department?: string;
}

export interface SignatureInfo {
  signerName: string;
  signerRole: string;
}

// ===== Supported Category Codes =====

export const DIGITAL_CATEGORIES = [
  // Unterweisungsnachweise
  "G01", "G05", "G06", "IJ07", "S02_EVAK", "PQ02_UW",
  // Bestellungsurkunden
  "B01", "B01_AUSWEIS", "S02", "W01", "A04",
  // Beauftragungen
  "A02", "A03",
  // Aushänge / Sonderdokumente
  "A01", "S03", "S06", "TV01",
  // Informationsschreiben
  "G01_INFO", "PQ01",
] as const;

export type DigitalCategoryCode = (typeof DIGITAL_CATEGORIES)[number];

// ===== Category Metadata =====

export const CATEGORY_META: Record<string, { label: string; group: string }> = {
  G01: { label: "Unterweisungsnachweis — Erstinformation neue MA", group: "Unterweisungsnachweise" },
  G05: { label: "Unterweisungsnachweis — Maschinenerstunterweisung", group: "Unterweisungsnachweise" },
  G06: { label: "Unterweisungsnachweis — Anlassbezogene Unterweisung", group: "Unterweisungsnachweise" },
  IJ07: { label: "Unterweisungsnachweis — Gefahrstofferstunterweisung", group: "Unterweisungsnachweise" },
  S02_EVAK: { label: "Unterweisungsnachweis — Evakuierungsübung", group: "Unterweisungsnachweise" },
  PQ02_UW: { label: "Unterweisungsnachweis — Fremdfirmen", group: "Unterweisungsnachweise" },
  B01: { label: "Bestellungsurkunde — Fachkraft für Arbeitssicherheit", group: "Bestellungsurkunden" },
  B01_AUSWEIS: { label: "Sicherheitsausweis — SIFA", group: "Bestellungsurkunden" },
  S02: { label: "Bestellungsurkunde — Brandschutzhelfer", group: "Bestellungsurkunden" },
  W01: { label: "Bestellungsurkunde — Ersthelfer", group: "Bestellungsurkunden" },
  A04: { label: "Bestellungsurkunde — Befähigte Person", group: "Bestellungsurkunden" },
  A02: { label: "Übertragung der Unternehmerpflichten", group: "Beauftragungen" },
  A03: { label: "Beauftragung zum Führen von Fahrzeugen", group: "Beauftragungen" },
  A01: { label: "Grundsatzerklärung zum Arbeitsschutz", group: "Aushänge" },
  S03: { label: "Brandschutzordnung", group: "Aushänge" },
  S06: { label: "Feuererlaubnisschein", group: "Formulare" },
  TV01: { label: "Aushang — Verhalten bei Unfällen", group: "Aushänge" },
  G01_INFO: { label: "Arbeitsschutzerstinformation — Neue MA / Praktikanten", group: "Informationsschreiben" },
  PQ01: { label: "Fremdfirmen — Anforderung + Information", group: "Informationsschreiben" },
};

// ===== Pattern 1: Unterweisungsnachweis =====

export interface UnterweisungsnachweisTopic {
  label: string;
  checked: boolean;
}

export interface UnterweisungsnachweisFormData {
  // Meta
  unterweisendeFirma: string;
  unterweisendeFirmaAdresse: string;
  abteilung: string;
  rechtsgrundlage: string;
  datum: string;
  ort: string;
  unterweisenderName: string;
  unterweisenderPosition: string;
  // Content (varies by category)
  inhaltTitel: string;
  inhaltText: string;
  topics: UnterweisungsnachweisTopic[];
  // For G05/IJ07: specific items
  spezifischeItems: string[];
  personName?: string; // "Herr/Frau ___ wurde an ..." for G05/IJ07
  // Participants
  participants: Array<{ name: string; department?: string }>;
  // Next
  geplanteThemen?: string;
  naechsterTermin?: string;
}

// ===== Pattern 2: Bestellungsurkunde =====

export interface BestellungsurkundeFormData {
  // Common
  person: PersonInfo;
  datum: string;
  rechtsgrundlage: string;
  // B01-specific
  sifaBuero?: string;
  sifaBueroAdresse?: string;
  sifaTelefon?: string;
  sifaMobil?: string;
  einsatzstunden?: string;
  startDatum?: string;
  // A04-specific
  pruefgegenstand?: string; // "Leitern" oder "Regale"
  pruefintervall?: string;
  pflichten: string[];
  // S02-specific (Brandschutzhelfer has standard duties)
  // W01-specific (Ersthelfer includes DGUV text)
}

// ===== Pattern 2b: B01 Sicherheitsausweis =====

export interface B01AusweisFormData {
  sifaName: string;
  sifaTelefon: string;
  sifaMobil: string;
  sifaBuero: string;
  sifaBueroAdresse: string;
  datum: string;
}

// ===== Pattern 3a: A02 Pflichtenübertragung =====

export interface A02FormData {
  person: PersonInfo;
  personAbteilung: string;
  personRolle: string;
  firmenNamen: string; // Can span multiple companies
  datum: string;
  pflichten: string[];
  betragslimit?: string;
  // Zusatz zum Arbeitsvertrag
  zusatzRolle: string; // e.g. "Stellv. Leiter der Technik"
}

// ===== Pattern 3b: A03 Beauftragung Fahrzeuge =====

export interface A03FormData {
  // Personalien
  person: PersonInfo;
  geburtsdatum?: string;
  // Führerschein
  fuehrerscheinKlasse: string;
  fuehrerscheinNummer?: string;
  fuehrerscheinDatum?: string;
  // Fahrzeugtypen (Checkboxen)
  fahrzeugtypen: {
    schubmaststapler: boolean;
    gabelstapler: boolean;
    hubarbeitsbuehne: boolean;
    mitgaenger: boolean;
    innerbetrieblich: boolean;
    beschraenktOeffentlich: boolean;
    oeffentlich: boolean;
  };
  datum: string;
  produktionsleiter: string;
  // Führerscheinkontrolle
  kontrollen: Array<{ datum: string; bemerkung?: string }>;
}

// ===== Pattern 4: A01 Grundsatzerklärung =====

export interface A01FormData {
  datum: string;
  leitsaetze: string[];
  geschaeftsfuehrer: string;
}

// ===== Pattern 4: S03 Brandschutzordnung =====

export interface S03FormData {
  // Teil A is standard DIN 14096 — no custom fields needed
  // Teil C: Alarmplan
  kontakte: Array<{
    rolle: string;
    name: string;
    telefon: string;
    durchwahl?: string;
  }>;
  externeKontakte: Array<{
    stelle: string;
    telefon: string;
  }>;
  alarmierungsText: string;
}

// ===== Pattern 4: TV01 Aushang =====

export interface TV01FormData {
  // Kontakte
  sicherheitsbeauftragte: string;
  ersthelfer: string[];
  sifa: { name: string; mobil: string; adresse: string; telefon: string };
  durchgangsarzt: { name: string; adresse: string; telefon: string };
  betriebsarzt: { name: string; adresse: string; telefon: string };
  berufsgenossenschaft: { name: string; adresse: string; telefon: string };
  arbeitsschutzbehoerde: { name: string; adresse: string; telefon: string };
  // Unfallmeldung contacts
  unfallMeldungKontakte: Array<{ name: string; telefon: string }>;
  datum: string;
}

// ===== Pattern 5: S06 Feuererlaubnisschein =====

export interface S06FormData {
  ausfuehrender: string;
  ausfuehrendeFirma?: string;
  datum: string;
  arbeitsort: string;
  arbeitsauftrag: string;
  massnahmenVor: Array<{ label: string; checked: boolean }>;
  massnahmenWaehrend: Array<{ label: string; checked: boolean }>;
  massnahmenNach: Array<{ label: string; checked: boolean }>;
  brandwacheStunden?: string;
  aufsichtsfuehrender: string;
}

// ===== Pattern 5: G01_INFO =====

export interface G01InfoFormData {
  themenBloecke: Array<{
    titel: string;
    inhalt: string[];
  }>;
  sifaBuero: string;
  geschaeftsfuehrer: string;
}

// ===== Pattern 5: PQ01 =====

export interface PQ01FormData {
  datum: string;
  fristTage: number;
  anforderungen: Array<{
    titel: string;
    beschreibung: string;
  }>;
  regeln: string[];
  geschaeftsfuehrer: string;
}

// ===== Union Type =====

export type DigitalDocumentFormData =
  | UnterweisungsnachweisFormData
  | BestellungsurkundeFormData
  | B01AusweisFormData
  | A02FormData
  | A03FormData
  | A01FormData
  | S03FormData
  | TV01FormData
  | S06FormData
  | G01InfoFormData
  | PQ01FormData;
