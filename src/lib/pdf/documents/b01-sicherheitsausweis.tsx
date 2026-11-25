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
  SignatureBlock,
  CreatedWith,
  formatDate,
} from "@/lib/pdf/shared/components";
import { B01AusweisFormData } from "@/types/digital-documents";

const s = StyleSheet.create({
  titleBlock: { marginBottom: 20, alignItems: "center" },
  mainTitle: { fontSize: 22, fontWeight: 700, color: colors.black, marginBottom: 8, fontFamily: FONT_FAMILY, textAlign: "center" },
  subtitle: { fontSize: 11, color: colors.gray, fontFamily: FONT_FAMILY, textAlign: "center" },
  card: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 24,
    marginBottom: 20,
    marginHorizontal: 40,
  },
  row: { flexDirection: "row", marginBottom: 8 },
  label: { width: 120, fontSize: 10, color: colors.gray, fontFamily: FONT_FAMILY },
  value: { flex: 1, fontSize: 10, fontWeight: 700, fontFamily: FONT_FAMILY },
  descriptionBlock: { marginTop: 16, padding: 12, backgroundColor: colors.lightGray, borderRadius: 4 },
  descriptionText: { fontSize: 9, lineHeight: 1.6, color: colors.darkGray, fontFamily: FONT_FAMILY },
});

interface DocumentData {
  id: string;
  categoryCode: string;
  title: string;
  formData: B01AusweisFormData;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

function SicherheitsausweisDocument({ data }: { data: DocumentData }) {
  const fd = data.formData;
  return (
    <Document
      title={`Sicherheitsausweis - ${fd.sifaName} - ${data.company.name}`}
      author="AcoManage"
      subject="Sicherheitsausweis SIFA"
    >
      <Page size="A4" style={baseStyles.page}>
        <PageHeader
          left={data.company.name}
          center="Sicherheitsausweis"
          right={formatDate(fd.datum)}
        />
        <PageFooter label="Sicherheitsausweis" />

        <View style={s.titleBlock}>
          <Text style={s.mainTitle}>Sicherheitsausweis</Text>
          <Text style={s.subtitle}>Fachkraft für Arbeitssicherheit</Text>
        </View>

        <Divider />

        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.label}>Name:</Text>
            <Text style={s.value}>{fd.sifaName}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Firma:</Text>
            <Text style={s.value}>{data.company.name}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Büro:</Text>
            <Text style={s.value}>{fd.sifaBuero}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Adresse:</Text>
            <Text style={s.value}>{fd.sifaBueroAdresse}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Telefon:</Text>
            <Text style={s.value}>{fd.sifaTelefon}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Mobil:</Text>
            <Text style={s.value}>{fd.sifaMobil}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Ausgestellt am:</Text>
            <Text style={s.value}>{formatDate(fd.datum)}</Text>
          </View>
        </View>

        <View style={s.descriptionBlock}>
          <Text style={s.descriptionText}>
            Die oben genannte Person ist als Fachkraft für Arbeitssicherheit gemäß § 6 ASiG
            und DGUV Vorschrift 2 für das genannte Unternehmen bestellt. Sie ist berechtigt,
            alle Betriebsbereiche zu betreten und Einsicht in relevante Unterlagen zu nehmen,
            soweit dies zur Erfüllung ihrer Aufgaben erforderlich ist.
          </Text>
        </View>

        <SignatureBlock
          lines={[
            { label: "Geschäftsführer/in" },
            { label: "Fachkraft für Arbeitssicherheit", name: fd.sifaName },
          ]}
        />
        <CreatedWith />
      </Page>
    </Document>
  );
}

export async function renderB01Sicherheitsausweis(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <SicherheitsausweisDocument data={document} />
  );
  return Buffer.from(buffer);
}
