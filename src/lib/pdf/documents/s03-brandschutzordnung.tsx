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
  SectionTitle,
  PdfTable,
  Divider,
  CreatedWith,
} from "@/lib/pdf/shared/components";
import { S03FormData } from "@/types/digital-documents";

const s = StyleSheet.create({
  mainTitle: { fontSize: 26, fontWeight: 700, color: colors.danger, marginBottom: 4, fontFamily: FONT_FAMILY, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.darkGray, marginBottom: 4, fontFamily: FONT_FAMILY, textAlign: "center" },
  teilLabel: { fontSize: 12, fontWeight: 700, color: colors.white, backgroundColor: colors.danger, padding: 4, textAlign: "center", fontFamily: FONT_FAMILY, marginBottom: 12 },
  ruleTitle: { fontSize: 11, fontWeight: 700, color: colors.danger, marginBottom: 4, fontFamily: FONT_FAMILY },
  ruleText: { fontSize: 9, lineHeight: 1.6, color: colors.darkGray, marginBottom: 10, fontFamily: FONT_FAMILY },
  alarmText: { fontSize: 10, lineHeight: 1.6, color: colors.darkGray, fontFamily: FONT_FAMILY, marginBottom: 12 },
});

// DIN 14096 Teil A standard content
const TEIL_A_RULES = [
  { title: "Brände verhüten", text: "Feuer, offenes Licht und Rauchen verboten!" },
  { title: "Verhalten im Brandfall", text: "Ruhe bewahren! Brand melden: Notruf 112 oder Hausalarm betätigen. In Sicherheit bringen: Gefährdete Personen warnen, Hilflose mitnehmen. Türen schließen. Gekennzeichneten Fluchtwegen folgen. Aufzug nicht benutzen. Auf Anweisungen achten." },
  { title: "Löschversuch unternehmen", text: "Feuerlöscher benutzen. Windrichtung beachten. Flächenbrände von vorn löschen. Tropf- und Fließbrände von oben löschen. Wandbrände von unten löschen. Ausreichend Löscher gleichzeitig einsetzen. Rückzündung beachten. Eingesetzte Löscher nicht zurückhängen." },
];

interface DocumentData {
  id: string;
  categoryCode: string;
  title: string;
  formData: S03FormData;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

// Page 1: Teil A (DIN 14096)
function TeilAPage({ data }: { data: DocumentData }) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <PageFooter label="Brandschutzordnung Teil A" />

      <Text style={s.mainTitle}>Brandschutzordnung</Text>
      <Text style={s.subtitle}>{data.company.name}</Text>
      <View style={{ marginTop: 8 }}>
        <Text style={s.teilLabel}>Teil A — nach DIN 14096</Text>
      </View>

      {TEIL_A_RULES.map((rule, idx) => (
        <View key={idx} style={{ marginBottom: 8 }}>
          <Text style={s.ruleTitle}>{rule.title}</Text>
          <Text style={s.ruleText}>{rule.text}</Text>
        </View>
      ))}

      <CreatedWith />
    </Page>
  );
}

// Page 2: Teil C (Alarmplan)
function TeilCPage({ data }: { data: DocumentData }) {
  const fd = data.formData;

  const kontaktRows = (fd.kontakte || []).map((k) => ({
    rolle: k.rolle,
    name: k.name,
    telefon: k.telefon,
    durchwahl: k.durchwahl || "",
  }));

  const externeRows = (fd.externeKontakte || []).map((e) => ({
    stelle: e.stelle,
    telefon: e.telefon,
  }));

  return (
    <Page size="A4" style={baseStyles.page}>
      <PageFooter label="Brandschutzordnung Teil C — Alarmplan" />

      <Text style={s.mainTitle}>Brandschutzordnung</Text>
      <Text style={s.subtitle}>{data.company.name}</Text>
      <View style={{ marginTop: 8 }}>
        <Text style={s.teilLabel}>Teil C — Alarmplan</Text>
      </View>

      {fd.alarmierungsText && (
        <View style={{ marginBottom: 12 }}>
          <SectionTitle>Alarmierungsablauf</SectionTitle>
          <Text style={s.alarmText}>{fd.alarmierungsText}</Text>
        </View>
      )}

      {kontaktRows.length > 0 && (
        <View>
          <SectionTitle>Interne Kontakte</SectionTitle>
          <PdfTable
            columns={[
              { key: "rolle", label: "Rolle", width: 120 },
              { key: "name", label: "Name" },
              { key: "telefon", label: "Telefon", width: 100 },
              { key: "durchwahl", label: "Durchwahl", width: 70 },
            ]}
            rows={kontaktRows}
          />
        </View>
      )}

      {externeRows.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <SectionTitle>Externe Kontakte</SectionTitle>
          <PdfTable
            columns={[
              { key: "stelle", label: "Stelle" },
              { key: "telefon", label: "Telefon", width: 120 },
            ]}
            rows={externeRows}
          />
        </View>
      )}

      <Divider />
      <CreatedWith />
    </Page>
  );
}

function S03Document({ data }: { data: DocumentData }) {
  return (
    <Document
      title={`Brandschutzordnung - ${data.company.name}`}
      author="AcoManage"
      subject="Brandschutzordnung Teil A + Teil C"
    >
      <TeilAPage data={data} />
      <TeilCPage data={data} />
    </Document>
  );
}

export async function renderS03Brandschutzordnung(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any
): Promise<Buffer> {
  const buffer = await renderToBuffer(<S03Document data={document} />);
  return Buffer.from(buffer);
}
