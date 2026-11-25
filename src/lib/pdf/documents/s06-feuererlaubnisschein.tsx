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
  ChecklistItem,
  SignatureBlock,
  CreatedWith,
  formatDate,
} from "@/lib/pdf/shared/components";
import { S06FormData } from "@/types/digital-documents";

const localStyles = StyleSheet.create({
  mainTitle: { fontSize: 22, fontWeight: 700, color: colors.danger, marginBottom: 4, fontFamily: FONT_FAMILY },
  companyName: { fontSize: 13, color: colors.darkGray, marginBottom: 4, fontFamily: FONT_FAMILY },
});

interface DocumentData {
  id: string;
  categoryCode: string;
  title: string;
  formData: S06FormData;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

function S06Document({ data }: { data: DocumentData }) {
  const fd = data.formData;
  return (
    <Document
      title={`Feuererlaubnisschein - ${data.company.name}`}
      author="AcoManage"
      subject="Feuererlaubnisschein"
    >
      <Page size="A4" style={baseStyles.page}>
        <PageHeader
          left={data.company.name}
          center="Feuererlaubnisschein"
          right={formatDate(fd.datum)}
        />
        <PageFooter label="Feuererlaubnisschein" />

        <Text style={localStyles.mainTitle}>Feuererlaubnisschein</Text>
        <Text style={localStyles.companyName}>{data.company.name}</Text>
        <Divider />

        <SectionTitle>Angaben</SectionTitle>
        <InfoGrid>
          <InfoRow label="Ausführender:" value={fd.ausfuehrender} />
          {fd.ausfuehrendeFirma && <InfoRow label="Firma:" value={fd.ausfuehrendeFirma} />}
          <InfoRow label="Arbeitsort:" value={fd.arbeitsort} />
          <InfoRow label="Arbeitsauftrag:" value={fd.arbeitsauftrag} />
          <InfoRow label="Datum:" value={formatDate(fd.datum)} />
        </InfoGrid>

        <SectionTitle>Maßnahmen VOR Beginn der Arbeiten</SectionTitle>
        <View style={{ marginBottom: 12 }}>
          {(fd.massnahmenVor || []).map((m, idx) => (
            <ChecklistItem key={idx} label={m.label} checked={m.checked} />
          ))}
        </View>

        <SectionTitle>Maßnahmen WÄHREND der Arbeiten</SectionTitle>
        <View style={{ marginBottom: 12 }}>
          {(fd.massnahmenWaehrend || []).map((m, idx) => (
            <ChecklistItem key={idx} label={m.label} checked={m.checked} />
          ))}
        </View>

        <SectionTitle>Maßnahmen NACH den Arbeiten</SectionTitle>
        <View style={{ marginBottom: 12 }}>
          {(fd.massnahmenNach || []).map((m, idx) => (
            <ChecklistItem key={idx} label={m.label} checked={m.checked} />
          ))}
        </View>

        {fd.brandwacheStunden && (
          <InfoGrid>
            <InfoRow label="Brandwache (Stunden):" value={fd.brandwacheStunden} />
          </InfoGrid>
        )}

        <SignatureBlock
          lines={[
            { label: "Aufsichtsführender", name: fd.aufsichtsfuehrender },
            { label: "Ausführender", name: fd.ausfuehrender },
            { label: "Brandschutzhelfer" },
            { label: "Geschäftsführer/in" },
          ]}
        />
        <CreatedWith />
      </Page>
    </Document>
  );
}

export async function renderS06Feuererlaubnisschein(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any
): Promise<Buffer> {
  const buffer = await renderToBuffer(<S06Document data={document} />);
  return Buffer.from(buffer);
}
