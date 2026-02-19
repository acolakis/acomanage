import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type RiskLevel = 'NIEDRIG' | 'MITTEL' | 'HOCH' | 'KRITISCH';

interface TemplateItem {
  itemKey: string;
  label: string;
  description?: string;
  legalReference?: string;
  suggestedMeasure: string;
  defaultRiskLevel: RiskLevel;
}

interface TemplateSection {
  sectionCode: string;
  title: string;
  items: TemplateItem[];
}

interface IndustryTemplate {
  industryCode: string;
  name: string;
  description: string;
  sections: TemplateSection[];
}

// ============================================================
// SHARED SECTIONS (used across multiple templates)
// ============================================================

const sharedBrandschutz: TemplateSection = {
  sectionCode: "BRAND",
  title: "Brandschutz & Notfallmanagement",
  items: [
    { itemKey: "BRAND-01", label: "Feuerlöscher vorhanden und geprüft (max. 2 Jahre)", legalReference: "ASR A2.2", suggestedMeasure: "Fehlende/abgelaufene Feuerlöscher ersetzen, Prüftermine dokumentieren", defaultRiskLevel: "HOCH" },
    { itemKey: "BRAND-02", label: "Feuerlöscher frei zugänglich und gekennzeichnet", legalReference: "ASR A2.2", suggestedMeasure: "Zugang zu Feuerlöschern freiräumen, Kennzeichnung anbringen", defaultRiskLevel: "HOCH" },
    { itemKey: "BRAND-03", label: "Flucht- und Rettungswege frei und gekennzeichnet", legalReference: "ASR A2.3", suggestedMeasure: "Fluchtwege sofort freiräumen, Kennzeichnung erneuern", defaultRiskLevel: "KRITISCH" },
    { itemKey: "BRAND-04", label: "Flucht- und Rettungsplan vorhanden und aktuell", legalReference: "ASR A2.3", suggestedMeasure: "Flucht- und Rettungsplan erstellen/aktualisieren und aushängen", defaultRiskLevel: "HOCH" },
    { itemKey: "BRAND-05", label: "Notbeleuchtung vorhanden und funktionsfähig", legalReference: "ASR A3.4/3", suggestedMeasure: "Notbeleuchtung installieren/reparieren, jährliche Prüfung veranlassen", defaultRiskLevel: "HOCH" },
    { itemKey: "BRAND-06", label: "Brandschutzordnung vorhanden (Teil A, B, C)", legalReference: "DIN 14096", suggestedMeasure: "Brandschutzordnung erstellen und an alle Beschäftigten verteilen", defaultRiskLevel: "MITTEL" },
    { itemKey: "BRAND-07", label: "Brandschutzhelfer ausgebildet (mind. 5%)", legalReference: "ASR A2.2, DGUV I 205-023", suggestedMeasure: "Ausreichend Brandschutzhelfer ausbilden lassen", defaultRiskLevel: "MITTEL" },
  ],
};

const sharedArbeitssicherheit: TemplateSection = {
  sectionCode: "ASICH",
  title: "Allgemeine Arbeitssicherheit",
  items: [
    { itemKey: "ASICH-01", label: "Verkehrswege frei und nicht eingeengt", legalReference: "ASR A1.8", suggestedMeasure: "Verkehrswege freiräumen, Mindestbreite sicherstellen", defaultRiskLevel: "MITTEL" },
    { itemKey: "ASICH-02", label: "Stolperstellen beseitigt oder gekennzeichnet", legalReference: "ASR A1.8", suggestedMeasure: "Stolperstellen beseitigen oder deutlich kennzeichnen", defaultRiskLevel: "MITTEL" },
    { itemKey: "ASICH-03", label: "Bodenbeläge rutschhemmend und intakt", legalReference: "ASR A1.5/1,2", suggestedMeasure: "Beschädigte Bodenbeläge reparieren, rutschhemmende Beläge einsetzen", defaultRiskLevel: "MITTEL" },
    { itemKey: "ASICH-04", label: "Beleuchtung ausreichend in allen Arbeitsbereichen", legalReference: "ASR A3.4", suggestedMeasure: "Beleuchtung verstärken, defekte Leuchtmittel austauschen", defaultRiskLevel: "NIEDRIG" },
    { itemKey: "ASICH-05", label: "Treppen und Geländer in ordnungsgemäßem Zustand", legalReference: "ASR A1.8", suggestedMeasure: "Geländer reparieren, rutschhemmende Treppenstufenmarkierungen anbringen", defaultRiskLevel: "HOCH" },
    { itemKey: "ASICH-06", label: "Ordnung und Sauberkeit am Arbeitsplatz", suggestedMeasure: "Aufräumarbeiten durchführen, Reinigungsplan erstellen", defaultRiskLevel: "NIEDRIG" },
  ],
};

const sharedErsteHilfe: TemplateSection = {
  sectionCode: "EH",
  title: "Erste Hilfe & PSA",
  items: [
    { itemKey: "EH-01", label: "Ersthelfer bestellt (mind. 5% der Beschäftigten)", legalReference: "§ 26 DGUV V1", suggestedMeasure: "Ausreichend Ersthelfer benennen und ausbilden lassen", defaultRiskLevel: "HOCH" },
    { itemKey: "EH-02", label: "Erste-Hilfe-Material vollständig und zugänglich", legalReference: "DIN 13157/13169", suggestedMeasure: "Erste-Hilfe-Kasten auffüllen und frei zugänglich aufhängen", defaultRiskLevel: "HOCH" },
    { itemKey: "EH-03", label: "Verbandsbuch / Unfalldokumentation geführt", legalReference: "§ 24 DGUV V1", suggestedMeasure: "Verbandsbuch anlegen und bei jedem Vorfall dokumentieren", defaultRiskLevel: "MITTEL" },
    { itemKey: "EH-04", label: "Notrufnummern ausgehängt und aktuell", suggestedMeasure: "Notrufnummern aktualisieren und gut sichtbar aushängen", defaultRiskLevel: "NIEDRIG" },
    { itemKey: "EH-05", label: "PSA nach Gefährdungsbeurteilung bereitgestellt", legalReference: "§ 3 PSA-BV", suggestedMeasure: "Fehlende PSA beschaffen und den Beschäftigten bereitstellen", defaultRiskLevel: "HOCH" },
    { itemKey: "EH-06", label: "PSA wird von Beschäftigten bestimmungsgemäß getragen", legalReference: "§ 3 PSA-BV", suggestedMeasure: "Unterweisung zur PSA-Tragepflicht durchführen, Kontrolle verstärken", defaultRiskLevel: "MITTEL" },
  ],
};

