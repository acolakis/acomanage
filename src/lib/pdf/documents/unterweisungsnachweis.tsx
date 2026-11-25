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
  ContentBlock,
  ContentText,
  Divider,
  SignatureBlock,
  ChecklistItem,
  BulletList,
  ParticipantTable,
  ConfirmationText,
  NextTopicBlock,
  CreatedWith,
  formatDate,
} from "@/lib/pdf/shared/components";
import {
  UnterweisungsnachweisFormData,
  CATEGORY_META,
  DigitalCategoryCode,
} from "@/types/digital-documents";

// Category-specific default topics for G01
const G01_DEFAULT_TOPICS = [
  "Verhalten im Brandfall / Brandschutz",
  "Flucht- und Rettungswege",
  "Erste Hilfe / Ersthelfer",
  "Sicherheitsbeauftragte / Fachkraft für Arbeitssicherheit",
  "Persönliche Schutzausrüstung (PSA)",
  "Gefahrstoffe — allgemeine Hinweise",
  "Verkehrswege / Ordnung und Sauberkeit",
  "Elektrische Anlagen und Betriebsmittel",
  "Verhalten bei Unfällen / Unfallmeldung",
  "Allgemeine Verhaltensregeln am Arbeitsplatz",
];

// S02_EVAK default checklist
const S02_EVAK_DEFAULT_TOPICS = [
  "Alarmierung (optisch/akustisch) — Erkennung und Reaktion",
  "Flucht- und Rettungswege — Kennzeichnung und Nutzung",
  "Sammelplatz — Standort und Verhalten",
  "Evakuierungshelfer — Aufgaben und Zuständigkeiten",
  "Vollständigkeitskontrolle am Sammelplatz",
  "Verhalten bei Verrauchung / Sichtbehinderung",
  "Hilfsbedürftige Personen — Unterstützung bei der Evakuierung",
  "Aufzüge im Brandfall nicht benutzen",
  "Türen und Fenster schließen",
  "Rückkehr ins Gebäude nur nach Freigabe",
];

const localStyles = StyleSheet.create({
  titleBlock: { marginBottom: 16 },
  mainTitle: { fontSize: 22, fontWeight: 700, color: colors.black, marginBottom: 4, fontFamily: FONT_FAMILY },
  categoryTitle: { fontSize: 14, fontWeight: 700, color: colors.primary, marginBottom: 2, fontFamily: FONT_FAMILY },
  companyName: { fontSize: 13, color: colors.darkGray, marginBottom: 4, fontFamily: FONT_FAMILY },
  legalBasis: { fontSize: 9, color: colors.gray, fontStyle: "italic", fontFamily: FONT_FAMILY },
  personIntro: { fontSize: 10, marginBottom: 8, fontFamily: FONT_FAMILY },
});

