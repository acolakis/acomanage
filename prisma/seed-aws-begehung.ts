import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type RiskLevel = 'NIEDRIG' | 'MITTEL' | 'HOCH' | 'KRITISCH';

interface Item { itemKey: string; label: string; description?: string; legalReference?: string; suggestedMeasure: string; defaultRiskLevel: RiskLevel; }
interface Section { sectionCode: string; title: string; items: Item[]; }

const TEMPLATE_NAME = 'AWS Begehungsvorlage (A00–XYZ03)';

const sections: Section[] = [
  {
    sectionCode: 'A_ORG',
    title: 'A – Organisation & Arbeitsschutzordner',
    items: [
      { itemKey: 'A00', label: 'Arbeitsschutzordner vorhanden', legalReference: 'ArbSchG', suggestedMeasure: 'Arbeitsschutzordner anlegen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'A00-INH', label: 'A00: Inhaltsverzeichnis aktuell', suggestedMeasure: 'Inhaltsverzeichnis aktualisieren', defaultRiskLevel: 'NIEDRIG' },
      { itemKey: 'A00-DECK', label: 'A00: Deckblätter aktuell', suggestedMeasure: 'Deckblätter aktualisieren', defaultRiskLevel: 'NIEDRIG' },
      { itemKey: 'A01', label: 'A01: Firmenorganigramm mit SIFA und Betriebsarzt', legalReference: 'ASiG § 3', suggestedMeasure: 'Organigramm erstellen / aktualisieren', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'A01B', label: 'A01B: Grundsatzerklärung zum Arbeitsschutz', legalReference: 'ArbSchG § 3', suggestedMeasure: 'Grundsatzerklärung erstellen und unterzeichnen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'A02B', label: 'A02B: Zusatz zum Arbeitsvertrag Leitungskraft / Vertrag als Leitungskraft', suggestedMeasure: 'Zusatz zum Arbeitsvertrag ausstellen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'A02', label: 'A02: Übertragung der Unternehmerpflichten (Name, Leitungsfunktion, Datum)', legalReference: 'ArbSchG § 13', suggestedMeasure: 'Unternehmerpflichten schriftlich übertragen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'A02X', label: 'A02X: Letzte Leitungskräfteunterweisung durch AWS', suggestedMeasure: 'Leitungskräfteunterweisung durchführen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'A02Z', label: 'A02Z: Info-Broschüre für Führungskräfte vorhanden', suggestedMeasure: 'Info-Broschüre beschaffen und verteilen', defaultRiskLevel: 'NIEDRIG' },
      { itemKey: 'STELL', label: 'Stellenbeschreibungen für alle Aufgabenbereiche', legalReference: 'ArbSchG § 3', suggestedMeasure: 'Stellenbeschreibungen erstellen', defaultRiskLevel: 'NIEDRIG' },
    ],
  },
  {
    sectionCode: 'A_BEAUF',
    title: 'A03/A04 – Beauftragungen',
    items: [
      { itemKey: 'A03', label: 'A03: Beauftragung zum Führen von Fahrzeugen mit Ladungssicherheit', legalReference: 'StVZO § 22', suggestedMeasure: 'Beauftragung ausstellen, Datum eintragen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'A03A', label: 'A03A: Beauftragung zum Arbeiten an Elektrofahrzeugen', legalReference: 'DGUV V3', suggestedMeasure: 'Beauftragung für E-Fahrzeuge ausstellen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'A03B', label: 'A03B: Beauftragung zum Arbeiten an Gasfahrzeugen', legalReference: 'BetrSichV', suggestedMeasure: 'Beauftragung für Gasfahrzeuge ausstellen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'A03C', label: 'A03C: Führerscheinkontrolle (Monat/Jahr)', suggestedMeasure: 'Führerscheinkontrolle durchführen und dokumentieren', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'A04', label: 'A04: Beauftragung befähigte Person Leitern (Name / Datum)', legalReference: 'DGUV R 100-002', suggestedMeasure: 'Befähigte Person für Leitern benennen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'A04B', label: 'A04B: Beauftragung befähigte Person Regale (Name / Datum)', legalReference: 'DIN EN 15635', suggestedMeasure: 'Befähigte Person für Regale benennen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'A04C', label: 'A04C: Beauftragung befähigte Person Gerüst (Name / Datum)', suggestedMeasure: 'Befähigte Person für Gerüste benennen', defaultRiskLevel: 'MITTEL' },
    ],
  },
  {
    sectionCode: 'B_SIFA',
    title: 'B / C/D – SIFA & Beratungsunterlagen',
    items: [
      { itemKey: 'B01', label: 'B01: Bestellungsurkunde der SIFA (Datum)', legalReference: 'ASiG § 5', suggestedMeasure: 'Bestellungsurkunde erneuern / korrigieren', defaultRiskLevel: 'HOCH' },
      { itemKey: 'B01B', label: 'B01B: Aktueller Fortbildungsnachweis der SIFA (Datum)', legalReference: 'ASiG § 5', suggestedMeasure: 'Fortbildungsnachweis beschaffen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'B01C', label: 'B01C: Sicherheitsausweis der SIFA (Datum)', suggestedMeasure: 'Sicherheitsausweis aktualisieren', defaultRiskLevel: 'NIEDRIG' },
      { itemKey: 'B01D', label: 'B01D: Aktuelle Mitarbeiterzahl (Stand Monat/Jahr)', suggestedMeasure: 'Mitarbeiterzahl aktualisieren', defaultRiskLevel: 'NIEDRIG' },
      { itemKey: 'CD01', label: 'C/D01: Arbeitsschutzberatungsplan der SIFA (Beratungszeitraum)', legalReference: 'ASiG § 6', suggestedMeasure: 'Beratungsplan erstellen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'CD01B', label: 'C/D01B: Arbeitsschutzberatungsabschlussbericht der SIFA', legalReference: 'ASiG § 6', suggestedMeasure: 'Abschlussbericht erstellen', defaultRiskLevel: 'MITTEL' },
    ],
  },
  {
    sectionCode: 'E_BEG',
    title: 'E – Begehungsunterlagen',
    items: [
      { itemKey: 'E01', label: 'E01: Begehungsbericht der SIFA (vorhanden, Datum)', legalReference: 'ASiG § 6', suggestedMeasure: 'Begehungsbericht erstellen und aushändigen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'E01B', label: 'E01B: Kenntnisnahme des Begehungsberichts', suggestedMeasure: 'Kenntnisnahme vom GF unterschreiben lassen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'E01C', label: 'E01C: Mängelbehebung aus vorherigem Bericht', suggestedMeasure: 'Offene Mängel abarbeiten und dokumentieren', defaultRiskLevel: 'HOCH' },
      { itemKey: 'E02', label: 'E02: Förderantrag zur Arbeitsschutzberatung durch FU (nur Erstberatung)', suggestedMeasure: 'Förderantrag bei FU einreichen', defaultRiskLevel: 'NIEDRIG' },
    ],
  },
  {
    sectionCode: 'F_GESETZE',
    title: 'F – Aushangpflichtige Gesetze',
    items: [
      { itemKey: 'F01', label: 'F01: Aushangpflichtige Gesetze (Datum)', legalReference: 'ArbSchG, ArbZG, MuSchG', suggestedMeasure: 'Aktuelle Gesetze beschaffen und aushängen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'F01B', label: 'F01B: DGUV Vorschrift 1 (Datum)', legalReference: 'DGUV V1', suggestedMeasure: 'DGUV V1 aktuell beschaffen', defaultRiskLevel: 'NIEDRIG' },
      { itemKey: 'F01C', label: 'F01C: DGUV Vorschrift 38 (Datum)', legalReference: 'DGUV V38', suggestedMeasure: 'DGUV V38 aktuell beschaffen', defaultRiskLevel: 'NIEDRIG' },
      { itemKey: 'F01D', label: 'F01D: Mutterschutzgesetz (Datum)', legalReference: 'MuSchG', suggestedMeasure: 'Aktuelles Mutterschutzgesetz aushängen', defaultRiskLevel: 'NIEDRIG' },
    ],
  },
  {
    sectionCode: 'G_UNTERW',
    title: 'G – Unterweisungen & Qualifikationen',
    items: [
      { itemKey: 'G01A', label: 'G01A: Arbeitsschutzerstinformation für neue MA/Praktikanten (Datum)', legalReference: 'ArbSchG § 12', suggestedMeasure: 'Erstinformation bei Einstellung durchführen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'G01B', label: 'G01B: Unterweisungsnachweis / letzte Unterweisung (Datum)', legalReference: 'ArbSchG § 12', suggestedMeasure: 'Unterweisungsnachweise vollständig sammeln', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'G02A', label: 'G02A: Jährl. Arbeitsschutzunterweisung gem. § 12 ArbSchG (Datum)', legalReference: 'ArbSchG § 12', suggestedMeasure: 'Jährliche Unterweisung planen und durchführen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'G02B', label: 'G02B: Unterweisung hochgelegener Arbeitsplatz (Datum)', legalReference: 'ASR A2.1', suggestedMeasure: 'Unterweisung für Absturzgefahr nacholen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'G02C', label: 'G02C: Baustellenbezogene Erstunterweisung (nur Baubetriebe)', legalReference: 'BaustellV', suggestedMeasure: 'Baustellen-Erstunterweisung durchführen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'G02D', label: 'G02D: Arbeitsplatzbezogene Erstunterweisung (Datum)', legalReference: 'ArbSchG § 12', suggestedMeasure: 'Arbeitsplatzbezogene Erstunterweisung nachholen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'G02E', label: 'G02E: Fachliche Qualifikation / Einweisung in die Maschine (Datum)', legalReference: 'BetrSichV § 12', suggestedMeasure: 'Maschineneinweisung nachweisen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'G02F', label: 'G02F: Maschineneinzelunterweisung nach BA (Datum)', legalReference: 'BetrSichV § 12', suggestedMeasure: 'Maschineneinzelunterweisung durchführen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'G02G', label: 'G02G: Anlassbezogene Unterweisung (z.B. nach Unfall)', legalReference: 'ArbSchG § 12', suggestedMeasure: 'Anlassbezogene Unterweisung nacholen und dokumentieren', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'G03', label: 'G03: Jährl. Fortbildung Fahrer Flurförderfahrzeug (Datum)', legalReference: 'DGUV I 308-001', suggestedMeasure: 'Jahresfortbildung Stapler-Fahrer einplanen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'G03B', label: 'G03B: Fortbildung Fahrer Hubarbeitsbühne (Datum)', legalReference: 'DGUV I 308-007', suggestedMeasure: 'Fortbildung Hubarbeitsbühne durchführen', defaultRiskLevel: 'HOCH' },
    ],
  },
  {
    sectionCode: 'H_MASCH',
    title: 'H – Maschinen & Betriebsanweisungen',
    items: [
      { itemKey: 'H01A', label: 'H01A: Maschinenbedienungsanleitungen vorhanden', legalReference: 'BetrSichV § 6', suggestedMeasure: 'Fehlende Bedienungsanleitungen beim Hersteller anfordern', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'H01B', label: 'H01B: Maschinenbetriebsanweisungen/BA vorhanden (Datum)', legalReference: 'BetrSichV § 6', suggestedMeasure: 'Betriebsanweisungen erstellen, Maschinentyp vermerken', defaultRiskLevel: 'MITTEL' },
    ],
  },
  {
    sectionCode: 'IJ_GEF',
    title: 'IJ – Gefahrstoffe',
    items: [
      { itemKey: 'IJ01A', label: 'IJ01A: Gefahrstofferfassung (Datum)', legalReference: 'GefStoffV § 6', suggestedMeasure: 'Gefahrstofferfassung durchführen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'IJ01B', label: 'IJ01B: Gefahrstoffkataster aktuell (Datum)', legalReference: 'GefStoffV § 6', suggestedMeasure: 'Gefahrstoffkataster aktualisieren', defaultRiskLevel: 'HOCH' },
      { itemKey: 'IJ02', label: 'IJ02: Sicherheitsdatenblätter vorhanden und aktuell', legalReference: 'GefStoffV § 6', suggestedMeasure: 'Fehlende/veraltete SDB beim Lieferanten anfordern', defaultRiskLevel: 'HOCH' },
      { itemKey: 'IJ02B', label: 'IJ02B: Verwendungsanleitungen vorhanden (Datum)', suggestedMeasure: 'Verwendungsanleitungen beschaffen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'IJ02C', label: 'IJ02C: Gefahrstoffbetriebsanweisungen (Bezeichnung / Datum)', legalReference: 'GefStoffV § 14', suggestedMeasure: 'Gefahrstoff-Betriebsanweisungen mit GHS-Kennzeichnung erstellen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'IJ02D', label: 'IJ02D: Gefahrstoffeinzelunterweisung nach BA (Datum)', legalReference: 'GefStoffV § 14', suggestedMeasure: 'Gefahrstoffunterweisung nacholen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'IJ03', label: 'IJ03: Gefahrstoffgefährdungsbeurteilung (Datum)', legalReference: 'GefStoffV § 6', suggestedMeasure: 'Gefahrstoff-GBU erstellen', defaultRiskLevel: 'HOCH' },
    ],
  },
  {
    sectionCode: 'K_GBU',
    title: 'K – Gefährdungsbeurteilung',
    items: [
      { itemKey: 'K01A', label: 'K01A: Allg. Gefährdungsbeurteilung nach ArbSchG (Datum Inkraftsetzung)', legalReference: 'ArbSchG § 5', suggestedMeasure: 'GBU erstellen und durch GF in Kraft setzen', defaultRiskLevel: 'KRITISCH' },
      { itemKey: 'K01A-WK', label: 'K01A: Jährl. Wirksamkeitskontrolle der GBU (Datum)', legalReference: 'ArbSchG § 6', suggestedMeasure: 'Wirksamkeitskontrolle je Rubrik mit Handzeichen und Datum', defaultRiskLevel: 'HOCH' },
      { itemKey: 'K01A-CL', label: 'K01A: Checkliste Kontrolle Schutzmaßnahmen durch Abteilungsleiter', suggestedMeasure: 'Quartalsmäßige Kontrolle einführen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'K01B', label: 'K01B: Gefährdungsbeurteilung Sonderbaustelle (Datum)', suggestedMeasure: 'GBU für Sonderbaustelle erstellen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'K01C', label: 'K01C: Wirksamkeitskontrolle Schutzmaßnahmen (Baubereich)', suggestedMeasure: 'Wirksamkeitskontrolle Baubereich einführen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'K01D', label: 'K01D: GBU PSA Einzelfallentscheidung (Datum)', legalReference: 'PSA-BV', suggestedMeasure: 'GBU PSA erstellen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'K01E', label: 'K01E: Checkliste Gerüstbau (Datum)', suggestedMeasure: 'Gerüstbau-Checkliste erstellen', defaultRiskLevel: 'MITTEL' },
    ],
  },
  {
    sectionCode: 'L_ASA',
    title: 'L – Arbeitsschutzausschuss (ASA)',
    items: [
      { itemKey: 'L01', label: 'L01: Arbeitsschutzausschuss (ab 20 MA, je Quartal) – Datum', legalReference: 'ASiG § 11', suggestedMeasure: 'ASA einberufen und protokollieren', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'L01-KN', label: 'L01: Kenntnisnahme ASA-Protokoll', suggestedMeasure: 'Kenntnisnahme dokumentieren', defaultRiskLevel: 'NIEDRIG' },
      { itemKey: 'L01-MB', label: 'L01: Mängelbehebung aus ASA', suggestedMeasure: 'Offene Punkte aus ASA abarbeiten', defaultRiskLevel: 'MITTEL' },
    ],
  },
  {
    sectionCode: 'M_PRUEFLISTE',
    title: 'M01 – Prüf- und Terminierungsliste / Prüfbedürftige Einrichtungen',
    items: [
      { itemKey: 'M01', label: 'M01: Prüf- und Terminierungsliste vorhanden und aktuell', legalReference: 'BetrSichV', suggestedMeasure: 'Prüf- und Terminierungsliste erstellen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'M01B-BRAND', label: 'M01B: Brandschutztüren – Prüfdatum', legalReference: 'DIN 18095', suggestedMeasure: 'Brandschutztüren prüfen lassen, Termin dokumentieren', defaultRiskLevel: 'HOCH' },
      { itemKey: 'M01B-PSA', label: 'M01B: PSA gegen Absturz – Prüfdatum', legalReference: 'PSA-BV', suggestedMeasure: 'PSA gegen Absturz prüfen lassen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'M01B-FL', label: 'M01B: Feuerlöscher – Prüfdatum (max. 2 Jahre)', legalReference: 'DIN 14406', suggestedMeasure: 'Feuerlöscher durch Fachbetrieb prüfen lassen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'M01B-ROLLTORE', label: 'M01B: Rolltore – Prüfdatum', legalReference: 'BetrSichV', suggestedMeasure: 'Rolltore prüfen lassen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'M01B-HEBEBUEHN', label: 'M01B: Hebebühnen – Prüfdatum', legalReference: 'BetrSichV', suggestedMeasure: 'Hebebühnen prüfen lassen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'M01B-BLITZ', label: 'M01B: Blitzschutz – Prüfdatum', legalReference: 'DIN VDE 0185', suggestedMeasure: 'Blitzschutzanlage prüfen lassen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'M01B-HDREINIG', label: 'M01B: Hochdruckreiniger – Prüfdatum', legalReference: 'BetrSichV', suggestedMeasure: 'Hochdruckreiniger prüfen lassen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'M01B-LEITERN', label: 'M01B: Leitern – Prüfdatum', legalReference: 'DGUV I 208-016', suggestedMeasure: 'Leitern prüfen lassen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'M01B-REGALE', label: 'M01B: Regale – Prüfdatum', legalReference: 'DIN EN 15635', suggestedMeasure: 'Regale durch befähigte Person prüfen lassen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'M01B-FF7', label: 'M01B: Flurförderfahrzeug / Stapler – Prüfdatum', legalReference: 'DGUV V68', suggestedMeasure: 'Stapler prüfen lassen (jährl. UVV-Prüfung)', defaultRiskLevel: 'HOCH' },
      { itemKey: 'M01B-ESCHIEBE', label: 'M01B: E-Schiebetüre / Automatiktüren – Prüfdatum', legalReference: 'DIN EN 16005', suggestedMeasure: 'Automatiktüren prüfen lassen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'M01B-ABSAUG', label: 'M01B: Absauganlage / Pudehlüfter – Prüfdatum', legalReference: 'BetrSichV', suggestedMeasure: 'Absauganlage prüfen lassen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'M01B-AUFZUG', label: 'M01B: Aufzug – Prüfdatum', legalReference: 'BetrSichV', suggestedMeasure: 'Aufzug durch ZÜS prüfen lassen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'M01B-FESTNETZ', label: 'M01B: Festnetzstromversorgung / E-Check – Prüfdatum', legalReference: 'DGUV V3', suggestedMeasure: 'E-Check durch Elektrofachkraft durchführen lassen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'M01B-FLUCHTB', label: 'M01B: Flucht-Rettungswegbeleuchtung – Prüfdatum', legalReference: 'ASR A3.4/3', suggestedMeasure: 'Rettungswegbeleuchtung prüfen lassen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'M01B-RWA', label: 'M01B: RWA-Anlage / Rauchabzug – Prüfdatum', legalReference: 'DIN 18232', suggestedMeasure: 'RWA-Anlage prüfen lassen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'M01B-PRESSE', label: 'M01B: Presse – Prüfdatum', legalReference: 'BetrSichV', suggestedMeasure: 'Presse prüfen lassen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'M01B-SAEGE', label: 'M01B: Säge / Holzschnitt – Prüfdatum', legalReference: 'BetrSichV', suggestedMeasure: 'Säge prüfen lassen', defaultRiskLevel: 'HOCH' },
    ],
  },
  {
    sectionCode: 'NO_ELEKTRO',
    title: 'NO – Elektrische Prüfungen',
    items: [
      { itemKey: 'NO01A', label: 'NO01A: Ortsfeste elektrische Betriebsmittel – Prüfdatum', legalReference: 'DGUV V3', suggestedMeasure: 'Ortsfeste Betriebsmittel prüfen lassen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'NO01B', label: 'NO01B: Nicht ortsfeste elektrische Betriebsmittel – Prüfdatum', legalReference: 'DGUV V3', suggestedMeasure: 'Ortsveränderliche Betriebsmittel prüfen lassen', defaultRiskLevel: 'HOCH' },
    ],
  },
  {
    sectionCode: 'PQ_FREMD',
    title: 'PQ – Fremdfirmen',
    items: [
      { itemKey: 'PQ01', label: 'PQ01: Unfallverhütung bei Fremdfirmen / Einf.schreiben (Datum)', legalReference: 'DGUV V1', suggestedMeasure: 'Einf.schreiben Arbeitsschutz an Fremdfirmen versenden', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'PQ01B', label: 'PQ01B: Nachweise umgesetzten Arbeitsschutz der Fremdfirmen', suggestedMeasure: 'Nachweise von Fremdfirmen einfordern', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'PQ02', label: 'PQ02: Fremdfirmeninformationsschreiben mit Unterweisungsnachweis (Datum)', suggestedMeasure: 'Informationsschreiben erstellen und GBU-Unterschrift einholen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'PQ03', label: 'PQ03: Feuererlaubnisschein vorhanden (Datum)', legalReference: 'DGUV I 205-002', suggestedMeasure: 'Feuererlaubnisschein einführen', defaultRiskLevel: 'MITTEL' },
    ],
  },
  {
    sectionCode: 'R_SIBE',
    title: 'R – Sicherheitsbeauftragter',
    items: [
      { itemKey: 'R01', label: 'R01: Ausbildungsnachweis Sicherheitsbeauftragter (Name / Letzte Fortbildung)', legalReference: 'SGB VII § 22', suggestedMeasure: 'Sicherheitsbeauftragten benennen und ausbilden lassen', defaultRiskLevel: 'MITTEL' },
    ],
  },
  {
    sectionCode: 'S_BRAND',
    title: 'S – Brandschutz',
    items: [
      { itemKey: 'S01', label: 'S01: Brandschutzbeauftragter ab 2000m² (Name / Letzte Fortbildung)', legalReference: 'VdS 3111', suggestedMeasure: 'Brandschutzbeauftragten benennen und ausbilden', defaultRiskLevel: 'HOCH' },
      { itemKey: 'S01B', label: 'S01B: Brandschaubericht von SIFA (alle 5 Jahre, Datum)', suggestedMeasure: 'Brandschaubericht erstellen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'S01Bb', label: 'S01B: Brandschaubericht von Brandschutzbeauftragtem der Feuerwehr (Datum)', suggestedMeasure: 'Feuerwehr-Brandschaubericht einholen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'S02', label: 'S02: Brandschutzhelfer 10% (5% Verwaltung) – Anzahl / Letzte Fortbildung', legalReference: 'ASR A2.2', suggestedMeasure: 'Ausreichend Brandschutzhelfer ausbilden', defaultRiskLevel: 'HOCH' },
      { itemKey: 'S02B', label: 'S02B: Evakuierungsübung (Datum)', legalReference: 'ASR A2.3', suggestedMeasure: 'Evakuierungsübung durchführen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'S02C', label: 'S02C: Dokumentation Evakuierungsübung (Datum)', suggestedMeasure: 'Evakuierungsübung dokumentieren', defaultRiskLevel: 'NIEDRIG' },
      { itemKey: 'S03', label: 'S03: Brandschutzordnung Teil A (Erstellungsdatum)', legalReference: 'DIN 14096', suggestedMeasure: 'Brandschutzordnung Teil A erstellen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'S03B', label: 'S03B: Brandschutzordnung Teil B (Erstellungsdatum)', legalReference: 'DIN 14096', suggestedMeasure: 'Brandschutzordnung Teil B erstellen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'S03C', label: 'S03C: Brandschutzordnung Teil C (Erstellungsdatum)', legalReference: 'DIN 14096', suggestedMeasure: 'Brandschutzordnung Teil C erstellen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'S03D', label: 'S03D: Alarmplan (Datum)', legalReference: 'ASR A2.3', suggestedMeasure: 'Alarmplan erstellen und aushängen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'S04', label: 'S04: Brandschutzunterweisung mit Unterweisungsnachweis (Datum)', legalReference: 'ArbSchG § 12', suggestedMeasure: 'Brandschutzunterweisung durchführen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'S05', label: 'S05: Brand- und Ex-Schutzdokument (Datum)', legalReference: 'GefStoffV § 6', suggestedMeasure: 'Brand- und Ex-Schutzdokument erstellen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'S05B', label: 'S05B: Brandschutzkonzept (Datum)', suggestedMeasure: 'Brandschutzkonzept erstellen', defaultRiskLevel: 'MITTEL' },
    ],
  },
  {
    sectionCode: 'SCH_SCHRIFTW',
    title: 'SCH – Schriftwechsel',
    items: [
      { itemKey: 'SCH01', label: 'SCH01: Schriftwechsel mit der Bezirksregierung (Arbeitsschutzbehörde) – Datum', suggestedMeasure: 'Schriftwechsel dokumentieren', defaultRiskLevel: 'NIEDRIG' },
      { itemKey: 'SCH02', label: 'SCH02: Schriftwechsel mit der Berufsgenossenschaft – Datum', suggestedMeasure: 'Schriftwechsel dokumentieren', defaultRiskLevel: 'NIEDRIG' },
    ],
  },
  {
    sectionCode: 'ST_ARZT',
    title: 'ST – Betriebsärztliche Unterlagen',
    items: [
      { itemKey: 'ST01', label: 'ST01: Bestellungsurkunde Betriebsarzt (Name / Datum)', legalReference: 'ASiG § 2', suggestedMeasure: 'Betriebsarzt bestellen', defaultRiskLevel: 'HOCH' },
      { itemKey: 'ST02', label: 'ST02: Jahresabschlussbericht gem. ASiG (Datum)', legalReference: 'ASiG § 6', suggestedMeasure: 'Jahresabschlussbericht anfordern', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'ST03', label: 'ST03: Begehungsbericht des Betriebsarztes (Datum)', legalReference: 'ASiG § 6', suggestedMeasure: 'Begehungsbericht vom Betriebsarzt anfordern', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'ST04', label: 'ST04: Schwangerschaftsmeldung / GBU Mutterschutzgesetz', legalReference: 'MuSchG', suggestedMeasure: 'Verfahren für Schwangerschaftsmeldung einführen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'ST05', label: 'ST05: Vorsorgekartei der durchgeführten Untersuchungen (je MA)', legalReference: 'ArbMedVV', suggestedMeasure: 'Vorsorgekartei anlegen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'ST04B', label: 'ST04B: Terminierungsliste der Untersuchungen (Datum)', legalReference: 'ArbMedVV', suggestedMeasure: 'Terminierungsliste erstellen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'ST05B', label: 'ST05B: Nachweise arbeitsmedizinische Untersuchungen (Datum)', legalReference: 'ArbMedVV', suggestedMeasure: 'Untersuchungsnachweise sammeln', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'ST05C', label: 'ST05C: Nachweise Eignungsuntersuchungen (Datum)', legalReference: 'ArbMedVV', suggestedMeasure: 'Eignungsuntersuchungen veranlassen und dokumentieren', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'ST06', label: 'ST06: Zusatz zum Arbeitsvertrag / Eignungsuntersuchung Daten Freigabe', suggestedMeasure: 'Zusatz zum Arbeitsvertrag ausstellen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'ST07', label: 'ST07: Stellungnahme des Betriebes zur Berufserkrankung', legalReference: 'BKV', suggestedMeasure: 'Stellungnahme erstatten', defaultRiskLevel: 'NIEDRIG' },
      { itemKey: 'ST08', label: 'ST08: Hautschutzplan (Datum)', legalReference: 'GefStoffV', suggestedMeasure: 'Hautschutzplan erstellen', defaultRiskLevel: 'MITTEL' },
    ],
  },
  {
    sectionCode: 'TV_UNFAELLE',
    title: 'T/V – Unfälle & Verbandbuch',
    items: [
      { itemKey: 'TV01', label: 'T/V01: Allg. Aushang "Verhalten bei Unfällen" – Datum / Telefonnummern aktuell', legalReference: 'DGUV V1 § 24', suggestedMeasure: 'Aushang aktualisieren (Telefonnummern, Ansprechpartner)', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'TV01-NOT', label: 'T/V01: Notfallordner mit aktuellen Gefahrstoffbetriebsanweisungen', suggestedMeasure: 'Notfallordner aktualisieren', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'TV02', label: 'T/V02: Verbandbuch – Letzter Eintrag / Datum', legalReference: 'DGUV V1 § 24', suggestedMeasure: 'Verbandbuch anlegen und aktuell führen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'TV02C', label: 'T/V02C: Unfallanzeige (Datum der letzten Anzeige)', legalReference: 'SGB VII § 193', suggestedMeasure: 'Unfallanzeige erstatten', defaultRiskLevel: 'HOCH' },
      { itemKey: 'TV03', label: 'T/V03: Unfallstatistik aktuell (Datum)', suggestedMeasure: 'Unfallstatistik führen', defaultRiskLevel: 'NIEDRIG' },
    ],
  },
  {
    sectionCode: 'W_ERSTHELFER',
    title: 'W – Ersthelfer',
    items: [
      { itemKey: 'W01', label: 'W01: Nachweis der Ersthelfer – Anzahl / Letzte Ausbildung/Fortbildung (Datum)', legalReference: 'DGUV V1 § 26', suggestedMeasure: 'Ausreichend Ersthelfer benennen und ausbilden (mind. 10%)', defaultRiskLevel: 'HOCH' },
      { itemKey: 'W01-BEST', label: 'W01: Ersthelfer schriftlich bestellt', suggestedMeasure: 'Ersthelfer schriftlich benennen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'W01-10P', label: 'W01: Mindestens 10% der MA als Ersthelfer benannt', legalReference: 'DGUV V1 § 26', suggestedMeasure: 'Weitere Ersthelfer ausbilden', defaultRiskLevel: 'MITTEL' },
    ],
  },
  {
    sectionCode: 'XYZ_BA',
    title: 'XYZ – Betriebsanweisungen & Sonstiges',
    items: [
      { itemKey: 'XYZ01', label: 'XYZ01: Auflistung der Sach- und Umweltschäden aktuell geführt', suggestedMeasure: 'Liste anlegen und aktuell führen', defaultRiskLevel: 'NIEDRIG' },
      { itemKey: 'XYZ02', label: 'XYZ02: Einhaltung des Arbeitszeitgesetzes – aktuell geführt', legalReference: 'ArbZG', suggestedMeasure: 'Arbeitszeitaufzeichnungen einführen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'XYZ03A', label: 'XYZ03: Betriebsanweisung Alkohol- und Drogenverbot (Datum)', suggestedMeasure: 'Betriebsanweisung erstellen und aushängen', defaultRiskLevel: 'MITTEL' },
      { itemKey: 'XYZ03B', label: 'XYZ03: Betriebsanweisung Raubüberfall und Diebstahl (Datum)', suggestedMeasure: 'Betriebsanweisung erstellen und aushängen', defaultRiskLevel: 'MITTEL' },
    ],
  },
];

async function main() {
  console.log('Erstelle AWS Begehungsvorlage (A00–XYZ03)...');

  // Check if template already exists
  const existing = await prisma.inspectionTemplate.findFirst({
    where: { name: TEMPLATE_NAME },
  });
  if (existing) {
    console.log('Vorlage existiert bereits, wird aktualisiert...');
    // Delete existing sections/items (cascade)
    await prisma.inspectionTemplateSection.deleteMany({ where: { templateId: existing.id } });
    await prisma.inspectionTemplate.delete({ where: { id: existing.id } });
  }

  const template = await prisma.inspectionTemplate.create({
    data: {
      name: TEMPLATE_NAME,
      description: 'Vollständige Begehungsvorlage nach AWS-Standard (A00–XYZ03) für alle Branchen',
      isActive: true,
      industryId: null, // universal
    },
  });

  let sectionOrder = 0;
  for (const section of sections) {
    const createdSection = await prisma.inspectionTemplateSection.create({
      data: {
        templateId: template.id,
        sectionCode: section.sectionCode,
        title: section.title,
        sortOrder: sectionOrder++,
      },
    });

    let itemOrder = 0;
    for (const item of section.items) {
      await prisma.inspectionTemplateItem.create({
        data: {
          sectionId: createdSection.id,
          itemKey: item.itemKey,
          label: item.label,
          description: item.description || null,
          legalReference: item.legalReference || null,
          suggestedMeasure: item.suggestedMeasure,
          defaultRiskLevel: item.defaultRiskLevel,
          sortOrder: itemOrder++,
        },
      });
    }

    const itemCount = section.items.length;
    console.log(`  ✓ ${section.title} (${itemCount} Punkte)`);
  }

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  console.log(`\nFertig: ${sections.length} Sektionen, ${totalItems} Prüfpunkte`);
  console.log(`Template-ID: ${template.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