const sharedOrganisation: TemplateSection = {
  sectionCode: "ORG",
  title: "Organisation & Unterweisung",
  items: [
    { itemKey: "ORG-01", label: "Gefährdungsbeurteilung vorhanden und aktuell", legalReference: "§ 5, 6 ArbSchG", suggestedMeasure: "Gefährdungsbeurteilung erstellen bzw. aktualisieren", defaultRiskLevel: "HOCH" },
    { itemKey: "ORG-02", label: "Jährliche Arbeitsschutzunterweisung durchgeführt", legalReference: "§ 12 ArbSchG", suggestedMeasure: "Unterweisungen planen und durchführen, Nachweise archivieren", defaultRiskLevel: "MITTEL" },
    { itemKey: "ORG-03", label: "Unterweisungsnachweise vorhanden und unterschrieben", suggestedMeasure: "Fehlende Unterweisungsnachweise unterschreiben lassen", defaultRiskLevel: "MITTEL" },
    { itemKey: "ORG-04", label: "Betriebsanweisungen vorhanden und zugänglich", legalReference: "§ 14 GefStoffV, § 12 BetrSichV", suggestedMeasure: "Betriebsanweisungen erstellen/aktualisieren und am Arbeitsplatz aushängen", defaultRiskLevel: "MITTEL" },
    { itemKey: "ORG-05", label: "Aushangpflichtige Gesetze zugänglich", legalReference: "ArbSchG, ArbZG, MuSchG", suggestedMeasure: "Aushangpflichtige Gesetze beschaffen und aushängen", defaultRiskLevel: "NIEDRIG" },
  ],
};

// ============================================================
// INDUSTRY-SPECIFIC TEMPLATES
// ============================================================

const gastroTemplate: IndustryTemplate = {
  industryCode: "GASTRO",
  name: "Begehungsvorlage Gastronomie / Hotellerie",
  description: "Branchenspezifische Checkliste für Restaurants, Hotels, Catering und Kantinen",
  sections: [
    { ...sharedBrandschutz, items: [
      ...sharedBrandschutz.items,
      { itemKey: "BRAND-08", label: "Küchenlöschanlage / Fettbrandlöscher vorhanden", legalReference: "VdS 2381", suggestedMeasure: "Fettbrandlöscher (Klasse F) in der Küche installieren", defaultRiskLevel: "HOCH" },
      { itemKey: "BRAND-09", label: "Fritteusen mit Thermostat und Deckel ausgestattet", suggestedMeasure: "Fritteusen mit Sicherheitsthermostat nachrüsten, Deckel bereitstellen", defaultRiskLevel: "HOCH" },
    ]},
    { ...sharedArbeitssicherheit, items: [
      ...sharedArbeitssicherheit.items,
      { itemKey: "ASICH-07", label: "Küchenboden rutschhemmend (mind. R12)", legalReference: "ASR A1.5/1,2, DGUV R 110-003", suggestedMeasure: "Rutschhemmenden Bodenbelag R12 verlegen, regelmäßige Reinigung sicherstellen", defaultRiskLevel: "HOCH" },
    ]},
    {
      sectionCode: "KUECHE",
      title: "Küchensicherheit",
      items: [
        { itemKey: "KUECHE-01", label: "Dunstabzugsanlage funktionsfähig und gereinigt", legalReference: "VDI 2052", suggestedMeasure: "Dunstabzugsanlage reinigen und Wartungsintervalle einhalten", defaultRiskLevel: "MITTEL" },
        { itemKey: "KUECHE-02", label: "Gasanschlüsse dicht und geprüft", suggestedMeasure: "Gasanschlüsse durch Fachbetrieb prüfen lassen, Leckagen sofort beheben", defaultRiskLevel: "KRITISCH" },
        { itemKey: "KUECHE-03", label: "Schnittschutzhandschuhe verfügbar", suggestedMeasure: "Schnittschutzhandschuhe beschaffen und am Arbeitsplatz bereitstellen", defaultRiskLevel: "MITTEL" },
        { itemKey: "KUECHE-04", label: "Elektrische Geräte geprüft und intakt", legalReference: "DGUV V3", suggestedMeasure: "Defekte Geräte austauschen, regelmäßige Prüfung nach DGUV V3 veranlassen", defaultRiskLevel: "MITTEL" },
        { itemKey: "KUECHE-05", label: "Messer sicher aufbewahrt (Magnetleiste/Block)", suggestedMeasure: "Magnetleiste oder Messerblock installieren", defaultRiskLevel: "NIEDRIG" },
      ],
    },
    {
      sectionCode: "HYG",
      title: "Lebensmittelhygiene & Gefahrstoffe",
      items: [
        { itemKey: "HYG-01", label: "HACCP-Konzept vorhanden und umgesetzt", legalReference: "VO (EG) 852/2004", suggestedMeasure: "HACCP-Konzept erstellen/aktualisieren, Schulung der Mitarbeiter durchführen", defaultRiskLevel: "MITTEL" },
        { itemKey: "HYG-02", label: "Kühlkette eingehalten und dokumentiert", legalReference: "VO (EG) 852/2004", suggestedMeasure: "Temperaturüberwachung installieren, Protokolle regelmäßig führen", defaultRiskLevel: "MITTEL" },
        { itemKey: "HYG-03", label: "Reinigungsmittel getrennt von Lebensmitteln gelagert", legalReference: "TRGS 510", suggestedMeasure: "Separaten Gefahrstoffschrank für Reinigungsmittel einrichten", defaultRiskLevel: "HOCH" },
        { itemKey: "HYG-04", label: "Sicherheitsdatenblätter für Reinigungsmittel vorhanden", legalReference: "§ 6 GefStoffV", suggestedMeasure: "Sicherheitsdatenblätter beschaffen und am Lagerort bereitstellen", defaultRiskLevel: "MITTEL" },
      ],
    },
    sharedErsteHilfe,
    sharedOrganisation,
  ],
};

