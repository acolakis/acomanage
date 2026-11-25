import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import "@/lib/pdf/shared/fonts";
import { FONT_FAMILY } from "@/lib/pdf/shared/fonts";
import { colors, baseStyles } from "@/lib/pdf/shared/styles";
import {
  PageHeader,
  PageFooter,
  SectionTitle,
  InfoRow,
  InfoGrid,
  Divider,
  SignatureBlock,
  BulletList,
  ContentBlock,
  ContentText,
  CreatedWith,
  formatDate,
} from "@/lib/pdf/shared/components";
import {
  BestellungsurkundeFormData,
  CATEGORY_META,
  DigitalCategoryCode,
} from "@/types/digital-documents";

// Default duties per category
const S02_PFLICHTEN = [
  "Kontrolle der Brandschutzeinrichtungen im zugewiesenen Bereich",
  "Vorbeugender Brandschutz — Beseitigung von Brandgefahren",
  "Bedienung der Feuerlöscheinrichtungen zur Bekämpfung von Entstehungsbränden",
  "Einweisung und Unterstützung bei der Evakuierung",
  "Zusammenarbeit mit der Feuerwehr",
];

const W01_PFLICHTEN = [
  "Erste-Hilfe-Leistung bei Unfällen und akuten Erkrankungen",
  "Regelmäßige Kontrolle der Erste-Hilfe-Materialien",
  "Dokumentation der Erste-Hilfe-Leistungen im Verbandbuch",
  "Teilnahme an regelmäßigen Fortbildungen (alle 2 Jahre)",
];

const A04_PFLICHTEN_LEITER = [
  "Regelmäßige Prüfung aller Leitern und Tritte gemäß BetrSichV",
  "Dokumentation der Prüfungen im Prüfbuch",
  "Sperrung und Aussonderung mangelhafter Leitern",
  "Beratung bei der Beschaffung neuer Leitern",
  "Unterweisung der Beschäftigten im Umgang mit Leitern",
];

const A04_PFLICHTEN_REGAL = [
  "Regelmäßige Prüfung aller Regale und Lagereinrichtungen gemäß DIN EN 15635",
  "Dokumentation der Prüfungen im Prüfbuch",
  "Sperrung und Kennzeichnung beschädigter Regale",
  "Beratung bei der Beschaffung und Aufstellung neuer Regale",
  "Unterweisung der Beschäftigten im Umgang mit Regalanlagen",
];

const RECHTSGRUNDLAGEN: Record<string, string> = {
  B01: "§ 6 ASiG, DGUV Vorschrift 2",
  S02: "§ 10 ArbSchG, ASR A2.2, DGUV Information 205-023",
  W01: "§ 26 DGUV Vorschrift 1, § 10 ArbSchG",
  A04: "§ 2 Abs. 7 BetrSichV, TRBS 1203",
};

const localStyles = StyleSheet.create({
  titleBlock: { marginBottom: 16 },
  mainTitle: { fontSize: 22, fontWeight: 700, color: colors.black, marginBottom: 4, fontFamily: FONT_FAMILY },
  categoryTitle: { fontSize: 14, fontWeight: 700, color: colors.primary, marginBottom: 2, fontFamily: FONT_FAMILY },
  companyName: { fontSize: 13, color: colors.darkGray, marginBottom: 4, fontFamily: FONT_FAMILY },
  appointmentText: { fontSize: 10, lineHeight: 1.8, color: colors.darkGray, marginBottom: 12, fontFamily: FONT_FAMILY },
  boldText: { fontWeight: 700, fontFamily: FONT_FAMILY },
  legalBasis: { fontSize: 9, color: colors.gray, fontStyle: "italic", fontFamily: FONT_FAMILY },
});

