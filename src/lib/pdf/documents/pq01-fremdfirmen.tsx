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
  BulletList,
  NumberedList,
  SignatureBlock,
  CreatedWith,
  formatDate,
} from "@/lib/pdf/shared/components";
import { PQ01FormData } from "@/types/digital-documents";

const s = StyleSheet.create({
  mainTitle: { fontSize: 22, fontWeight: 700, color: colors.black, marginBottom: 4, fontFamily: FONT_FAMILY },
  subtitle: { fontSize: 13, color: colors.darkGray, marginBottom: 4, fontFamily: FONT_FAMILY },
  anforderungTitle: { fontSize: 10, fontWeight: 700, color: colors.primary, marginBottom: 2, fontFamily: FONT_FAMILY },
  anforderungText: { fontSize: 9, lineHeight: 1.6, color: colors.darkGray, marginBottom: 8, fontFamily: FONT_FAMILY },
});

interface DocumentData {
  id: string;
  categoryCode: string;
  title: string;
  formData: PQ01FormData;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

function PQ01Document({ data }: { data: DocumentData }) {
  const fd = data.formData;
  return (
    <Document
      title={`Fremdfirmen-Information - ${data.company.name}`}
      author="AcoManage"
      subject="Fremdfirmen — Anforderung + Information"
    >
      {/* Page 1: Anforderungsschreiben */}
      <Page size="A4" style={baseStyles.page}>
        <PageHeader
          left={data.company.name}
          center="Fremdfirmen-Anforderung"
          right={formatDate(fd.datum)}
        />
        <PageFooter label="Fremdfirmen — Anforderungsschreiben" />

        <Text style={s.mainTitle}>Anforderungsschreiben</Text>
        <Text style={s.subtitle}>an Fremdfirmen — {data.company.name}</Text>
        <Divider />

        <InfoGrid>
          <InfoRow label="Datum:" value={formatDate(fd.datum)} />
          <InfoRow label="Frist (Tage):" value={`${fd.fristTage}`} />
        </InfoGrid>

        <SectionTitle>Anforderungen</SectionTitle>
        {fd.anforderungen.map((anf, idx) => (
          <View key={idx} style={{ marginBottom: 8 }}>
            <Text style={s.anforderungTitle}>{idx + 1}. {anf.titel}</Text>
            <Text style={s.anforderungText}>{anf.beschreibung}</Text>
          </View>
        ))}

        <SignatureBlock
          lines={[
            { label: "Geschäftsführer/in", name: fd.geschaeftsfuehrer },
          ]}
        />
        <CreatedWith />
      </Page>

      {/* Page 2: Information / Regeln */}
      <Page size="A4" style={baseStyles.page}>
        <PageHeader
          left={data.company.name}
          center="Fremdfirmen-Information"
        />
        <PageFooter label="Fremdfirmen — Sicherheitsinformation" />

        <Text style={s.mainTitle}>Sicherheitsinformation</Text>
        <Text style={s.subtitle}>für Fremdfirmen — {data.company.name}</Text>
        <Divider />

        <SectionTitle>Sicherheitsregeln auf dem Betriebsgelände</SectionTitle>
        <NumberedList items={fd.regeln} />

        <View style={{ marginTop: 16 }}>
          <BulletList items={[
            "Diese Regeln sind von allen Mitarbeitern der Fremdfirma einzuhalten.",
            "Verstöße können zum sofortigen Verweis vom Betriebsgelände führen.",
            "Bei Fragen wenden Sie sich an die Fachkraft für Arbeitssicherheit.",
          ]} />
        </View>

        <SignatureBlock
          lines={[
            { label: "Auftraggeber" },
            { label: "Fremdfirma — Verantwortlicher" },
          ]}
        />
        <CreatedWith />
      </Page>
    </Document>
  );
}

export async function renderPQ01Fremdfirmen(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any
): Promise<Buffer> {
  const buffer = await renderToBuffer(<PQ01Document data={document} />);
  return Buffer.from(buffer);
}
