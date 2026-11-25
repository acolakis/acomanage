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
  ChecklistItem,
  PdfTable,
  ContentBlock,
  ContentText,
  CreatedWith,
  formatDate,
} from "@/lib/pdf/shared/components";
import { A03FormData } from "@/types/digital-documents";

const FAHRZEUGTYP_LABELS: Record<string, string> = {
  schubmaststapler: "Schubmaststapler",
  gabelstapler: "Gabelstapler / Frontstapler",
  hubarbeitsbuehne: "Hubarbeitsbühne",
  mitgaenger: "Mitgänger-Flurförderzeuge",
  innerbetrieblich: "Innerbetrieblicher Transport",
  beschraenktOeffentlich: "Beschränkt öffentlicher Verkehr",
  oeffentlich: "Öffentlicher Straßenverkehr",
};

const localStyles = StyleSheet.create({
  mainTitle: { fontSize: 22, fontWeight: 700, color: colors.black, marginBottom: 4, fontFamily: FONT_FAMILY },
  companyName: { fontSize: 13, color: colors.darkGray, marginBottom: 4, fontFamily: FONT_FAMILY },
  kontrolleTitle: { fontSize: 18, fontWeight: 700, color: colors.black, marginBottom: 12, fontFamily: FONT_FAMILY, textAlign: "center" },
});

interface DocumentData {
  id: string;
  categoryCode: string;
  title: string;
  formData: A03FormData;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

// Page 1: Beauftragung
function BeauftragungPage({ data }: { data: DocumentData }) {
  const fd = data.formData;
  return (
    <Page size="A4" style={baseStyles.page}>
      <PageHeader
        left={data.company.name}
        center="Beauftragung Fahrzeuge"
        right={formatDate(fd.datum)}
      />
      <PageFooter label="Beauftragung zum Führen von Fahrzeugen" />

      <View style={{ marginBottom: 16 }}>
        <Text style={localStyles.mainTitle}>Beauftragung zum Führen von Fahrzeugen</Text>
        <Text style={localStyles.companyName}>{data.company.name}</Text>
        <Divider />
      </View>

      <SectionTitle>Personalien</SectionTitle>
      <InfoGrid>
        <InfoRow label="Name:" value={fd.person.name} />
        {fd.person.position && <InfoRow label="Position:" value={fd.person.position} />}
        {fd.person.department && <InfoRow label="Abteilung:" value={fd.person.department} />}
        {fd.geburtsdatum && <InfoRow label="Geburtsdatum:" value={formatDate(fd.geburtsdatum)} />}
        <InfoRow label="Datum:" value={formatDate(fd.datum)} />
      </InfoGrid>

      <SectionTitle>Führerschein</SectionTitle>
      <InfoGrid>
        <InfoRow label="Führerscheinklasse:" value={fd.fuehrerscheinKlasse} />
        {fd.fuehrerscheinNummer && <InfoRow label="Führerscheinnummer:" value={fd.fuehrerscheinNummer} />}
        {fd.fuehrerscheinDatum && <InfoRow label="Ausstellungsdatum:" value={formatDate(fd.fuehrerscheinDatum)} />}
      </InfoGrid>

      <SectionTitle>Beauftragt zum Führen von</SectionTitle>
      <View style={{ marginBottom: 12 }}>
        {Object.entries(fd.fahrzeugtypen).map(([key, checked]) => (
          <ChecklistItem
            key={key}
            label={FAHRZEUGTYP_LABELS[key] || key}
            checked={checked as boolean}
          />
        ))}
      </View>

      <ContentBlock>
        <ContentText>
          Die oben genannte Person ist berechtigt, die angekreuzten Fahrzeugtypen im Rahmen
          ihrer betrieblichen Tätigkeit zu führen. Die medizinische Eignung wurde festgestellt.
          Der/Die Beauftragte verpflichtet sich, die Fahrzeuge nur bestimmungsgemäß zu benutzen
          und die einschlägigen Vorschriften (DGUV Vorschrift 68, StVO, BetrSichV) einzuhalten.
        </ContentText>
      </ContentBlock>

      <SignatureBlock
        lines={[
          { label: "Produktionsleiter / Vorgesetzter", name: fd.produktionsleiter },
          { label: "Beauftragter Fahrer", name: fd.person.name },
        ]}
      />
      <CreatedWith />
    </Page>
  );
}

// Page 2: Führerscheinkontrolle
function KontrollePage({ data }: { data: DocumentData }) {
  const fd = data.formData;

  const rows = [
    ...(fd.kontrollen || []).map((k) => ({
      datum: formatDate(k.datum),
      bemerkung: k.bemerkung || "",
      unterschrift: "",
    })),
    // Add empty rows for future entries
    ...Array.from({ length: Math.max(6, 12 - (fd.kontrollen?.length || 0)) }, () => ({
      datum: "",
      bemerkung: "",
      unterschrift: "",
    })),
  ];

  return (
    <Page size="A4" style={baseStyles.page}>
      <PageHeader
        left={data.company.name}
        center="Führerscheinkontrolle"
        right={fd.person.name}
      />
      <PageFooter label="Führerscheinkontrolle — Nachweisbogen" />

      <Text style={localStyles.kontrolleTitle}>Führerscheinkontrolle — Nachweisbogen</Text>
      <Divider />

      <InfoGrid>
        <InfoRow label="Name:" value={fd.person.name} />
        <InfoRow label="Führerscheinklasse:" value={fd.fuehrerscheinKlasse} />
        {fd.fuehrerscheinNummer && <InfoRow label="Führerscheinnummer:" value={fd.fuehrerscheinNummer} />}
      </InfoGrid>

      <SectionTitle>Kontrollen</SectionTitle>
      <PdfTable
        columns={[
          { key: "datum", label: "Datum", width: 90 },
          { key: "bemerkung", label: "Bemerkung" },
          { key: "unterschrift", label: "Unterschrift Prüfer", width: 120 },
        ]}
        rows={rows}
      />

      <ContentBlock>
        <ContentText>
          Die Führerscheinkontrolle ist gemäß § 21 StVG mindestens zweimal jährlich durchzuführen.
          Der Originalführerschein ist bei jeder Kontrolle vorzulegen.
        </ContentText>
      </ContentBlock>

      <CreatedWith />
    </Page>
  );
}

function A03Document({ data }: { data: DocumentData }) {
  return (
    <Document
      title={`Beauftragung Fahrzeuge - ${data.formData.person.name} - ${data.company.name}`}
      author="AcoManage"
      subject="Beauftragung zum Führen von Fahrzeugen + Führerscheinkontrolle"
    >
      <BeauftragungPage data={data} />
      <KontrollePage data={data} />
    </Document>
  );
}

export async function renderA03BeauftragungFahrzeuge(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any
): Promise<Buffer> {
  const buffer = await renderToBuffer(<A03Document data={document} />);
  return Buffer.from(buffer);
}