const bauTemplate: IndustryTemplate = {
  industryCode: "BAU",
  name: "Begehungsvorlage Bauwirtschaft",
  description: "Branchenspezifische Checkliste für Hoch-/Tiefbau, Straßenbau, Dachdecker, Zimmerei",
  sections: [
    sharedBrandschutz,
    {
      sectionCode: "BAUSTELLE",
      title: "Baustelleneinrichtung",
      items: [
        { itemKey: "BAUSTELLE-01", label: "Baustellenordnung vorhanden und ausgehängt", legalReference: "BaustellV", suggestedMeasure: "Baustellenordnung erstellen und an zentraler Stelle aushängen", defaultRiskLevel: "MITTEL" },
        { itemKey: "BAUSTELLE-02", label: "SiGeKo bestellt (wenn erforderlich)", legalReference: "§ 3 BaustellV", suggestedMeasure: "Sicherheits- und Gesundheitskoordinator beauftragen", defaultRiskLevel: "HOCH" },
        { itemKey: "BAUSTELLE-03", label: "Vorankündigung bei zuständiger Behörde", legalReference: "§ 2 BaustellV", suggestedMeasure: "Vorankündigung an die Arbeitsschutzbehörde senden", defaultRiskLevel: "MITTEL" },
        { itemKey: "BAUSTELLE-04", label: "Sanitäreinrichtungen (Toiletten, Waschgelegenheiten) vorhanden", legalReference: "ASR A4.1", suggestedMeasure: "Mobile Sanitäreinrichtungen aufstellen", defaultRiskLevel: "MITTEL" },
        { itemKey: "BAUSTELLE-05", label: "Baustellensicherung gegen unbefugten Zutritt", suggestedMeasure: "Bauzaun aufstellen, Zugänge sichern und kennzeichnen", defaultRiskLevel: "MITTEL" },
      ],
    },
    {
      sectionCode: "ABSTURZ",
      title: "Absturzsicherung",
      items: [
        { itemKey: "ABSTURZ-01", label: "Absturzsicherungen ab 2m Höhe vorhanden", legalReference: "TRBS 2121", suggestedMeasure: "Geländer, Fangnetze oder PSAgA bereitstellen und montieren", defaultRiskLevel: "KRITISCH" },
        { itemKey: "ABSTURZ-02", label: "Gerüste geprüft und freigegeben", legalReference: "TRBS 2121 Teil 1", suggestedMeasure: "Gerüstprüfung durch befähigte Person durchführen, Freigabeschild anbringen", defaultRiskLevel: "KRITISCH" },
        { itemKey: "ABSTURZ-03", label: "Dacharbeiten mit Absturzsicherung", legalReference: "DGUV R 101-038", suggestedMeasure: "Seitenschutz oder Auffangnetze installieren, PSAgA bereitstellen", defaultRiskLevel: "KRITISCH" },
        { itemKey: "ABSTURZ-04", label: "Leitern standsicher aufgestellt und geprüft", legalReference: "TRBS 2121 Teil 2", suggestedMeasure: "Leiternprüfung durchführen, Aufstellwinkel 65-75° sicherstellen", defaultRiskLevel: "HOCH" },
        { itemKey: "ABSTURZ-05", label: "Öffnungen in Böden/Decken gesichert", suggestedMeasure: "Öffnungen mit tragfähigen Abdeckungen oder Geländer sichern", defaultRiskLevel: "KRITISCH" },
      ],
    },
    {
      sectionCode: "ERDARBEIT",
      title: "Erdarbeiten & Gräben",
      items: [
        { itemKey: "ERDARBEIT-01", label: "Böschungen/Verbau bei Gräben > 1,25m", legalReference: "DIN 4124", suggestedMeasure: "Grabenverbau einbauen oder Böschungswinkel nach DIN 4124 einhalten", defaultRiskLevel: "KRITISCH" },
        { itemKey: "ERDARBEIT-02", label: "Leitungspläne vor Grabungsarbeiten eingeholt", suggestedMeasure: "Leitungspläne bei Versorgern anfordern, Handschachtung im Leitungsbereich", defaultRiskLevel: "HOCH" },
        { itemKey: "ERDARBEIT-03", label: "Sicherheitsabstand zu Baugrubenrand eingehalten", legalReference: "DIN 4124", suggestedMeasure: "Lastfreien Streifen am Grubenrand einhalten, Absperrungen aufstellen", defaultRiskLevel: "HOCH" },
      ],
    },
    { ...sharedErsteHilfe, items: [
      ...sharedErsteHilfe.items,
      { itemKey: "EH-07", label: "Rettungskonzept für Höhenarbeiten vorhanden", suggestedMeasure: "Rettungskonzept erstellen und alle Beteiligten einweisen", defaultRiskLevel: "HOCH" },
    ]},
    sharedOrganisation,
  ],
};

const handelTemplate: IndustryTemplate = {
  industryCode: "HANDEL",
  name: "Begehungsvorlage Handel / Einzelhandel",
  description: "Branchenspezifische Checkliste für Baumärkte, Supermärkte, Fachhandel",
  sections: [
    sharedBrandschutz,
    sharedArbeitssicherheit,
    {
      sectionCode: "VERKAUF",
      title: "Verkaufsräume & Lager",
      items: [
        { itemKey: "VERKAUF-01", label: "Regale standsicher und an Wand/Boden befestigt", legalReference: "DIN EN 15635", suggestedMeasure: "Regale mit Kippsicherung an Wand befestigen, Belastungsgrenzen kennzeichnen", defaultRiskLevel: "HOCH" },
        { itemKey: "VERKAUF-02", label: "Regalprüfung durchgeführt (jährlich)", legalReference: "DIN EN 15635", suggestedMeasure: "Jährliche Regalinspektion durch Sachkundigen veranlassen", defaultRiskLevel: "MITTEL" },
        { itemKey: "VERKAUF-03", label: "Leitern und Tritte in einwandfreiem Zustand", legalReference: "TRBS 2121 Teil 2", suggestedMeasure: "Defekte Leitern aussortieren, Leiternprüfung dokumentieren", defaultRiskLevel: "MITTEL" },
        { itemKey: "VERKAUF-04", label: "Fluchtwege im Verkaufsraum nicht durch Waren verstellt", legalReference: "ASR A2.3", suggestedMeasure: "Fluchtwege freiräumen, Warenaufsteller umpositionieren", defaultRiskLevel: "HOCH" },
        { itemKey: "VERKAUF-05", label: "Kassenarbeitsplätze ergonomisch gestaltet", legalReference: "ArbStättV", suggestedMeasure: "Ergonomische Sitze/Stehhilfen bereitstellen, Bildschirmhöhe anpassen", defaultRiskLevel: "NIEDRIG" },
        { itemKey: "VERKAUF-06", label: "Lagerbereiche ordentlich und sicher", suggestedMeasure: "Lagerflächen aufräumen, Stapelhöhen begrenzen, Gänge freihalten", defaultRiskLevel: "MITTEL" },
      ],
    },
    {
      sectionCode: "KUNDE",
      title: "Kundensicherheit",
      items: [
        { itemKey: "KUNDE-01", label: "Keine Stolperfallen im Kundenbereich", suggestedMeasure: "Kabelkanäle verlegen, lose Matten befestigen, Schwellen kennzeichnen", defaultRiskLevel: "MITTEL" },
        { itemKey: "KUNDE-02", label: "Warenpräsentation standsicher", suggestedMeasure: "Instabile Warenpräsentation sichern oder umgestalten", defaultRiskLevel: "MITTEL" },
        { itemKey: "KUNDE-03", label: "Einkaufswagen in ordnungsgemäßem Zustand", suggestedMeasure: "Defekte Einkaufswagen aussortieren und reparieren", defaultRiskLevel: "NIEDRIG" },
      ],
    },
    sharedErsteHilfe,
    sharedOrganisation,
  ],
};