interface DocumentData {
  id: string;
  categoryCode: string;
  title: string;
  formData: UnterweisungsnachweisFormData;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

// --- Title Section ---
function TitleSection({ data }: { data: DocumentData }) {
  const meta = CATEGORY_META[data.categoryCode];
  return (
    <View style={localStyles.titleBlock}>
      <Text style={localStyles.mainTitle}>Unterweisungsnachweis</Text>
      <Text style={localStyles.companyName}>{data.company.name}</Text>
      <Divider />
      <Text style={localStyles.categoryTitle}>
        {meta?.label || data.title}
      </Text>
      {data.formData.rechtsgrundlage && (
        <Text style={localStyles.legalBasis}>
          Rechtsgrundlage: {data.formData.rechtsgrundlage}
        </Text>
      )}
    </View>
  );
}

// --- Details Section ---
function DetailsSection({ data }: { data: DocumentData }) {
  const fd = data.formData;
  return (
    <View>
      <SectionTitle>Schulungsdetails</SectionTitle>
      <InfoGrid>
        <InfoRow label="Unterweisende Firma:" value={fd.unterweisendeFirma} />
        {fd.unterweisendeFirmaAdresse && (
          <InfoRow label="Adresse:" value={fd.unterweisendeFirmaAdresse} />
        )}
        <InfoRow label="Zu unterweisende Firma:" value={data.company.name} />
        <InfoRow label="Abteilung:" value={fd.abteilung} />
        <InfoRow label="Datum:" value={formatDate(fd.datum)} />
        <InfoRow label="Ort:" value={fd.ort} />
        <InfoRow label="Unterweisender:" value={fd.unterweisenderName} />
        {fd.unterweisenderPosition && (
          <InfoRow label="Position:" value={fd.unterweisenderPosition} />
        )}
        {fd.rechtsgrundlage && (
          <InfoRow label="Rechtsgrundlage:" value={fd.rechtsgrundlage} />
        )}
      </InfoGrid>
    </View>
  );
}

// --- Content Section (varies by category) ---
function ContentSection({ data }: { data: DocumentData }) {
  const fd = data.formData;
  const code = data.categoryCode as DigitalCategoryCode;

  return (
    <View>
      <SectionTitle>{fd.inhaltTitel || "Inhalt der Unterweisung"}</SectionTitle>

      {/* G05/IJ07: Person-specific intro text */}
      {(code === "G05" || code === "IJ07") && fd.personName && (
        <Text style={localStyles.personIntro}>
          {code === "G05"
            ? `${fd.personName} wurde an nachfolgenden Maschinen/Anlagen unterwiesen:`
            : `${fd.personName} wurde an nachfolgenden Gefahrstoffen unterwiesen:`}
        </Text>
      )}

      {/* Free text content */}
      {fd.inhaltText && (
        <ContentBlock>
          <ContentText>{fd.inhaltText}</ContentText>
        </ContentBlock>
      )}

      {/* Topics checklist */}
      {fd.topics && fd.topics.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          {fd.topics.map((topic, idx) => (
            <ChecklistItem
              key={idx}
              label={topic.label}
              checked={topic.checked}
            />
          ))}
        </View>
      )}

      {/* G05/IJ07: Specific items list */}
      {fd.spezifischeItems && fd.spezifischeItems.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <BulletList items={fd.spezifischeItems} />
        </View>
      )}
    </View>
  );
}

// --- Participant Section ---
function ParticipantSection({ data }: { data: DocumentData }) {
  const fd = data.formData;
  const participants = (fd.participants || []).map((p) => ({
    name: p.name,
    department: p.department,
  }));

  // Add empty rows for printing (minimum 5 extra)
  const emptyRows = Math.max(5, 15 - participants.length);

  return (
    <View>
      <SectionTitle>
        Teilnehmerliste
      </SectionTitle>
      <ConfirmationText />
      <ParticipantTable
        participants={participants}
        emptyRows={emptyRows}
        showDepartment
      />
    </View>
  );
}

// --- Signature Section ---
function SignatureSection({ data }: { data: DocumentData }) {
  const fd = data.formData;
  return (
    <View wrap={false}>
      <NextTopicBlock
        topic={fd.geplanteThemen}
        nextDate={fd.naechsterTermin ? formatDate(fd.naechsterTermin) : undefined}
      />
      <SignatureBlock
        lines={[
          {
            label: "Dozent / Unterweisender",
            name: fd.unterweisenderName,
          },
          {
            label: "Sicherheitsfachkraft",
            name: data.createdBy
              ? `${data.createdBy.firstName} ${data.createdBy.lastName}`
              : undefined,
          },
        ]}
      />
      <CreatedWith />
    </View>
  );
}

// --- Main Document ---
function UnterweisungsnachweisDocument({ data }: { data: DocumentData }) {
  const meta = CATEGORY_META[data.categoryCode];
  return (
    <Document
      title={`Unterweisungsnachweis - ${meta?.label || data.title} - ${data.company.name}`}
      author="AcoManage"
      subject="Unterweisungsnachweis"
    >
      <Page size="A4" style={baseStyles.page}>
        <PageHeader
          left={data.company.name}
          center="Unterweisungsnachweis"
          right={formatDate(data.formData.datum)}
        />
        <PageFooter label="Unterweisungsnachweis" />
        <TitleSection data={data} />
        <DetailsSection data={data} />
        <ContentSection data={data} />
        <ParticipantSection data={data} />
        <SignatureSection data={data} />
      </Page>
    </Document>
  );
}

// --- Render function ---
export async function renderUnterweisungsnachweis(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <UnterweisungsnachweisDocument data={document} />
  );
  return Buffer.from(buffer);
}

// --- Export default topics for forms ---
export { G01_DEFAULT_TOPICS, S02_EVAK_DEFAULT_TOPICS };
