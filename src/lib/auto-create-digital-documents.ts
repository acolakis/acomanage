import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { DIGITAL_CATEGORIES, CATEGORY_META } from "@/types/digital-documents";

/**
 * Default form data for each digital document category.
 * These are pre-filled with sensible defaults so the user only needs to complete them.
 */
function getDefaultFormData(categoryCode: string): Record<string, unknown> {
  switch (categoryCode) {
    // === Unterweisungsnachweise ===
    case "G01":
      return {
        topics: [
          "Allgemeine Sicherheitsregeln im Betrieb",
          "Verhalten im Brandfall / Flucht- und Rettungswege",
          "Erste Hilfe / Ersthelfer im Betrieb",
          "Persönliche Schutzausrüstung (PSA)",
          "Gefahrstoffe im Betrieb",
          "Ordnung und Sauberkeit am Arbeitsplatz",
          "Meldung von Unfällen und Beinahe-Unfällen",
          "Rechte und Pflichten der Beschäftigten",
        ].map((label) => ({ label, checked: false })),
        rechtsgrundlage: "§ 12 ArbSchG, § 4 DGUV Vorschrift 1",
        participants: [],
      };
    case "G05":
      return {
        spezifischeItems: [],
        rechtsgrundlage: "§ 12 ArbSchG, § 12 BetrSichV",
        participants: [],
      };
    case "G06":
      return {
        inhaltTitel: "",
        inhaltText: "",
        rechtsgrundlage: "§ 12 ArbSchG, § 4 DGUV Vorschrift 1",
        participants: [],
      };
    case "IJ07":
      return {
        spezifischeItems: [],
        rechtsgrundlage: "§ 14 GefStoffV, § 12 ArbSchG",
        participants: [],
      };
    case "S02_EVAK":
      return {
        topics: [
          "Alarmierung / Alarmzeichen",
          "Flucht- und Rettungswege",
          "Sammelplatz",
          "Verhalten bei Evakuierung",
          "Evakuierungshelfer und deren Aufgaben",
          "Vollzähligkeitskontrolle",
          "Besondere Personengruppen (Besucher, mobilitätseingeschränkte Personen)",
        ].map((label) => ({ label, checked: false })),
        rechtsgrundlage: "§ 10 ArbSchG, ASR A2.3",
        participants: [],
      };
    case "PQ02_UW":
      return {
        topics: [
          "Arbeitsschutzinformation gelesen und verstanden",
          "Sicherheitsregeln des Betriebs sind bekannt",
          "Persönliche Schutzausrüstung wird getragen",
          "Flucht- und Rettungswege sind bekannt",
          "Ansprechpartner für Arbeitssicherheit benannt",
        ].map((label) => ({ label, checked: false })),
        rechtsgrundlage: "§ 8 ArbSchG, § 6 DGUV Vorschrift 1",
        participants: [],
      };

    // === Bestellungsurkunden ===
    case "B01":
      return {
        person: { name: "", position: "Fachkraft für Arbeitssicherheit" },
        rechtsgrundlage: "§ 5 ASiG, DGUV Vorschrift 2",
      };
    case "B01_AUSWEIS":
      return {
        sifaName: "",
        sifaTelefon: "",
        sifaMobil: "",
        sifaBuero: "",
        sifaBueroAdresse: "",
      };
    case "S02":
      return {
        person: { name: "", position: "Brandschutzhelfer/in" },
        pflichten: [
          "Regelmäßige Kontrolle der Brandschutzeinrichtungen",
          "Vorbeugender Brandschutz im zugewiesenen Bereich",
          "Unterstützung bei der Evakuierung",
          "Bedienung von Feuerlöscheinrichtungen",
          "Zusammenarbeit mit der Feuerwehr",
        ],
        rechtsgrundlage: "§ 10 ArbSchG, ASR A2.2",
      };
    case "W01":
      return {
        person: { name: "", position: "Ersthelfer/in" },
        pflichten: [
          "Erste Hilfe leisten bei Arbeitsunfällen",
          "Regelmäßige Kontrolle der Erste-Hilfe-Materialien",
          "Dokumentation im Verbandbuch",
          "Teilnahme an Fortbildungen (alle 2 Jahre)",
        ],
        rechtsgrundlage: "DGUV Vorschrift 1, § 26",
      };
    case "A04":
      return {
        person: { name: "", position: "Befähigte Person" },
        pruefgegenstand: "Leitern",
        pruefintervall: "jährlich",
        pflichten: [
          "Regelmäßige Prüfung gemäß BetrSichV",
          "Dokumentation der Prüfergebnisse",
          "Mängel unverzüglich melden",
          "Prüfung nach Instandsetzung oder Änderung",
          "Kennzeichnung geprüfter Arbeitsmittel",
        ],
        rechtsgrundlage: "§ 2 Abs. 6 BetrSichV, TRBS 1203",
      };

    // === Beauftragungen ===
    case "A02":
      return {
        person: { name: "", position: "" },
        personAbteilung: "",
        personRolle: "",
        pflichten: [
          "Sicherstellung der Einhaltung der Arbeitsschutzvorschriften im zugewiesenen Bereich",
          "Durchführung von Gefährdungsbeurteilungen",
          "Regelmäßige Unterweisungen der unterstellten Mitarbeiter",
          "Kontrolle der Einhaltung von Sicherheitsmaßnahmen",
          "Beschaffung und Bereitstellung geeigneter PSA",
          "Meldung von Arbeitsunfällen und Beinahe-Unfällen",
          "Zusammenarbeit mit der Fachkraft für Arbeitssicherheit",
          "Zusammenarbeit mit dem Betriebsarzt",
          "Teilnahme am Arbeitsschutzausschuss (ASA)",
          "Sicherstellung der Prüfung von Arbeitsmitteln",
          "Erstellung und Aktualisierung von Betriebsanweisungen",
          "Überwachung des Gefahrstoffverzeichnisses",
          "Kontrolle der Ordnung und Sauberkeit",
          "Sicherstellung der Ersten Hilfe",
          "Brandschutzmaßnahmen überwachen",
          "Kontrolle der Zugangsberechtigungen",
          "Überwachung der Arbeitszeiten",
          "Einleitung von Korrekturmaßnahmen bei Mängeln",
          "Dokumentation aller Arbeitsschutzmaßnahmen",
          "Mitwirkung bei internen Audits",
          "Umsetzung behördlicher Auflagen",
          "Beachtung von Mutterschutz und Jugendarbeitsschutz",
          "Information der Geschäftsführung über den Arbeitsschutzstatus",
        ],
        rechtsgrundlage: "§ 13 ArbSchG, § 13 DGUV Vorschrift 1",
      };
    case "A03":
      return {
        person: { name: "" },
        fuehrerscheinKlasse: "",
        fahrzeugtypen: {
          schubmaststapler: false,
          gabelstapler: false,
          hubarbeitsbuehne: false,
          mitgaenger: false,
          innerbetrieblich: false,
          beschraenktOeffentlich: false,
          oeffentlich: false,
        },
        kontrollen: [],
      };

    // === Aushänge ===
    case "A01":
      return {
        leitsaetze: [
          "Die Sicherheit und Gesundheit unserer Mitarbeiterinnen und Mitarbeiter hat höchste Priorität.",
          "Wir verpflichten uns zur Einhaltung aller relevanten Arbeitsschutzvorschriften und -normen.",
          "Arbeitsschutz ist eine Führungsaufgabe und integraler Bestandteil aller betrieblichen Prozesse.",
          "Wir fördern das Sicherheitsbewusstsein aller Beschäftigten durch regelmäßige Schulungen und Unterweisungen.",
          "Gefährdungen werden systematisch ermittelt, bewertet und durch geeignete Maßnahmen minimiert.",
          "Wir streben die kontinuierliche Verbesserung unseres Arbeitsschutzmanagementsystems an.",
          "Arbeitsunfälle und arbeitsbedingte Erkrankungen sollen vermieden werden.",
          "Alle Mitarbeiterinnen und Mitarbeiter sind aufgefordert, aktiv am Arbeitsschutz mitzuwirken.",
        ],
        geschaeftsfuehrer: "",
      };
    case "S03":
      return {
        kontakte: [
          { rolle: "Brandschutzbeauftragter", name: "", telefon: "", durchwahl: "" },
          { rolle: "Stellvertreter", name: "", telefon: "", durchwahl: "" },
        ],
        externeKontakte: [
          { stelle: "Feuerwehr", telefon: "112" },
          { stelle: "Rettungsdienst", telefon: "112" },
          { stelle: "Polizei", telefon: "110" },
        ],
        alarmierungsText: "Bei Brandentdeckung: Ruhe bewahren, Brand melden, in Sicherheit bringen, Löschversuch unternehmen.",
      };
    case "TV01":
      return {
        sifa: { name: "", mobil: "", adresse: "", telefon: "" },
        durchgangsarzt: { name: "", adresse: "", telefon: "" },
        betriebsarzt: { name: "", adresse: "", telefon: "" },
        berufsgenossenschaft: { name: "", adresse: "", telefon: "" },
        arbeitsschutzbehoerde: { name: "", adresse: "", telefon: "" },
        ersthelfer: [],
        sicherheitsbeauftragte: "",
      };
    case "S06":
      return {
        massnahmenVor: [
          "Brandbare Stoffe und Gegenstände entfernt",
          "Öffnungen, Fugen und Ritzen abgedichtet",
          "Brandschutzabdeckungen/-abschirmungen angebracht",
          "Löschmittel bereitgestellt",
          "Brandmelder/Sprinkleranlage gesichert",
          "Zuständige Stelle informiert",
        ].map((label) => ({ label, checked: false })),
        massnahmenWaehrend: [
          "Brandwache gestellt",
          "Umgebung beobachtet",
          "Löschmittel einsatzbereit",
        ].map((label) => ({ label, checked: false })),
        massnahmenNach: [
          "Arbeitsstelle auf Brandnester kontrolliert",
          "Brandwache für mindestens 2 Stunden",
          "Nachkontrolle durchgeführt",
        ].map((label) => ({ label, checked: false })),
      };

    // === Informationsschreiben ===
    case "G01_INFO":
      return {
        themenBloecke: [
          { titel: "Verhalten im Brandfall", inhalt: ["Flucht- und Rettungswege sind gekennzeichnet und freizuhalten", "Bei Brandalarm das Gebäude sofort über die Fluchtwege verlassen", "Sammelplatz aufsuchen und auf Vollzähligkeitskontrolle warten"] },
          { titel: "Erste Hilfe", inhalt: ["Ersthelfer sind in jeder Abteilung benannt", "Standorte der Erste-Hilfe-Kästen kennen", "Jeden Unfall im Verbandbuch dokumentieren"] },
          { titel: "Persönliche Schutzausrüstung", inhalt: ["Die bereitgestellte PSA ist zu tragen", "Beschädigte PSA sofort melden und austauschen", "PSA regelmäßig auf Funktionsfähigkeit prüfen"] },
          { titel: "Gefahrstoffe", inhalt: ["Betriebsanweisungen lesen und beachten", "Gefahrstoffe nur an vorgesehenen Plätzen lagern", "Sicherheitsdatenblätter sind am Arbeitsplatz einsehbar"] },
          { titel: "Ordnung und Sauberkeit", inhalt: ["Arbeitsplatz sauber und ordentlich halten", "Verkehrswege freihalten", "Abfälle sachgerecht entsorgen"] },
        ],
        sifaBuero: "",
        geschaeftsfuehrer: "",
      };
    case "PQ01":
      return {
        fristTage: 14,
        anforderungen: [
          { titel: "Nachweis der Fachkunde", beschreibung: "Qualifikationsnachweise der eingesetzten Mitarbeiter" },
          { titel: "Gefährdungsbeurteilung", beschreibung: "Gefährdungsbeurteilung für die geplanten Tätigkeiten" },
          { titel: "Versicherungsnachweis", beschreibung: "Nachweis über Betriebs- und Berufshaftpflichtversicherung" },
          { titel: "Unterweisungsnachweise", beschreibung: "Nachweise über die Unterweisung der eingesetzten Mitarbeiter" },
          { titel: "PSA-Ausstattung", beschreibung: "Nachweis der erforderlichen persönlichen Schutzausrüstung" },
          { titel: "Arbeitsmedizinische Vorsorge", beschreibung: "Nachweise über arbeitsmedizinische Vorsorgeuntersuchungen" },
        ],
        regeln: [
          "Betreten des Betriebsgeländes nur nach Anmeldung beim Empfang",
          "Sicherheitsunterweisung vor Arbeitsbeginn ist Pflicht",
          "Persönliche Schutzausrüstung ist im gesamten Produktionsbereich zu tragen",
          "Rauchverbot im gesamten Betriebsgelände",
          "Arbeitsbereich sauber und ordentlich hinterlassen",
          "Abfälle sachgerecht trennen und entsorgen",
          "Unfälle und Beinahe-Unfälle sofort dem Auftraggeber melden",
          "Brandschutzeinrichtungen nicht blockieren",
          "Flucht- und Rettungswege freihalten",
          "Geschwindigkeitsbegrenzung auf dem Betriebsgelände beachten",
        ],
        geschaeftsfuehrer: "",
      };

    default:
      return {};
  }
}

/**
 * Automatically creates draft digital documents for a newly created company.
 * Called fire-and-forget when a company is created.
 */
export async function autoCreateDigitalDocuments(
  companyId: string,
  companyName: string,
  userId: string
): Promise<void> {
  const documents = DIGITAL_CATEGORIES.map((code) => {
    const meta = CATEGORY_META[code];
    return {
      categoryCode: code as string,
      companyId,
      title: `${meta?.label || code} — ${companyName}`,
      formData: JSON.parse(JSON.stringify(getDefaultFormData(code))),
      status: "draft",
      createdById: userId,
    };
  });

  await prisma.digitalDocument.createMany({
    data: documents,
  });

  logAudit({
    userId,
    action: "auto_create_digital_documents",
    entityType: "company",
    entityId: companyId,
    details: { count: documents.length },
  });
}