const kfzTemplate: IndustryTemplate = {
  industryCode: "KFZ",
  name: "Begehungsvorlage KFZ / Autohaus",
  description: "Branchenspezifische Checkliste für Autowerkstätten, Autohäuser, KFZ-Handel",
  sections: [
    sharedBrandschutz,
    {
      sectionCode: "WERKSTATT",
      title: "Werkstatt & Hebebühnen",
      items: [
        { itemKey: "WERKSTATT-01", label: "Hebebühnen regelmäßig geprüft (jährlich)", legalReference: "§ 14 BetrSichV, DGUV R 100-500", suggestedMeasure: "Jährliche Hebebühnenprüfung durch befähigte Person veranlassen", defaultRiskLevel: "KRITISCH" },
        { itemKey: "WERKSTATT-02", label: "Grubensicherung (Abdeckung/Geländer) vorhanden", legalReference: "DGUV R 108-003", suggestedMeasure: "Grubenabdeckung oder umlaufendes Geländer installieren", defaultRiskLevel: "KRITISCH" },
        { itemKey: "WERKSTATT-03", label: "Druckluftanlage geprüft und gesichert", legalReference: "BetrSichV", suggestedMeasure: "Druckluftanlage prüfen lassen, Sicherheitsventile kontrollieren", defaultRiskLevel: "MITTEL" },
        { itemKey: "WERKSTATT-04", label: "Wagenheber und Unterstellböcke in Ordnung", suggestedMeasure: "Defekte Wagenheber aussortieren, Unterstellböcke bereitstellen", defaultRiskLevel: "HOCH" },
        { itemKey: "WERKSTATT-05", label: "Radmutternanzugsmoment-Kontrollgerät vorhanden", suggestedMeasure: "Kalibriertes Drehmoment-Prüfgerät beschaffen", defaultRiskLevel: "MITTEL" },
      ],
    },
    {
      sectionCode: "KFZGEF",
      title: "Gefahrstoffe KFZ",
      items: [
        { itemKey: "KFZGEF-01", label: "Ölabscheider vorhanden und gewartet", suggestedMeasure: "Ölabscheider warten, Entsorgungsnachweis führen", defaultRiskLevel: "MITTEL" },
        { itemKey: "KFZGEF-02", label: "Bremsflüssigkeit, Öle sachgerecht gelagert", legalReference: "TRGS 510", suggestedMeasure: "Gefahrstoffschrank/-lager einrichten, Auffangwannen bereitstellen", defaultRiskLevel: "MITTEL" },
        { itemKey: "KFZGEF-03", label: "Batterie-Ladeplatz belüftet und gesichert", suggestedMeasure: "Belüftung am Ladeplatz sicherstellen, Augendusche bereitstellen", defaultRiskLevel: "MITTEL" },
        { itemKey: "KFZGEF-04", label: "Absauganlage für Abgase vorhanden", legalReference: "TRGS 554", suggestedMeasure: "Abgasabsauganlage installieren oder mobile Absaugung bereitstellen", defaultRiskLevel: "HOCH" },
        { itemKey: "KFZGEF-05", label: "Klimaanlagen-Kältemittel sachgerecht gehandhabt", legalReference: "ChemKlimaschutzV", suggestedMeasure: "Nur zertifiziertes Personal einsetzen, Absauggerät verwenden", defaultRiskLevel: "MITTEL" },
      ],
    },
    {
      sectionCode: "LACK",
      title: "Karosserie & Lack",
      items: [
        { itemKey: "LACK-01", label: "Lackierkabine mit Absaugung und Explosionsschutz", legalReference: "TRGS 507, ATEX", suggestedMeasure: "Absauganlage prüfen, Ex-Schutz-Dokument erstellen", defaultRiskLevel: "HOCH" },
        { itemKey: "LACK-02", label: "Atemschutz beim Lackieren bereitgestellt", legalReference: "§ 8 GefStoffV", suggestedMeasure: "Geeigneten Atemschutz (mind. A2P2) beschaffen und bereitstellen", defaultRiskLevel: "HOCH" },
        { itemKey: "LACK-03", label: "Schweißarbeiten nur mit Absaugung", suggestedMeasure: "Mobile Schweißrauchabsaugung am Arbeitsplatz bereitstellen", defaultRiskLevel: "HOCH" },
      ],
    },
    sharedErsteHilfe,
    sharedOrganisation,
  ],
};

const handwerkTemplate: IndustryTemplate = {
  industryCode: "HANDWERK",
  name: "Begehungsvorlage Handwerk",
  description: "Branchenspezifische Checkliste für Metallbau, Schreinerei, Elektro, Sanitär",
  sections: [
    sharedBrandschutz,
    {
      sectionCode: "MASCHINEN",
      title: "Maschinen & Werkzeuge",
      items: [
        { itemKey: "MASCHINEN-01", label: "CE-Kennzeichnung an Maschinen vorhanden", legalReference: "9. ProdSV", suggestedMeasure: "Maschinen ohne CE-Kennzeichnung identifizieren und Konformität prüfen", defaultRiskLevel: "MITTEL" },
        { itemKey: "MASCHINEN-02", label: "Schutzeinrichtungen vorhanden und funktionsfähig", legalReference: "§ 6 BetrSichV", suggestedMeasure: "Fehlende Schutzeinrichtungen nachrüsten, defekte reparieren", defaultRiskLevel: "KRITISCH" },
        { itemKey: "MASCHINEN-03", label: "Not-Aus-Schalter vorhanden und frei zugänglich", suggestedMeasure: "Not-Aus-Schalter installieren und regelmäßig testen", defaultRiskLevel: "KRITISCH" },
        { itemKey: "MASCHINEN-04", label: "Regelmäßige Prüfungen durchgeführt und dokumentiert", legalReference: "§ 14, 16 BetrSichV", suggestedMeasure: "Prüfplan erstellen, Prüfungen durch befähigte Person durchführen lassen", defaultRiskLevel: "HOCH" },
        { itemKey: "MASCHINEN-05", label: "Handwerkzeuge in ordnungsgemäßem Zustand", suggestedMeasure: "Defekte Werkzeuge aussortieren und ersetzen", defaultRiskLevel: "MITTEL" },
        { itemKey: "MASCHINEN-06", label: "Betriebsanweisungen für Maschinen vorhanden", legalReference: "§ 12 BetrSichV", suggestedMeasure: "Betriebsanweisungen erstellen und an der Maschine aushängen", defaultRiskLevel: "MITTEL" },
      ],
    },
    {
      sectionCode: "STAUB",
      title: "Staub, Lärm & Vibration",
      items: [
        { itemKey: "STAUB-01", label: "Staubabsaugung an Maschinen vorhanden", legalReference: "TRGS 553, GefStoffV", suggestedMeasure: "Absauganlage installieren oder mobile Absaugung bereitstellen", defaultRiskLevel: "HOCH" },
        { itemKey: "STAUB-02", label: "Gehörschutz bei Lärm > 80 dB(A) bereitgestellt", legalReference: "LärmVibrationsArbSchV", suggestedMeasure: "Gehörschutz beschaffen und ab 80 dB(A) bereitstellen, ab 85 dB(A) Tragepflicht", defaultRiskLevel: "HOCH" },
        { itemKey: "STAUB-03", label: "Lärmbereiche gekennzeichnet", legalReference: "LärmVibrationsArbSchV", suggestedMeasure: "Lärmbereiche ab 85 dB(A) kennzeichnen und abgrenzen", defaultRiskLevel: "MITTEL" },
        { itemKey: "STAUB-04", label: "Vibrationsbelastung beurteilt", legalReference: "LärmVibrationsArbSchV", suggestedMeasure: "Vibrationsbelastung ermitteln, vibrationsarme Werkzeuge einsetzen", defaultRiskLevel: "MITTEL" },
      ],
    },
    {
      sectionCode: "ELEK",
      title: "Elektrische Sicherheit",
      items: [
        { itemKey: "ELEK-01", label: "Ortsveränderliche Geräte geprüft (DGUV V3)", legalReference: "DGUV V3, BetrSichV", suggestedMeasure: "Prüfung ortsveränderlicher Geräte veranlassen und dokumentieren", defaultRiskLevel: "MITTEL" },
        { itemKey: "ELEK-02", label: "Ortsfeste Anlagen geprüft", legalReference: "DGUV V3", suggestedMeasure: "Prüfung ortsfester Anlagen durch Elektrofachkraft veranlassen", defaultRiskLevel: "MITTEL" },
        { itemKey: "ELEK-03", label: "Keine defekten Kabel oder Steckdosen", suggestedMeasure: "Defekte Kabel und Steckdosen sofort austauschen lassen", defaultRiskLevel: "HOCH" },
        { itemKey: "ELEK-04", label: "FI-Schutzschalter vorhanden und getestet", suggestedMeasure: "FI-Schutzschalter nachrüsten und halbjährlich testen", defaultRiskLevel: "HOCH" },
      ],
    },
    sharedErsteHilfe,
    sharedOrganisation,
  ],
};

