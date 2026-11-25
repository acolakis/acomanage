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
  PageFooter,
  Divider,
  SignatureBlock,
  CreatedWith,
  formatDate,
} from "@/lib/pdf/shared/components";
import { A01FormData } from "@/types/digital-documents";

const s = StyleSheet.create({
  mainTitle: { fontSize: 26, fontWeight: 700, color: colors.primary, marginBottom: 6, fontFamily: FONT_FAMILY, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.darkGray, marginBottom: 20, fontFamily: FONT_FAMILY, textAlign: "center" },
  leitsatz: { fontSize: 10, lineHeight: 1.8, color: colors.darkGray, fontFamily: FONT_FAMILY, marginBottom: 8, paddingLeft: 16 },
  leitsatzBullet: { fontSize: 10, color: colors.primary, fontWeight: 700, fontFamily: FONT_FAMILY },
  closingText: { fontSize: 10, lineHeight: 1.8, color: colors.darkGray, fontFamily: FONT_FAMILY, marginTop: 16, marginBottom: 12 },
});

interface DocumentData {
  id: string;
  categoryCode: string;
  title: string;
  formData: A01FormData;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

function A01Document({ data }: { data: DocumentData }) {
  const fd = data.formData;
  return (
    <Document
      title={`Grundsatzerklärung - ${data.company.name}`}
      author="AcoManage"
      subject="Grundsatzerklärung zum Arbeitsschutz"
    >
      <Page size="A4" style={baseStyles.page}>
        <PageFooter label="Grundsatzerklärung zum Arbeitsschutz" />

        <View style={{ marginTop: 40 }}>
          <Text style={s.mainTitle}>Grundsatzerklärung</Text>
          <Text style={s.subtitle}>zum Arbeitsschutz — {data.company.name}</Text>
        </View>
        <Divider />

        <View style={{ marginTop: 16 }}>
          {fd.leitsaetze.map((leitsatz, idx) => (
            <View key={idx} style={{ flexDirection: "row", marginBottom: 8 }}>
              <Text style={s.leitsatzBullet}>{idx + 1}. </Text>
              <Text style={s.leitsatz}>{leitsatz}</Text>
            </View>
          ))}
        </View>

        <Text style={s.closingText}>
          Diese Grundsatzerklärung ist für alle Mitarbeiterinnen und Mitarbeiter,
          Führungskräfte und die Geschäftsleitung verbindlich. Sie wird regelmäßig
          überprüft und bei Bedarf angepasst.
        </Text>

        <View style={{ marginTop: 12, flexDirection: "row", marginBottom: 8 }}>
          <Text style={{ fontSize: 9, color: colors.gray, width: 100, fontFamily: FONT_FAMILY }}>Datum:</Text>
          <Text style={{ fontSize: 9, fontWeight: 700, fontFamily: FONT_FAMILY }}>{formatDate(fd.datum)}</Text>
        </View>

        <SignatureBlock
          lines={[
            { label: "Geschäftsführer/in", name: fd.geschaeftsfuehrer },
          ]}
        />
        <CreatedWith />
      </Page>
    </Document>
  );
}

export async function renderA01Grundsatzerklaerung(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any
): Promise<Buffer> {
  const buffer = await renderToBuffer(<A01Document data={document} />);
  return Buffer.from(buffer);
}