interface DocumentData {
  id: string;
  categoryCode: string;
  title: string;
  formData: BestellungsurkundeFormData;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

function TitleSection({ data }: { data: DocumentData }) {
  const meta = CATEGORY_META[data.categoryCode];
  return (
    <View style={localStyles.titleBlock}>
      <Text style={localStyles.mainTitle}>Bestellungsurkunde</Text>
      <Text style={localStyles.companyName}>{data.company.name}</Text>
      <Divider />
      <Text style={localStyles.categoryTitle}>
        {meta?.label || data.title}
      </Text>
    </View>
  );
}

function AppointmentSection({ data }: { data: DocumentData }) {
  const fd = data.formData;
  const code = data.categoryCode as DigitalCategoryCode;
  const personName = `${fd.person.name}`;
  const position = fd.person.position ? `, ${fd.person.position}` : "";

  let appointmentText = "";
  switch (code) {
    case "B01":
      appointmentText = `Hiermit wird ${personName}${position} gemäß § 6 ASiG und DGUV Vorschrift 2 als Fachkraft für Arbeitssicherheit bestellt.`;
      break;
    case "S02":
      appointmentText = `Hiermit wird ${personName}${position} gemäß § 10 ArbSchG und ASR A2.2 als Brandschutzhelfer/in bestellt.`;
      break;
    case "W01":
      appointmentText = `Hiermit wird ${personName}${position} gemäß § 26 DGUV Vorschrift 1 als Ersthelfer/in bestellt.`;
      break;
    case "A04":
      appointmentText = `Hiermit wird ${personName}${position} gemäß § 2 Abs. 7 BetrSichV als Befähigte Person für die Prüfung von ${fd.pruefgegenstand || "Leitern/Regalen"} bestellt.`;
      break;
    default:
      appointmentText = `Hiermit wird ${personName}${position} bestellt.`;
  }

  return (
    <View>
      <Text style={localStyles.appointmentText}>{appointmentText}</Text>
    </View>
  );
}

function DetailsSection({ data }: { data: DocumentData }) {
  const fd = data.formData;
  const code = data.categoryCode;

  return (
    <View>
      <SectionTitle>Angaben zur Person</SectionTitle>
      <InfoGrid>
        <InfoRow label="Name:" value={fd.person.name} />
        {fd.person.position && <InfoRow label="Position:" value={fd.person.position} />}
        {fd.person.qualifications && <InfoRow label="Qualifikationen:" value={fd.person.qualifications} />}
        {fd.person.department && <InfoRow label="Abteilung:" value={fd.person.department} />}
        <InfoRow label="Datum:" value={formatDate(fd.datum)} />
        <InfoRow label="Rechtsgrundlage:" value={fd.rechtsgrundlage || RECHTSGRUNDLAGEN[code] || ""} />
      </InfoGrid>

      {/* B01-specific SIFA details */}
      {code === "B01" && (
        <View>
          <SectionTitle>SIFA-Büro</SectionTitle>
          <InfoGrid>
            {fd.sifaBuero && <InfoRow label="Büro:" value={fd.sifaBuero} />}
            {fd.sifaBueroAdresse && <InfoRow label="Adresse:" value={fd.sifaBueroAdresse} />}
            {fd.sifaTelefon && <InfoRow label="Telefon:" value={fd.sifaTelefon} />}
            {fd.sifaMobil && <InfoRow label="Mobil:" value={fd.sifaMobil} />}
            {fd.einsatzstunden && <InfoRow label="Einsatzstunden/Jahr:" value={fd.einsatzstunden} />}
            {fd.startDatum && <InfoRow label="Beginn:" value={formatDate(fd.startDatum)} />}
          </InfoGrid>
        </View>
      )}

      {/* A04: Prüfgegenstand und Intervall */}
      {code === "A04" && (
        <View>
          <InfoGrid>
            {fd.pruefgegenstand && <InfoRow label="Prüfgegenstand:" value={fd.pruefgegenstand} />}
            {fd.pruefintervall && <InfoRow label="Prüfintervall:" value={fd.pruefintervall} />}
          </InfoGrid>
        </View>
      )}
    </View>
  );
}

function DutiesSection({ data }: { data: DocumentData }) {
  const fd = data.formData;
  const code = data.categoryCode as DigitalCategoryCode;

  let duties = fd.pflichten || [];
  if (duties.length === 0) {
    switch (code) {
      case "S02": duties = S02_PFLICHTEN; break;
      case "W01": duties = W01_PFLICHTEN; break;
      case "A04":
        duties = fd.pruefgegenstand === "Regale" ? A04_PFLICHTEN_REGAL : A04_PFLICHTEN_LEITER;
        break;
    }
  }

  if (duties.length === 0) return null;

  return (
    <View>
      <SectionTitle>Pflichten und Aufgaben</SectionTitle>
      <BulletList items={duties} />
    </View>
  );
}

function W01DguvSection({ data }: { data: DocumentData }) {
  if (data.categoryCode !== "W01") return null;

  return (
    <View style={{ marginTop: 12 }}>
      <SectionTitle>Hinweis gemäß DGUV Vorschrift 1 § 26</SectionTitle>
      <ContentBlock>
        <ContentText>
          Der Unternehmer hat dafür zu sorgen, dass für die Erste-Hilfe-Leistung
          Ersthelfer mindestens in folgender Zahl zur Verfügung stehen:
          {"\n"}• Bei 2 bis zu 20 anwesenden Versicherten — ein Ersthelfer
          {"\n"}• Bei mehr als 20 anwesenden Versicherten:
          {"\n"}  - in Verwaltungs- und Handelsbetrieben 5% der Versicherten
          {"\n"}  - in sonstigen Betrieben 10% der Versicherten
          {"\n\n"}Die Ersthelferausbildung erfolgt in einem 9 UE umfassenden Erste-Hilfe-Lehrgang.
          Die Fortbildung (9 UE) ist alle zwei Jahre erforderlich.
        </ContentText>
      </ContentBlock>
    </View>
  );
}

function SignatureSection({ data }: { data: DocumentData }) {
  return (
    <View wrap={false}>
      <SignatureBlock
        lines={[
          { label: "Geschäftsführer/in", name: "" },
          { label: "Bestellte Person", name: data.formData.person.name },
        ]}
      />
      <CreatedWith />
    </View>
  );
}

function BestellungsurkundeDocument({ data }: { data: DocumentData }) {
  const meta = CATEGORY_META[data.categoryCode];
  return (
    <Document
      title={`Bestellungsurkunde - ${meta?.label || data.title} - ${data.company.name}`}
      author="AcoManage"
      subject="Bestellungsurkunde"
    >
      <Page size="A4" style={baseStyles.page}>
        <PageHeader
          left={data.company.name}
          center="Bestellungsurkunde"
          right={formatDate(data.formData.datum)}
        />
        <PageFooter label="Bestellungsurkunde" />
        <TitleSection data={data} />
        <AppointmentSection data={data} />
        <DetailsSection data={data} />
        <DutiesSection data={data} />
        <W01DguvSection data={data} />
        <SignatureSection data={data} />
      </Page>
    </Document>
  );
}

export async function renderBestellungsurkunde(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <BestellungsurkundeDocument data={document} />
  );
  return Buffer.from(buffer);
}

export {
  S02_PFLICHTEN,
  W01_PFLICHTEN,
  A04_PFLICHTEN_LEITER,
  A04_PFLICHTEN_REGAL,
};
