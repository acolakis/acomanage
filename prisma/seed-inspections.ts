import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface TemplateItem {
  itemKey: string;
  label: string;
  description?: string;
  legalReference?: string;
}

interface TemplateSection {
  sectionCode: string;
  title: string;
  items: TemplateItem[];
}

const universalSections: TemplateSection[] = [
  {
    sectionCode: "ORG",
    title: "Organisation & Personal",
    items: [
      { itemKey: "ORG-01", label: "Verantwortliche Person für Arbeitssicherheit benannt", legalReference: "§ 13 ArbSchG" },
      { itemKey: "ORG-02", label: "Sicherheitsbeauftragter bestellt (ab 20 MA)", legalReference: "§ 22 SGB VII, DGUV V1 §20" },
      { itemKey: "ORG-03", label: "Betriebsarzt bestellt", legalReference: "§ 2 ASiG" },
      { itemKey: "ORG-04", label: "Fachkraft für Arbeitssicherheit bestellt", legalReference: "§ 5 ASiG" },
      { itemKey: "ORG-05", label: "ASA-Sitzungen dokumentiert (ab 20 MA)", legalReference: "§ 11 ASiG" },
      { itemKey: "ORG-06", label: "Grundsatzerklärung Arbeitsschutz vorhanden", legalReference: "§ 3 ArbSchG" },
      { itemKey: "ORG-07", label: "Unternehmerpflichten schriftlich übertragen", legalReference: "§ 13 ArbSchG, DGUV V1 §13" },
      { itemKey: "ORG-08", label: "Aushangpflichtige Gesetze zugänglich", legalReference: "ArbSchG, ArbZG, MuSchG" },
    ],
  },
  {
    sectionCode: "UNT",
    title: "Unterweisungen",
    items: [
      { itemKey: "UNT-01", label: "Jährliche Arbeitsschutzunterweisung durchgeführt", legalReference: "§ 12 ArbSchG" },
      { itemKey: "UNT-02", label: "Erstunterweisung neue Mitarbeiter dokumentiert", legalReference: "§ 12 ArbSchG, DGUV V1 §4" },
      { itemKey: "UNT-03", label: "Unterweisungsnachweise vorhanden und unterschrieben" },
      { itemKey: "UNT-04", label: "Spezifische Unterweisungen für Gefahrstoffe", legalReference: "§ 14 GefStoffV" },
      { itemKey: "UNT-05", label: "Spezifische Unterweisungen für Maschinen/Anlagen", legalReference: "§ 12 BetrSichV" },
    ],
  },
  {
    sectionCode: "GBU",
    title: "Gefährdungsbeurteilungen",
    items: [
      { itemKey: "GBU-01", label: "Gefährdungsbeurteilung vorhanden und aktuell", legalReference: "§ 5, 6 ArbSchG" },
      { itemKey: "GBU-02", label: "Alle Arbeitsbereiche/-tätigkeiten erfasst" },
      { itemKey: "GBU-03", label: "Maßnahmen festgelegt und dokumentiert" },
      { itemKey: "GBU-04", label: "Wirksamkeitskontrolle der Maßnahmen durchgeführt", legalReference: "§ 3 ArbSchG" },
      { itemKey: "GBU-05", label: "GBU für psychische Belastungen vorhanden", legalReference: "§ 5 ArbSchG" },
      { itemKey: "GBU-06", label: "GBU bei Änderungen aktualisiert" },
      { itemKey: "GBU-07", label: "Mutterschutz-GBU vorhanden (wenn zutreffend)", legalReference: "§ 10 MuSchG" },
    ],
  },
  {
    sectionCode: "BRAND",
    title: "Brandschutz",
    items: [
      { itemKey: "BRAND-01", label: "Feuerlöscher vorhanden und geprüft (max. 2 Jahre)", legalReference: "ASR A2.2" },
      { itemKey: "BRAND-02", label: "Feuerlöscher frei zugänglich und gekennzeichnet", legalReference: "ASR A2.2" },
      { itemKey: "BRAND-03", label: "Flucht- und Rettungswege frei und gekennzeichnet", legalReference: "ASR A2.3" },
      { itemKey: "BRAND-04", label: "Flucht- und Rettungsplan vorhanden (ab 200m² oder >20 AP)", legalReference: "ASR A2.3" },
      { itemKey: "BRAND-05", label: "Notbeleuchtung vorhanden und funktionsfähig", legalReference: "ASR A3.4/3" },
      { itemKey: "BRAND-06", label: "Brandschutzordnung vorhanden", legalReference: "DIN 14096" },
      { itemKey: "BRAND-07", label: "Brandschutzhelfer ausgebildet (mind. 5%)", legalReference: "ASR A2.2, DGUV I 205-023" },
      { itemKey: "BRAND-08", label: "Rauchmelder / Brandmeldeanlage funktionsfähig" },
    ],
  },
  {
    sectionCode: "GEF",
    title: "Gefahrstoffe",
    items: [
      { itemKey: "GEF-01", label: "Gefahrstoffverzeichnis vorhanden und aktuell", legalReference: "§ 6 GefStoffV" },
      { itemKey: "GEF-02", label: "Sicherheitsdatenblätter vorhanden und zugänglich", legalReference: "§ 6 GefStoffV" },
      { itemKey: "GEF-03", label: "Betriebsanweisungen für Gefahrstoffe vorhanden", legalReference: "§ 14 GefStoffV" },
      { itemKey: "GEF-04", label: "Gefahrstoffe ordnungsgemäß gelagert und gekennzeichnet", legalReference: "TRGS 510" },
      { itemKey: "GEF-05", label: "Zusammenlagerungsverbote beachtet", legalReference: "TRGS 510" },
      { itemKey: "GEF-06", label: "Persönliche Schutzausrüstung vorhanden", legalReference: "§ 8 GefStoffV" },
      { itemKey: "GEF-07", label: "Absaugung/Lüftung bei Gefahrstoffeinsatz vorhanden", legalReference: "§ 9 GefStoffV" },
      { itemKey: "GEF-08", label: "Hautschutzplan vorhanden (wenn zutreffend)", legalReference: "TRGS 401" },
    ],
  },
  {
    sectionCode: "MASCH",
    title: "Maschinen & Arbeitsmittel",
    items: [
      { itemKey: "MASCH-01", label: "CE-Kennzeichnung an Maschinen vorhanden", legalReference: "9. ProdSV" },
      { itemKey: "MASCH-02", label: "Betriebsanweisungen für Maschinen vorhanden", legalReference: "§ 12 BetrSichV" },
      { itemKey: "MASCH-03", label: "Schutzeinrichtungen vorhanden und funktionsfähig", legalReference: "§ 6 BetrSichV" },
      { itemKey: "MASCH-04", label: "Regelmäßige Prüfungen durchgeführt und dokumentiert", legalReference: "§ 14, 16 BetrSichV" },
      { itemKey: "MASCH-05", label: "Not-Aus-Schalter vorhanden und funktionsfähig" },
      { itemKey: "MASCH-06", label: "Leitern und Tritte geprüft", legalReference: "TRBS 2121 Teil 2" },
      { itemKey: "MASCH-07", label: "Regale standsicher und befestigt", legalReference: "DIN EN 15635" },
      { itemKey: "MASCH-08", label: "Beauftragung zum Führen von Flurförderzeugen", legalReference: "§ 7 DGUV V68" },
    ],
  },
  {
    sectionCode: "APL",
    title: "Arbeitsplatzgestaltung",
    items: [
      { itemKey: "APL-01", label: "Beleuchtung ausreichend (mind. 500 Lux Büro)", legalReference: "ASR A3.4" },
      { itemKey: "APL-02", label: "Raumtemperatur angemessen (mind. 20°C Büro)", legalReference: "ASR A3.5" },
      { itemKey: "APL-03", label: "Bildschirmarbeitsplätze ergonomisch eingerichtet", legalReference: "ArbStättV Anhang 6" },
      { itemKey: "APL-04", label: "Lärmpegel im zulässigen Bereich", legalReference: "LärmVibrationsArbSchV" },
      { itemKey: "APL-05", label: "Ausreichende Belüftung / Lüftungsmöglichkeit", legalReference: "ASR A3.6" },
      { itemKey: "APL-06", label: "Ordnung und Sauberkeit am Arbeitsplatz" },
    ],
  },
  {
    sectionCode: "WEGE",
    title: "Verkehrswege & Lager",
    items: [
      { itemKey: "WEGE-01", label: "Verkehrswege frei und nicht eingeengt", legalReference: "ASR A1.8" },
      { itemKey: "WEGE-02", label: "Stolperstellen beseitigt / gekennzeichnet", legalReference: "ASR A1.8" },
      { itemKey: "WEGE-03", label: "Treppen und Geländer in ordnungsgemäßem Zustand", legalReference: "ASR A1.8" },
      { itemKey: "WEGE-04", label: "Bodenbeläge rutschhemmend", legalReference: "ASR A1.5/1,2" },
      { itemKey: "WEGE-05", label: "Lagerbereiche gekennzeichnet und ordentlich" },
      { itemKey: "WEGE-06", label: "Parkplatz und Außengelände sicher (Winterdienst)", legalReference: "ASR A1.8" },
    ],
  },
  {
    sectionCode: "EH",
    title: "Erste Hilfe",
    items: [
      { itemKey: "EH-01", label: "Ersthelfer bestellt (mind. 5% der Beschäftigten)", legalReference: "§ 26 DGUV V1" },
      { itemKey: "EH-02", label: "Erste-Hilfe-Material vollständig und zugänglich", legalReference: "DIN 13157/13169" },
      { itemKey: "EH-03", label: "Verbandsbuch / Dokumentation von Unfällen geführt", legalReference: "§ 24 DGUV V1" },
      { itemKey: "EH-04", label: "Notrufnummern ausgehängt und aktuell" },
      { itemKey: "EH-05", label: "Meldeeinrichtung für Notruf vorhanden" },
      { itemKey: "EH-06", label: "AED-Defibrillator vorhanden (wenn empfohlen)" },
    ],
  },
  {
    sectionCode: "ELEK",
    title: "Elektrische Sicherheit",
    items: [
      { itemKey: "ELEK-01", label: "Ortsveränderliche Geräte geprüft (DGUV V3)", legalReference: "DGUV V3, BetrSichV" },
      { itemKey: "ELEK-02", label: "Ortsfeste Anlagen geprüft", legalReference: "DGUV V3" },
      { itemKey: "ELEK-03", label: "Schaltschränke verschlossen und gekennzeichnet" },
      { itemKey: "ELEK-04", label: "Keine defekten Kabel oder Steckdosen sichtbar" },
      { itemKey: "ELEK-05", label: "FI-Schutzschalter vorhanden und getestet" },
    ],
  },
  {
    sectionCode: "PSA",
    title: "Persönliche Schutzausrüstung",
    items: [
      { itemKey: "PSA-01", label: "PSA nach Gefährdungsbeurteilung bereitgestellt", legalReference: "§ 3 PSA-BV" },
      { itemKey: "PSA-02", label: "PSA in einwandfreiem Zustand" },
      { itemKey: "PSA-03", label: "Unterweisung zur PSA-Benutzung erfolgt", legalReference: "§ 3 PSA-BV" },
      { itemKey: "PSA-04", label: "PSA wird von Beschäftigten getragen" },
      { itemKey: "PSA-05", label: "Hautschutzmittel bereitgestellt (wenn erforderlich)" },
    ],
  },
];