const logistikTemplate: IndustryTemplate = {
  industryCode: "LOGISTIK",
  name: "Begehungsvorlage Logistik / Transport",
  description: "Branchenspezifische Checkliste für Spedition, Lagerwirtschaft, Kurierdienste",
  sections: [
    sharedBrandschutz,
    {
      sectionCode: "FLFZ",
      title: "Flurförderzeuge & Stapler",
      items: [
        { itemKey: "FLFZ-01", label: "Fahrausweis für Staplerfahrer vorhanden", legalReference: "§ 7 DGUV V68", suggestedMeasure: "Staplerfahrer-Ausbildung veranlassen, Fahrausweis ausstellen", defaultRiskLevel: "HOCH" },
        { itemKey: "FLFZ-02", label: "Jährliche Unterweisung für Staplerfahrer", legalReference: "§ 12 ArbSchG, DGUV V68", suggestedMeasure: "Jährliche Unterweisung durchführen und dokumentieren", defaultRiskLevel: "MITTEL" },
        { itemKey: "FLFZ-03", label: "Tägliche Sichtprüfung der Stapler dokumentiert", suggestedMeasure: "Checkliste für tägliche Sichtprüfung einführen", defaultRiskLevel: "MITTEL" },
        { itemKey: "FLFZ-04", label: "Jährliche Prüfung der Flurförderzeuge", legalReference: "§ 14 BetrSichV", suggestedMeasure: "Jährliche UVV-Prüfung durch befähigte Person veranlassen", defaultRiskLevel: "HOCH" },
        { itemKey: "FLFZ-05", label: "Getrennte Verkehrswege für Fußgänger und Stapler", legalReference: "ASR A1.8", suggestedMeasure: "Fußgängerwege markieren und von Fahrwegen trennen", defaultRiskLevel: "HOCH" },
      ],
    },
    {
      sectionCode: "LAGER",
      title: "Lagerhaltung & Regale",
      items: [
        { itemKey: "LAGER-01", label: "Regale geprüft und Belastungsgrenzen gekennzeichnet", legalReference: "DIN EN 15635", suggestedMeasure: "Jährliche Regalinspektion, Tragfähigkeitsschilder anbringen", defaultRiskLevel: "HOCH" },
        { itemKey: "LAGER-02", label: "Regalanfahrschutz vorhanden", suggestedMeasure: "Anfahrschutz an Regalständern installieren", defaultRiskLevel: "MITTEL" },
        { itemKey: "LAGER-03", label: "Stapelhöhen begrenzt und eingehalten", suggestedMeasure: "Maximale Stapelhöhen festlegen und kennzeichnen", defaultRiskLevel: "MITTEL" },
        { itemKey: "LAGER-04", label: "Lagergut sicher gestapelt und gesichert", suggestedMeasure: "Ladungssicherung überprüfen, Schulung durchführen", defaultRiskLevel: "HOCH" },
      ],
    },
    {
      sectionCode: "RAMPE",
      title: "Laderampen & Verladung",
      items: [
        { itemKey: "RAMPE-01", label: "Laderampen mit Absturzsicherung", legalReference: "ASR A1.8", suggestedMeasure: "Rampensicherung (Geländer, Radvorleger) installieren", defaultRiskLevel: "HOCH" },
        { itemKey: "RAMPE-02", label: "Überladebrücken geprüft und funktionsfähig", legalReference: "BetrSichV", suggestedMeasure: "Überladebrücken prüfen lassen, Wartung veranlassen", defaultRiskLevel: "MITTEL" },
        { itemKey: "RAMPE-03", label: "Ladungssicherung bei Transportfahrzeugen", legalReference: "VDI 2700", suggestedMeasure: "Ladungssicherungsmittel bereitstellen, Unterweisung durchführen", defaultRiskLevel: "HOCH" },
      ],
    },
    sharedArbeitssicherheit,
    sharedErsteHilfe,
    sharedOrganisation,
  ],
};

const gesundheitTemplate: IndustryTemplate = {
  industryCode: "GESUNDHEIT",
  name: "Begehungsvorlage Gesundheitswesen",
  description: "Branchenspezifische Checkliste für Arztpraxen, Pflege, Orthopädietechnik",
  sections: [
    sharedBrandschutz,
    {
      sectionCode: "INFEKT",
      title: "Infektionsschutz & Hygiene",
      items: [
        { itemKey: "INFEKT-01", label: "Hygieneplan vorhanden und umgesetzt", legalReference: "§ 36 IfSG", suggestedMeasure: "Hygieneplan erstellen/aktualisieren und aushängen", defaultRiskLevel: "HOCH" },
        { itemKey: "INFEKT-02", label: "Händedesinfektionsmittel an allen Arbeitsplätzen", suggestedMeasure: "Spender für Händedesinfektion an allen Behandlungsplätzen installieren", defaultRiskLevel: "HOCH" },
        { itemKey: "INFEKT-03", label: "Nadelstichsichere Instrumente verwendet", legalReference: "TRBA 250", suggestedMeasure: "Auf nadelstichsichere Systeme umstellen", defaultRiskLevel: "KRITISCH" },
        { itemKey: "INFEKT-04", label: "Abfallentsorgung nach Kategorien (AS 18 01)", legalReference: "LAGA, TRBA 250", suggestedMeasure: "Entsorgungsbehälter nach Abfallkategorien bereitstellen und kennzeichnen", defaultRiskLevel: "HOCH" },
        { itemKey: "INFEKT-05", label: "Schutzkleidung und Handschuhe verfügbar", suggestedMeasure: "Schutzkleidung und Einmalhandschuhe in ausreichender Menge bereitstellen", defaultRiskLevel: "MITTEL" },
      ],
    },
    {
      sectionCode: "ERGO",
      title: "Ergonomie & Heben/Tragen",
      items: [
        { itemKey: "ERGO-01", label: "Hilfsmittel zum Patiententransfer vorhanden", legalReference: "DGUV R 207-010", suggestedMeasure: "Hebehilfen, Rutschbretter oder Patientenlifter beschaffen", defaultRiskLevel: "HOCH" },
        { itemKey: "ERGO-02", label: "Rückenschonendes Arbeiten geschult", suggestedMeasure: "Rückenschulkurse für Pflegepersonal anbieten", defaultRiskLevel: "MITTEL" },
        { itemKey: "ERGO-03", label: "Höhenverstellbare Behandlungsliegen vorhanden", suggestedMeasure: "Elektrisch höhenverstellbare Liegen beschaffen", defaultRiskLevel: "MITTEL" },
      ],
    },
    {
      sectionCode: "MEDGEF",
      title: "Medizinische Gefahrstoffe",
      items: [
        { itemKey: "MEDGEF-01", label: "Gefahrstoffverzeichnis für Desinfektionsmittel etc.", legalReference: "§ 6 GefStoffV", suggestedMeasure: "Gefahrstoffverzeichnis erstellen und aktuell halten", defaultRiskLevel: "MITTEL" },
        { itemKey: "MEDGEF-02", label: "Zytostatika-Handling nach TRGS 525 (wenn zutreffend)", legalReference: "TRGS 525", suggestedMeasure: "Sicherheitswerkbank bereitstellen, Schutzkleidung tragen", defaultRiskLevel: "KRITISCH" },
        { itemKey: "MEDGEF-03", label: "Narkosegasabsaugung funktionsfähig (wenn zutreffend)", suggestedMeasure: "Absauganlage prüfen und Wartung dokumentieren", defaultRiskLevel: "HOCH" },
      ],
    },
    sharedArbeitssicherheit,
    sharedErsteHilfe,
    sharedOrganisation,
  ],
};

