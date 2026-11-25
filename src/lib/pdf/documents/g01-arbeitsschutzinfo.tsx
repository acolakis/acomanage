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
  Divider,
  BulletList,
  SignatureBlock,
  CreatedWith,
} from "@/lib/pdf/shared/components";
import { G01InfoFormData } from "@/types/digital-documents";

const s = StyleSheet.create({
  mainTitle: { fontSize: 22, fontWeight: 700, color: colors.black, marginBottom: 4, fontFamily: FONT_FAMILY },
  subtitle: { fontSize: 13, color: colors.darkGray, marginBottom: 4, fontFamily: FONT_FAMILY },
  blockTitle: { fontSize: 11, fontWeight: 700, color: colors.primary, marginBottom: 4, marginTop: 10, fontFamily: FONT_FAMILY },
});

interface DocumentData {
  id: string;
  categoryCode: string;
  title: string;
  formData: G01InfoFormData;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

function G01InfoDocument({ data }: { data: DocumentData }) {
  const fd = data.formData;
  return (
    <Document
      title={`Arbeitsschutzerstinformation - ${data.company.name}`}
      author="AcoManage"
      subject="Arbeitsschutzerstinformation für neue Mitarbeiter / Praktikanten"
    >
      <Page size="A4" style={baseStyles.page}>
        <PageHeader
          left={data.company.name}
          center="Arbeitsschutzerstinformation"
        />
        <PageFooter label="Arbeitsschutzerstinformation" />

        <Text style={s.mainTitle}>Arbeitsschutzerstinformation</Text>
        <Text style={s.subtitle}>für neue Mitarbeiter/innen und Praktikant/innen</Text>
        <Text style={s.subtitle}>{data.company.name}</Text>
        <Divider />

        {fd.themenBloecke.map((block, idx) => (
          <View key={idx}>
            <Text style={s.blockTitle}>{block.titel}</Text>
            <BulletList items={block.inhalt} />
          </View>
        ))}

        <View style={{ marginTop: 20 }}>
          {fd.sifaBuero && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 9, color: colors.gray, fontFamily: FONT_FAMILY }}>
                Fachkraft für Arbeitssicherheit: {fd.sifaBuero}
              </Text>
            </View>
          )}
          <SignatureBlock
            lines={[
              { label: "Geschäftsführer/in", name: fd.geschaeftsfuehrer },
            ]}
          />
        </View>
        <CreatedWith />
      </Page>
    </Document>
  );
}

export async function renderG01Arbeitsschutzinfo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any
): Promise<Buffer> {
  const buffer = await renderToBuffer(<G01InfoDocument data={document} />);
  return Buffer.from(buffer);
}