async function main() {
  console.log('Seeding inspection templates...');

  // Create universal inspection template
  const template = await prisma.inspectionTemplate.upsert({
    where: { id: 'universal-template' },
    update: { name: 'Universale Begehungsvorlage' },
    create: {
      id: 'universal-template',
      name: 'Universale Begehungsvorlage',
      description: 'Standardvorlage für Betriebsbegehungen mit allen relevanten Prüfbereichen',
      isActive: true,
    },
  });

  console.log(`Created template: ${template.name}`);

  // Delete existing sections for this template (to allow re-running)
  await prisma.inspectionTemplateItem.deleteMany({
    where: { section: { templateId: template.id } },
  });
  await prisma.inspectionTemplateSection.deleteMany({
    where: { templateId: template.id },
  });

  // Create sections and items
  for (let sIdx = 0; sIdx < universalSections.length; sIdx++) {
    const sectionDef = universalSections[sIdx];
    const section = await prisma.inspectionTemplateSection.create({
      data: {
        templateId: template.id,
        sectionCode: sectionDef.sectionCode,
        title: sectionDef.title,
        sortOrder: sIdx + 1,
      },
    });

    for (let iIdx = 0; iIdx < sectionDef.items.length; iIdx++) {
      const itemDef = sectionDef.items[iIdx];
      await prisma.inspectionTemplateItem.create({
        data: {
          sectionId: section.id,
          itemKey: itemDef.itemKey,
          label: itemDef.label,
          description: itemDef.description ?? null,
          legalReference: itemDef.legalReference ?? null,
          sortOrder: iIdx + 1,
        },
      });
    }

    console.log(`  Section: ${sectionDef.title} (${sectionDef.items.length} items)`);
  }

  const totalItems = universalSections.reduce((sum, s) => sum + s.items.length, 0);
  console.log(`Seeded ${universalSections.length} sections with ${totalItems} items total.`);
}

main()
  .catch((e) => {
    console.error('Error seeding inspection templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