const verwaltungTemplate: IndustryTemplate = {
  industryCode: "VERWALTUNG",
  name: "Begehungsvorlage Verwaltung / Büro",
  description: "Branchenspezifische Checkliste für Bürotätigkeiten, Verwaltung, Dienstleistung",
  sections: [
    sharedBrandschutz,
    {
      sectionCode: "BILDSCHIRM",
      title: "Bildschirmarbeitsplätze",
      items: [
        { itemKey: "BILDSCHIRM-01", label: "Bildschirm blendfrei aufgestellt (seitlich zum Fenster)", legalReference: "ArbStättV Anhang 6", suggestedMeasure: "Bildschirm seitlich zum Fenster positionieren, Blendschutz anbringen", defaultRiskLevel: "NIEDRIG" },
        { itemKey: "BILDSCHIRM-02", label: "Ergonomischer Bürostuhl vorhanden", legalReference: "ArbStättV Anhang 6", suggestedMeasure: "Ergonomischen Bürostuhl mit verstellbarer Rückenlehne bereitstellen", defaultRiskLevel: "MITTEL" },
        { itemKey: "BILDSCHIRM-03", label: "Bildschirmoberkante auf Augenhöhe", suggestedMeasure: "Bildschirmhöhe anpassen, ggf. Monitorhalterung verwenden", defaultRiskLevel: "NIEDRIG" },
        { itemKey: "BILDSCHIRM-04", label: "Separate Tastatur und Maus (bei Laptop)", suggestedMeasure: "Externe Tastatur und Maus sowie Laptopständer bereitstellen", defaultRiskLevel: "NIEDRIG" },
        { itemKey: "BILDSCHIRM-05", label: "Arbeitsplatzbeleuchtung ausreichend (mind. 500 Lux)", legalReference: "ASR A3.4", suggestedMeasure: "Arbeitsplatzleuchte bereitstellen, Beleuchtungsstärke messen", defaultRiskLevel: "NIEDRIG" },
        { itemKey: "BILDSCHIRM-06", label: "Bildschirmarbeitsplatz-Vorsorge angeboten", legalReference: "ArbMedVV", suggestedMeasure: "Angebotsvorsorge für Bildschirmarbeit veranlassen", defaultRiskLevel: "NIEDRIG" },
      ],
    },
    {
      sectionCode: "KLIMA",
      title: "Raumklima & Ergonomie",
      items: [
        { itemKey: "KLIMA-01", label: "Raumtemperatur angemessen (mind. 20°C)", legalReference: "ASR A3.5", suggestedMeasure: "Heizung prüfen, bei Hitze Sonnenschutz und Getränke bereitstellen", defaultRiskLevel: "NIEDRIG" },
        { itemKey: "KLIMA-02", label: "Ausreichende Belüftung/Lüftungsmöglichkeit", legalReference: "ASR A3.6", suggestedMeasure: "Regelmäßiges Stoßlüften ermöglichen oder Lüftungsanlage warten", defaultRiskLevel: "NIEDRIG" },
        { itemKey: "KLIMA-03", label: "Lärmpegel im Büro < 55 dB(A)", legalReference: "ASR A3.7", suggestedMeasure: "Schallschutzmaßnahmen ergreifen (Trennwände, Akustikdecken)", defaultRiskLevel: "NIEDRIG" },
        { itemKey: "KLIMA-04", label: "Bewegungsfläche am Arbeitsplatz mind. 1,5 m²", legalReference: "ASR A1.2", suggestedMeasure: "Arbeitsplatz umgestalten, ausreichende Bewegungsfläche sicherstellen", defaultRiskLevel: "NIEDRIG" },
      ],
    },
    sharedArbeitssicherheit,
    sharedErsteHilfe,
    sharedOrganisation,
  ],
};

