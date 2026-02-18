import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // ============================================================
  // 1. DOCUMENT CATEGORIES (62 categories from folder structure)
  // ============================================================
  const categories = [
    { code: 'A01', name: 'Firmenorganigramm', fullName: 'Firmenorganigramm, Grundsatzerklärung zum Arbeitsschutz', parentGroup: 'A', sortOrder: 1 },
    { code: 'A02', name: 'Unternehmerpflichten', fullName: 'Übertragung der Unternehmerpflichten, Zusatz zum Arbeitsvertrag', parentGroup: 'A', sortOrder: 2 },
    { code: 'A03', name: 'Beauftragung Fahrzeuge', fullName: 'Beauftragung zum Führen von Fahrzeugen / Führerscheinkontrolle', parentGroup: 'A', sortOrder: 3 },
    { code: 'A04', name: 'Befähigte Person', fullName: 'Beauftragung befähigte Person Leiter, Regale', parentGroup: 'A', sortOrder: 4 },
    { code: 'B01', name: 'Bestellungsurkunde SIFA', fullName: 'Bestellungsurkunde und Sicherheitsausweis der Fachkraft für Arbeitssicherheit SIFA', parentGroup: 'B', sortOrder: 5 },
    { code: 'B02', name: 'Fortbildung SIFA', fullName: 'Jährl. Fortbildungsbestätigung der Fachkraft für Arbeitssicherheit', parentGroup: 'B', sortOrder: 6 },
    { code: 'CD01', name: 'Arbeitsschutzjahresplan', fullName: 'Arbeitsschutzjahresplan und Arbeitsschutzjahresabschlussbericht der SIFA', parentGroup: 'CD', sortOrder: 7 },
    { code: 'E01', name: 'Begehungsbericht SIFA', fullName: 'Begehungsbericht der Fachkraft für Arbeitssicherheit SIFA', parentGroup: 'E', sortOrder: 8 },
    { code: 'E02', name: 'Förderantrag', fullName: 'Förderantrag zur Arbeitsschutzberatung durch freiberuflichen', parentGroup: 'E', sortOrder: 9 },
    { code: 'F01', name: 'Aushangpflichtige Gesetze', fullName: 'Aushangpflichtige Gesetze', parentGroup: 'F', sortOrder: 10 },
    { code: 'F01BC', name: 'DGUV Vorschriften', fullName: 'Aushangpflichtige DGUV Vorschriften (DGUV Vorschrift 1, 38)', parentGroup: 'F', sortOrder: 11 },
    { code: 'F01D', name: 'Mutterschutzgesetz', fullName: 'Mutterschutzgesetz', parentGroup: 'F', sortOrder: 12 },
    { code: 'G01', name: 'Erstinformation neue MA', fullName: 'Arbeitsschutzerstinformation für neue Mitarbeiter, Unterweisungsnachweis und Praktikanten', parentGroup: 'G', sortOrder: 13 },
    { code: 'G02', name: 'Jährl. Unterweisung', fullName: 'Jährl. Arbeitsschutzunterweisung gem. § 12 Arbeitsschutzgesetz, Unterweisungsnachweis', parentGroup: 'G', sortOrder: 14 },
    { code: 'G03', name: 'Unterweisung Höhenarbeit', fullName: 'Jährl. Unterweisung hochgelegener Arbeitsplatz, Unterweisungsnachweis', parentGroup: 'G', sortOrder: 15 },
    { code: 'G04', name: 'Fortbildung Staplerfahrer', fullName: 'Jährl. Fortbildung Fahrer Flurförderfahrzeug', parentGroup: 'G', sortOrder: 16 },
    { code: 'G05', name: 'Maschinenerstunterweisung', fullName: 'Maschinenerstunterweisung', parentGroup: 'G', sortOrder: 17 },
    { code: 'G06', name: 'Anlassbez. Unterweisung', fullName: 'Anlassbezogene Unterweisung', parentGroup: 'G', sortOrder: 18 },
    { code: 'H01', name: 'Bedienungsanleitungen', fullName: 'Maschinenbedienungsanleitungen', parentGroup: 'H', sortOrder: 19 },
    { code: 'H01B', name: 'Maschinenbetriebsanweisungen', fullName: 'Maschinenbetriebsanweisungen', parentGroup: 'H', sortOrder: 20 },
    { code: 'IJ01', name: 'Gefahrstofferfassung', fullName: 'Gefahrstofferfassung', parentGroup: 'IJ', sortOrder: 21 },
    { code: 'IJ02', name: 'Gefahrstoffkataster', fullName: 'Gefahrstoffkataster', parentGroup: 'IJ', sortOrder: 22 },
    { code: 'IJ03', name: 'Gefahrstoff-BA', fullName: 'Gefahrstoffbetriebsanweisungen', parentGroup: 'IJ', sortOrder: 23 },
    { code: 'IJ04', name: 'Sicherheitsdatenblätter', fullName: 'Sicherheitsdatenblätter', parentGroup: 'IJ', sortOrder: 24 },
    { code: 'IJ05', name: 'Verwendungsanleitungen', fullName: 'Verwendungsanleitungen', parentGroup: 'IJ', sortOrder: 25 },
    { code: 'IJ06', name: 'Gefahrstoff-GB', fullName: 'Gefahrstoffgefährdungsbeurteilung', parentGroup: 'IJ', sortOrder: 26 },
    { code: 'IJ07', name: 'Einzelunterweisung Gefahrstoffe', fullName: 'Einzelunterweisung Gefahrstoffe', parentGroup: 'IJ', sortOrder: 27 },
    { code: 'K01', name: 'Gefährdungsbeurteilung', fullName: 'Gefährdungsbeurteilung und Schutzmaßnahmen alle Tätigkeiten gem. ArbSchG § 5', parentGroup: 'K', sortOrder: 28 },
    { code: 'K02', name: 'Wirksamkeitskontrolle', fullName: 'Wirksamkeitskontrolle / Checkliste', parentGroup: 'K', sortOrder: 29 },
    { code: 'L01', name: 'Arbeitsschutzausschuss', fullName: 'Arbeitsschutzausschuss (ASA, je Vierteljahr, ab 20 Mitarbeiter)', parentGroup: 'L', sortOrder: 30 },
    { code: 'M01', name: 'Prüfliste', fullName: 'Prüfbedürftige Einrichtungen Prüf- und Terminierungsliste', parentGroup: 'M', sortOrder: 31 },
    { code: 'M02', name: 'Prüfnachweise', fullName: 'Prüfnachweise Leitern, Regale, Feuerlöscher usw.', parentGroup: 'M', sortOrder: 32 },
    { code: 'NO01', name: 'Elektro-Prüfung', fullName: 'Überprüfung der ortsfesten/nicht ortsfesten elektrischen Betriebsmittel (DGUV V3)', parentGroup: 'NO', sortOrder: 33 },
    { code: 'PQ01', name: 'Fremdfirmen Unfallverhütung', fullName: 'Unfallverhütung bei Fremdfirmen / Einforderungsschreiben', parentGroup: 'PQ', sortOrder: 34 },
    { code: 'PQ02', name: 'Fremdfirmeninformation', fullName: 'Fremdfirmeninformationsschreiben mit Unterweisungsnachweis', parentGroup: 'PQ', sortOrder: 35 },
    { code: 'PQ03', name: 'Subunternehmer', fullName: 'Subunternehmer Arbeitsschutzunterlagen', parentGroup: 'PQ', sortOrder: 36 },
    { code: 'R01', name: 'Sicherheitsbeauftragter', fullName: 'Ausbildungsnachweis Sicherheitsbeauftragter (ab 20 MA)', parentGroup: 'R', sortOrder: 37 },
    { code: 'S01', name: 'Brandschutz allgemein', fullName: 'Brandschutz, Brandschutzbeauftragter, Brandschaubericht', parentGroup: 'S', sortOrder: 38 },
    { code: 'S02', name: 'Brandschutzhelfer', fullName: 'Brandschutzhelfer und deren Ausbildung, Evakuierungsübung', parentGroup: 'S', sortOrder: 39 },
    { code: 'S03', name: 'Brandschutzordnung', fullName: 'Brandschutzordnung Teil A, B, C und Alarmplan', parentGroup: 'S', sortOrder: 40 },
    { code: 'S04', name: 'Brandschutzunterweisung', fullName: 'Brandschutzunterweisung mit Unterweisungsnachweis', parentGroup: 'S', sortOrder: 41 },
    { code: 'S05', name: 'Brand-/Ex-Schutzdokument', fullName: 'Brand- und Ex-Schutzdokument', parentGroup: 'S', sortOrder: 42 },
    { code: 'S06', name: 'Feuererlaubnisschein', fullName: 'Feuererlaubnisschein', parentGroup: 'S', sortOrder: 43 },
    { code: 'SCH01', name: 'Schriftwechsel Behörde', fullName: 'Schriftwechsel mit der Bez. Reg. (Arbeitsschutzbehörde)', parentGroup: 'SCH', sortOrder: 44 },
    { code: 'SCH02', name: 'Schriftwechsel BG', fullName: 'Schriftwechsel mit der Berufsgenossenschaft', parentGroup: 'SCH', sortOrder: 45 },
    { code: 'ST01', name: 'Bestellungsurkunde BA', fullName: 'Bestellungsurkunde Betriebsarzt', parentGroup: 'ST', sortOrder: 46 },
    { code: 'ST02', name: 'Begehungsbericht BA', fullName: 'Begehungsbericht Betriebsarzt', parentGroup: 'ST', sortOrder: 47 },
    { code: 'ST03', name: 'Jahresabschlussbericht BA', fullName: 'Jahresabschlussbericht gem. ASiG und DGUV Vorschrift 2', parentGroup: 'ST', sortOrder: 48 },
    { code: 'ST04', name: 'Schwangerschaftsmeldung', fullName: 'Schwangerschaftsmeldung / Gefährdungsbeurteilung gem. MuSchG', parentGroup: 'ST', sortOrder: 49 },
    { code: 'ST05', name: 'Vorsorgekartei', fullName: 'Vorsorgekartei der durchgeführten und zu veranlassenden Untersuchungen', parentGroup: 'ST', sortOrder: 50 },
    { code: 'ST06', name: 'Untersuchungsnachweise', fullName: 'Nachweise der durchgeführten Untersuchungen und arbeitsmedizinischen Vorsorge', parentGroup: 'ST', sortOrder: 51 },
    { code: 'ST07', name: 'Zusatz Arbeitsvertrag', fullName: 'Zusatz zum Arbeitsvertrag zur Eignungsuntersuchung', parentGroup: 'ST', sortOrder: 52 },
    { code: 'ST08', name: 'Berufserkrankung', fullName: 'Stellungnahme des Betriebes zur Berufserkrankung', parentGroup: 'ST', sortOrder: 53 },
    { code: 'ST09', name: 'Hautschutzplan', fullName: 'Hautschutzplan', parentGroup: 'ST', sortOrder: 54 },
    { code: 'TV01', name: 'Aushang Unfallverhalten', fullName: 'Allg. Aushang Verhalten bei Unfällen', parentGroup: 'TV', sortOrder: 55 },
    { code: 'TV02', name: 'Unfallaufnahme', fullName: 'Unfallaufnahme, Verbandbuch, Unfallanzeige', parentGroup: 'TV', sortOrder: 56 },
    { code: 'TV03', name: 'Unfallstatistik', fullName: 'Unfallstatistik', parentGroup: 'TV', sortOrder: 57 },
    { code: 'W01', name: 'Ersthelfer', fullName: 'Nachweis der Ersthelfer, Bestellung Ersthelfer, Fortbildungsbestätigung', parentGroup: 'W', sortOrder: 58 },
    { code: 'XYZ01', name: 'Sach-/Umweltschäden', fullName: 'Auflistung von Sach- und Umweltschäden', parentGroup: 'XYZ', sortOrder: 59 },
    { code: 'XYZ02', name: 'Arbeitszeitgesetz', fullName: 'Einhaltung des Arbeitszeitgesetzes', parentGroup: 'XYZ', sortOrder: 60 },
    { code: 'XYZ03', name: 'Handlungsbez. BA', fullName: 'Handlungsbezogene Betriebsanweisungen', parentGroup: 'XYZ', sortOrder: 61 },
  ];

  for (const cat of categories) {
    await prisma.documentCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    });
  }
  console.log(`Seeded ${categories.length} document categories`);

  // ============================================================
  // 2. INDUSTRIES (Branchen)
  // ============================================================
  const industries = [
    { code: 'NAHRUNG', name: 'Nahrungsmittelindustrie', description: 'Lebensmittelverarbeitung, Gastronomie, Bäckerei, Fleischerei', sortOrder: 1 },
    { code: 'BAU', name: 'Bauwirtschaft', description: 'Hoch-/Tiefbau, Straßenbau, Dachdecker, Zimmerei', sortOrder: 2 },
    { code: 'HANDEL', name: 'Handel / Einzelhandel', description: 'Baumärkte, Supermärkte, Fachhandel', sortOrder: 3 },
    { code: 'KFZ', name: 'KFZ / Autohaus', description: 'Autowerkstätten, Autohäuser, KFZ-Handel', sortOrder: 4 },
    { code: 'HANDWERK', name: 'Handwerk', description: 'Metallbau, Schreinerei, Elektro, Sanitär', sortOrder: 5 },
    { code: 'LOGISTIK', name: 'Logistik / Transport', description: 'Spedition, Lagerwirtschaft, Kurierdienste', sortOrder: 6 },
    { code: 'GESUNDHEIT', name: 'Gesundheitswesen', description: 'Arztpraxen, Orthopädietechnik, Pflege', sortOrder: 7 },
    { code: 'VERWALTUNG', name: 'Verwaltung / Büro', description: 'Bürotätigkeiten, Verwaltung, Dienstleistung', sortOrder: 8 },
    { code: 'GASTRO', name: 'Gastronomie / Hotellerie', description: 'Restaurants, Hotels, Catering, Kantinen', sortOrder: 9 },
    { code: 'CHEMIE', name: 'Chemie / Pharma', description: 'Chemische Industrie, Pharmazeutische Herstellung', sortOrder: 10 },
    { code: 'METALL', name: 'Metallindustrie', description: 'Metallverarbeitung, Maschinenbau, Gießerei', sortOrder: 11 },
    { code: 'SONSTIGE', name: 'Sonstige', description: 'Weitere Branchen', sortOrder: 99 },
  ];

  for (const ind of industries) {
    await prisma.industry.upsert({
      where: { code: ind.code },
      update: {},
      create: ind,
    });
  }
  console.log(`Seeded ${industries.length} industries`);

  // ============================================================
  // 3. INDUSTRY DEFAULT CATEGORIES
  // ============================================================
  // Universal categories (relevant for ALL industries)
  const universalCategoryCodes = [
    'A01', 'A02', 'B01', 'B02', 'CD01', 'E01', 'F01', 'F01BC',
    'G01', 'G02', 'K01', 'K02', 'M01', 'M02', 'NO01',
    'S01', 'S02', 'S03', 'S04', 'ST01', 'ST02', 'ST03',
    'ST05', 'ST06', 'TV01', 'TV02', 'TV03', 'W01',
  ];

  // Industry-specific additional categories
  const industrySpecificCategories: Record<string, string[]> = {
    'NAHRUNG': ['A03', 'G05', 'G06', 'H01', 'H01B', 'IJ01', 'IJ02', 'IJ03', 'IJ04', 'IJ06', 'IJ07', 'PQ01', 'PQ02', 'S05', 'S06', 'ST04', 'ST07', 'ST09', 'XYZ01'],
    'BAU': ['A03', 'A04', 'G03', 'G04', 'G05', 'G06', 'H01', 'H01B', 'IJ01', 'IJ02', 'IJ03', 'IJ04', 'IJ06', 'IJ07', 'PQ01', 'PQ02', 'PQ03', 'R01', 'S05', 'S06', 'ST04', 'ST07', 'XYZ01', 'XYZ03'],
    'HANDEL': ['A03', 'A04', 'G04', 'G05', 'G06', 'H01', 'H01B', 'IJ01', 'IJ02', 'IJ03', 'IJ04', 'L01', 'PQ01', 'PQ02', 'R01', 'ST04', 'XYZ01', 'XYZ02'],
    'KFZ': ['A03', 'G05', 'G06', 'H01', 'H01B', 'IJ01', 'IJ02', 'IJ03', 'IJ04', 'IJ06', 'IJ07', 'PQ01', 'PQ02', 'S05', 'S06', 'ST04', 'ST07', 'ST09', 'XYZ01', 'XYZ03'],
    'HANDWERK': ['A03', 'G05', 'G06', 'H01', 'H01B', 'IJ01', 'IJ02', 'IJ03', 'IJ04', 'IJ06', 'IJ07', 'PQ01', 'PQ02', 'S05', 'S06', 'ST04', 'ST07', 'ST09', 'XYZ01', 'XYZ03'],
    'LOGISTIK': ['A03', 'G04', 'G05', 'G06', 'H01', 'H01B', 'IJ01', 'IJ02', 'IJ03', 'IJ04', 'PQ01', 'PQ02', 'R01', 'ST04', 'XYZ01', 'XYZ02'],
    'GESUNDHEIT': ['G05', 'G06', 'IJ01', 'IJ02', 'IJ03', 'IJ04', 'IJ06', 'IJ07', 'F01D', 'ST04', 'ST07', 'ST09', 'XYZ01'],
    'VERWALTUNG': ['F01D', 'L01', 'ST04', 'XYZ02'],
    'GASTRO': ['A03', 'G05', 'G06', 'H01', 'H01B', 'IJ01', 'IJ02', 'IJ03', 'IJ04', 'IJ06', 'IJ07', 'PQ01', 'PQ02', 'S05', 'ST04', 'ST09', 'XYZ01', 'XYZ02'],
    'CHEMIE': ['A03', 'G05', 'G06', 'H01', 'H01B', 'IJ01', 'IJ02', 'IJ03', 'IJ04', 'IJ05', 'IJ06', 'IJ07', 'L01', 'PQ01', 'PQ02', 'R01', 'S05', 'S06', 'ST04', 'ST07', 'ST09', 'XYZ01', 'XYZ03'],
    'METALL': ['A03', 'G04', 'G05', 'G06', 'H01', 'H01B', 'IJ01', 'IJ02', 'IJ03', 'IJ04', 'IJ06', 'IJ07', 'L01', 'PQ01', 'PQ02', 'R01', 'S05', 'S06', 'ST04', 'ST07', 'ST09', 'XYZ01', 'XYZ03'],
    'SONSTIGE': [],
  };

  // Fetch all categories and industries from DB
  const allCategories = await prisma.documentCategory.findMany();
  const allIndustries = await prisma.industry.findMany();
  const categoryMap = new Map(allCategories.map(c => [c.code, c.id]));
  const industryMap = new Map(allIndustries.map(i => [i.code, i.id]));

  let defaultCategoryCount = 0;
  for (const [industryCode, industryId] of Array.from(industryMap.entries())) {
    // Universal categories for all industries
    const allCodes = [...universalCategoryCodes, ...(industrySpecificCategories[industryCode] || [])];
    const uniqueCodes = Array.from(new Set(allCodes));

    for (const catCode of uniqueCodes) {
      const catId = categoryMap.get(catCode);
      if (catId) {
        await prisma.industryDefaultCategory.upsert({
          where: {
            industryId_categoryId: { industryId, categoryId: catId },
          },
          update: {},
          create: { industryId, categoryId: catId },
        });
        defaultCategoryCount++;
      }
    }
  }
  console.log(`Seeded ${defaultCategoryCount} industry-category mappings`);

  // ============================================================
  // 4. ADMIN USER
  // ============================================================
  const adminPasswordHash = await bcrypt.hash('AcoManage2024!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@acomanage.de' },
    update: {},
    create: {
      email: 'admin@acomanage.de',
      passwordHash: adminPasswordHash,
      firstName: 'Abdurrahman',
      lastName: 'Colak',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log('Seeded admin user (admin@acomanage.de / AcoManage2024!)');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