const chemieTemplate: IndustryTemplate = {
  industryCode: "CHEMIE",
  name: "Begehungsvorlage Chemie / Pharma",
  description: "Branchenspezifische Checkliste für Chemische Industrie, Pharmazeutische Herstellung",
  sections: [
    { ...sharedBrandschutz, items: [
      ...sharedBrandschutz.items,
      { itemKey: "BRAND-08", label: "Explosionsschutzdokument vorhanden", legalReference: "GefStoffV, BetrSichV", suggestedMeasure: "Explosionsschutzdokument erstellen und regelmäßig aktualisieren", defaultRiskLevel: "KRITISCH" },
      { itemKey: "BRAND-09", label: "Ex-Zonen ausgewiesen und gekennzeichnet", legalReference: "ATEX, BetrSichV", suggestedMeasure: "Ex-Zonen-Plan erstellen, Zonen kennzeichnen, ex-geschützte Geräte einsetzen", defaultRiskLevel: "KRITISCH" },
    ]},
    {
      sectionCode: "CHEMGEF",
      title: "Gefahrstoffe & Lagerung",
      items: [
        { itemKey: "CHEMGEF-01", label: "Gefahrstoffverzeichnis vollständig und aktuell", legalReference: "§ 6 GefStoffV", suggestedMeasure: "Gefahrstoffverzeichnis aktualisieren, alle Stoffe erfassen", defaultRiskLevel: "HOCH" },
        { itemKey: "CHEMGEF-02", label: "Sicherheitsdatenblätter für alle Stoffe vorhanden", legalReference: "§ 6 GefStoffV", suggestedMeasure: "Fehlende SDB anfordern und am Arbeitsplatz bereitstellen", defaultRiskLevel: "HOCH" },
        { itemKey: "CHEMGEF-03", label: "Gefahrstofflager nach TRGS 510 eingerichtet", legalReference: "TRGS 510", suggestedMeasure: "Gefahrstofflager mit Auffangwannen, Lüftung und Zugangskontrolle einrichten", defaultRiskLevel: "HOCH" },
        { itemKey: "CHEMGEF-04", label: "Zusammenlagerungsverbote eingehalten", legalReference: "TRGS 510", suggestedMeasure: "Lagerung nach Zusammenlagerungstabelle TRGS 510 überprüfen und umstellen", defaultRiskLevel: "HOCH" },
        { itemKey: "CHEMGEF-05", label: "Substitutionsprüfung für CMR-Stoffe durchgeführt", legalReference: "§ 6 GefStoffV", suggestedMeasure: "Substitutionsprüfung dokumentieren, weniger gefährliche Alternativen einsetzen", defaultRiskLevel: "HOCH" },
      ],
    },
    {
      sectionCode: "ABSAUG",
      title: "Absaugung & Notfalleinrichtungen",
      items: [
        { itemKey: "ABSAUG-01", label: "Absaugung an Arbeitsplätzen mit Gefahrstofffreisetzung", legalReference: "§ 9 GefStoffV", suggestedMeasure: "Technische Lüftung/Absaugung installieren oder verbessern", defaultRiskLevel: "HOCH" },
        { itemKey: "ABSAUG-02", label: "Notduschen und Augenduschen vorhanden und geprüft", legalReference: "TRGS 526, DIN 12899", suggestedMeasure: "Notduschen installieren, wöchentlich Funktion prüfen", defaultRiskLevel: "KRITISCH" },
        { itemKey: "ABSAUG-03", label: "Gaswarnanlage vorhanden und kalibriert (wenn erforderlich)", suggestedMeasure: "Gaswarnanlage installieren und regelmäßig kalibrieren lassen", defaultRiskLevel: "KRITISCH" },
        { itemKey: "ABSAUG-04", label: "Bindemittel für Chemikalienverschüttung vorhanden", suggestedMeasure: "Chemikalienbindemittel beschaffen und an zugänglichem Ort lagern", defaultRiskLevel: "MITTEL" },
      ],
    },
    sharedArbeitssicherheit,
    sharedErsteHilfe,
    sharedOrganisation,
  ],
};

const metallTemplate: IndustryTemplate = {
  industryCode: "METALL",
  name: "Begehungsvorlage Metallindustrie",
  description: "Branchenspezifische Checkliste für Metallverarbeitung, Maschinenbau, Gießerei",
  sections: [
    sharedBrandschutz,
    {
      sectionCode: "WZMASCH",
      title: "Werkzeugmaschinen",
      items: [
        { itemKey: "WZMASCH-01", label: "Schutzeinrichtungen an Dreh-, Fräs-, Bohrmaschinen", legalReference: "§ 6 BetrSichV", suggestedMeasure: "Fehlende Schutzeinrichtungen nachrüsten, Schutzhaube installieren", defaultRiskLevel: "KRITISCH" },
        { itemKey: "WZMASCH-02", label: "Spänefangeinrichtungen vorhanden", suggestedMeasure: "Spänefang installieren, regelmäßige Reinigung sicherstellen", defaultRiskLevel: "MITTEL" },
        { itemKey: "WZMASCH-03", label: "Kühlschmierstoffe überwacht und gewartet", legalReference: "TRGS 611", suggestedMeasure: "KSS-Konzentrationen messen, biologische Belastung prüfen, Wechselintervalle einhalten", defaultRiskLevel: "MITTEL" },
        { itemKey: "WZMASCH-04", label: "Not-Aus-Schalter an allen Maschinen funktionsfähig", suggestedMeasure: "Not-Aus-Schalter prüfen und regelmäßig testen", defaultRiskLevel: "KRITISCH" },
        { itemKey: "WZMASCH-05", label: "Betriebsanweisungen an Maschinen ausgehängt", legalReference: "§ 12 BetrSichV", suggestedMeasure: "Betriebsanweisungen erstellen und an der Maschine aushängen", defaultRiskLevel: "MITTEL" },
      ],
    },
    {
      sectionCode: "SCHWEISS",
      title: "Schweißen & Schneiden",
      items: [
        { itemKey: "SCHWEISS-01", label: "Schweißrauchabsaugung vorhanden", legalReference: "TRGS 528", suggestedMeasure: "Punktabsaugung oder Absaugbrenner am Schweißarbeitsplatz installieren", defaultRiskLevel: "HOCH" },
        { itemKey: "SCHWEISS-02", label: "Schweißerschutzausrüstung bereitgestellt", legalReference: "§ 3 PSA-BV", suggestedMeasure: "Schweißerhelm, -schürze, -handschuhe bereitstellen", defaultRiskLevel: "HOCH" },
        { itemKey: "SCHWEISS-03", label: "Gasflaschen gesichert aufgestellt", suggestedMeasure: "Gasflaschen mit Ketten sichern, Ventilschutzkappen aufsetzen", defaultRiskLevel: "HOCH" },
        { itemKey: "SCHWEISS-04", label: "Schweißerlaubnis bei Arbeiten außerhalb fester Plätze", suggestedMeasure: "Schweißerlaubnisschein einführen und konsequent anwenden", defaultRiskLevel: "HOCH" },
      ],
    },
    {
      sectionCode: "METLAERM",
      title: "Lärm & Vibration",
      items: [
        { itemKey: "METLAERM-01", label: "Gehörschutz bei Lärm > 80 dB(A) bereitgestellt", legalReference: "LärmVibrationsArbSchV", suggestedMeasure: "Gehörschutz beschaffen, ab 85 dB(A) Tragepflicht durchsetzen", defaultRiskLevel: "HOCH" },
        { itemKey: "METLAERM-02", label: "Lärmbereiche ab 85 dB(A) gekennzeichnet", legalReference: "LärmVibrationsArbSchV", suggestedMeasure: "Lärmbereiche mit Schildern kennzeichnen und abgrenzen", defaultRiskLevel: "MITTEL" },
        { itemKey: "METLAERM-03", label: "Lärmminderungsmaßnahmen geprüft", suggestedMeasure: "Technische Lärmminderung prüfen (Kapselung, Dämpfung, Entkopplung)", defaultRiskLevel: "MITTEL" },
      ],
    },
    sharedArbeitssicherheit,
    sharedErsteHilfe,
    sharedOrganisation,
  ],
};

const nahrungTemplate: IndustryTemplate = {
  industryCode: "NAHRUNG",
  name: "Begehungsvorlage Nahrungsmittelindustrie",
  description: "Branchenspezifische Checkliste für Lebensmittelverarbeitung, Bäckerei, Fleischerei",
  sections: [
    sharedBrandschutz,
    {
      sectionCode: "LEBHYG",
      title: "Lebensmittelsicherheit & Hygiene",
      items: [
        { itemKey: "LEBHYG-01", label: "HACCP-Konzept vorhanden und umgesetzt", legalReference: "VO (EG) 852/2004", suggestedMeasure: "HACCP-Konzept erstellen/aktualisieren, Schulung durchführen", defaultRiskLevel: "HOCH" },
        { itemKey: "LEBHYG-02", label: "Hygieneschulung nach § 4 LMHV jährlich durchgeführt", legalReference: "§ 4 LMHV, § 43 IfSG", suggestedMeasure: "Jährliche Hygieneschulung planen und dokumentieren", defaultRiskLevel: "MITTEL" },
        { itemKey: "LEBHYG-03", label: "Kühlkette eingehalten und dokumentiert", suggestedMeasure: "Temperaturüberwachung installieren, Protokolle führen", defaultRiskLevel: "HOCH" },
        { itemKey: "LEBHYG-04", label: "Schädlingsbekämpfung/Monitoring eingerichtet", suggestedMeasure: "Schädlingsmonitoring durch Fachbetrieb einrichten", defaultRiskLevel: "MITTEL" },
      ],
    },
    {
      sectionCode: "NAHRMASCH",
      title: "Maschinen & Anlagen",
      items: [
        { itemKey: "NAHRMASCH-01", label: "Schutzeinrichtungen an Schneid-/Mischmaschinen", legalReference: "§ 6 BetrSichV", suggestedMeasure: "Schutzeinrichtungen prüfen, fehlende nachrüsten", defaultRiskLevel: "KRITISCH" },
        { itemKey: "NAHRMASCH-02", label: "Schnittschutzhandschuhe bei Schneidarbeiten", suggestedMeasure: "Schnittschutzhandschuhe beschaffen und Tragepflicht anordnen", defaultRiskLevel: "HOCH" },
        { itemKey: "NAHRMASCH-03", label: "Reinigung der Maschinen nach Hygieneplan", suggestedMeasure: "Maschinenreinigungs-Checkliste erstellen und einhalten", defaultRiskLevel: "MITTEL" },
      ],
    },
    {
      sectionCode: "NAHRKLIMA",
      title: "Klima & Belastungen",
      items: [
        { itemKey: "NAHRKLIMA-01", label: "Kälteschutz in Kühlräumen vorhanden", suggestedMeasure: "Kälteschutzkleidung bereitstellen, Aufenthaltszeiten begrenzen", defaultRiskLevel: "MITTEL" },
        { itemKey: "NAHRKLIMA-02", label: "Hitzeschutz bei Backöfen/Kochstellen", suggestedMeasure: "Hitzeschutzhandschuhe bereitstellen, Lüftung verbessern", defaultRiskLevel: "MITTEL" },
        { itemKey: "NAHRKLIMA-03", label: "Böden rutschhemmend (mind. R12 in Nassbereich)", legalReference: "ASR A1.5/1,2, DGUV R 110-003", suggestedMeasure: "Rutschhemmende Bodenbeläge verlegen, regelmäßige Reinigung", defaultRiskLevel: "HOCH" },
      ],
    },
    sharedArbeitssicherheit,
    sharedErsteHilfe,
    sharedOrganisation,
  ],
};

const sonstigeTemplate: IndustryTemplate = {
  industryCode: "SONSTIGE",
  name: "Universale Begehungsvorlage",
  description: "Standardvorlage für Betriebsbegehungen mit allen relevanten Prüfbereichen",
  sections: [
    sharedBrandschutz,
    sharedArbeitssicherheit,
    sharedErsteHilfe,
    sharedOrganisation,
    {
      sectionCode: "ELEK",
      title: "Elektrische Sicherheit",
      items: [
        { itemKey: "ELEK-01", label: "Ortsveränderliche Geräte geprüft (DGUV V3)", legalReference: "DGUV V3, BetrSichV", suggestedMeasure: "Prüfung ortsveränderlicher Geräte veranlassen und dokumentieren", defaultRiskLevel: "MITTEL" },
        { itemKey: "ELEK-02", label: "Ortsfeste Anlagen geprüft", legalReference: "DGUV V3", suggestedMeasure: "Prüfung durch Elektrofachkraft veranlassen", defaultRiskLevel: "MITTEL" },
        { itemKey: "ELEK-03", label: "Keine defekten Kabel oder Steckdosen", suggestedMeasure: "Defekte Kabel sofort austauschen lassen", defaultRiskLevel: "HOCH" },
        { itemKey: "ELEK-04", label: "FI-Schutzschalter vorhanden und getestet", suggestedMeasure: "FI-Schutzschalter nachrüsten und halbjährlich testen", defaultRiskLevel: "HOCH" },
      ],
    },
  ],
};

// ============================================================
// ALL TEMPLATES
// ============================================================

const allTemplates: IndustryTemplate[] = [
  gastroTemplate,
  bauTemplate,
  handelTemplate,
  kfzTemplate,
  handwerkTemplate,
  logistikTemplate,
  gesundheitTemplate,
  verwaltungTemplate,
  chemieTemplate,
  metallTemplate,
  nahrungTemplate,
  sonstigeTemplate,
];

// ============================================================
// SEED FUNCTION
// ============================================================

async function main() {
  console.log('Seeding inspection templates...');

  // Fetch industries to link templates
  const industries = await prisma.industry.findMany();
  const industryMap = new Map(industries.map(i => [i.code, i.id]));

  for (const tmpl of allTemplates) {
    const industryId = industryMap.get(tmpl.industryCode) || null;
    const templateId = `template-${tmpl.industryCode.toLowerCase()}`;

    // Upsert the template
    const template = await prisma.inspectionTemplate.upsert({
      where: { id: templateId },
      update: {
        name: tmpl.name,
        description: tmpl.description,
        industryId,
      },
      create: {
        id: templateId,
        name: tmpl.name,
        description: tmpl.description,
        industryId,
        isActive: true,
      },
    });

    // Delete existing sections (to allow re-running)
    await prisma.inspectionTemplateItem.deleteMany({
      where: { section: { templateId: template.id } },
    });
    await prisma.inspectionTemplateSection.deleteMany({
      where: { templateId: template.id },
    });

    // Create sections and items
    let totalItems = 0;
    for (let sIdx = 0; sIdx < tmpl.sections.length; sIdx++) {
      const sectionDef = tmpl.sections[sIdx];
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
            suggestedMeasure: itemDef.suggestedMeasure,
            defaultRiskLevel: itemDef.defaultRiskLevel,
            sortOrder: iIdx + 1,
          },
        });
      }
      totalItems += sectionDef.items.length;
    }

    console.log(`  ${tmpl.name}: ${tmpl.sections.length} Sektionen, ${totalItems} Items`);
  }

  // Also keep/update the old universal-template to point to SONSTIGE
  const sonstigeId = industryMap.get('SONSTIGE') || null;
  await prisma.inspectionTemplate.upsert({
    where: { id: 'universal-template' },
    update: {
      name: 'Universale Begehungsvorlage (Legacy)',
      industryId: sonstigeId,
    },
    create: {
      id: 'universal-template',
      name: 'Universale Begehungsvorlage (Legacy)',
      description: 'Standardvorlage — verwenden Sie stattdessen die branchenspezifische Vorlage',
      industryId: sonstigeId,
      isActive: true,
    },
  });

  console.log('\nSeeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding inspection templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
