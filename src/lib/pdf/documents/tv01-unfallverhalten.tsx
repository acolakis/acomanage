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
  Divider,
  CreatedWith,
  formatDate,
} from "@/lib/pdf/shared/components";
import { TV01FormData } from "@/types/digital-documents";

const s = StyleSheet.create({
  mainTitle: { fontSize: 24, fontWeight: 700, color: colors.danger, marginBottom: 4, fontFamily: FONT_FAMILY, textAlign: "center" },
  subtitle: { fontSize: 12, color: colors.darkGray, marginBottom: 16, fontFamily: FONT_FAMILY, textAlign: "center" },
  twoCol: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  contactRow: { flexDirection: "row", marginBottom: 4 },
  contactLabel: { width: 100, fontSize: 8, color: colors.gray, fontFamily: FONT_FAMILY },
  contactValue: { flex: 1, fontSize: 8, fontWeight: 700, fontFamily: FONT_FAMILY },
  contactBlock: { marginBottom: 10, padding: 8, backgroundColor: colors.lightGray, borderRadius: 4 },
  contactBlockTitle: { fontSize: 9, fontWeight: 700, color: colors.primary, marginBottom: 4, fontFamily: FONT_FAMILY },
  listItem: { fontSize: 9, lineHeight: 1.5, color: colors.darkGray, fontFamily: FONT_FAMILY, marginBottom: 2, paddingLeft: 8 },
});

interface DocumentData {
  id: string;
  categoryCode: string;
  title: string;
  formData: TV01FormData;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

function ContactBlock({ title, entries }: { title: string; entries: Array<{ label: string; value: string }> }) {
  return (
    <View style={s.contactBlock}>
      <Text style={s.contactBlockTitle}>{title}</Text>
      {entries.map((e, idx) => (
        <View key={idx} style={s.contactRow}>
          <Text style={s.contactLabel}>{e.label}:</Text>
          <Text style={s.contactValue}>{e.value}</Text>
        </View>
      ))}
    </View>
  );
}

function TV01Document({ data }: { data: DocumentData }) {
  const fd = data.formData;
  return (
    <Document
      title={`Verhalten bei Unfällen - ${data.company.name}`}
      author="AcoManage"
      subject="Aushang — Verhalten bei Unfällen"
    >
      <Page size="A4" style={baseStyles.page}>
        <PageFooter label="Aushang — Verhalten bei Unfällen" />

        <Text style={s.mainTitle}>Verhalten bei Unfällen</Text>
        <Text style={s.subtitle}>{data.company.name} — Stand: {formatDate(fd.datum)}</Text>
        <Divider />

        <View style={s.twoCol}>
          {/* Left column: Contacts */}
          <View style={s.col}>
            <SectionTitle>Wichtige Kontakte</SectionTitle>

            {fd.sicherheitsbeauftragte && (
              <ContactBlock
                title="Sicherheitsbeauftragte/r"
                entries={[{ label: "Name", value: fd.sicherheitsbeauftragte }]}
              />
            )}

            {fd.ersthelfer && fd.ersthelfer.length > 0 && (
              <ContactBlock
                title="Ersthelfer"
                entries={fd.ersthelfer.map((name, idx) => ({ label: `${idx + 1}`, value: name }))}
              />
            )}

            <ContactBlock
              title="Fachkraft für Arbeitssicherheit"
              entries={[
                { label: "Name", value: fd.sifa.name },
                { label: "Mobil", value: fd.sifa.mobil },
                { label: "Adresse", value: fd.sifa.adresse },
                { label: "Telefon", value: fd.sifa.telefon },
              ]}
            />

            <ContactBlock
              title="Durchgangsarzt"
              entries={[
                { label: "Name", value: fd.durchgangsarzt.name },
                { label: "Adresse", value: fd.durchgangsarzt.adresse },
                { label: "Telefon", value: fd.durchgangsarzt.telefon },
              ]}
            />

            <ContactBlock
              title="Betriebsarzt"
              entries={[
                { label: "Name", value: fd.betriebsarzt.name },
                { label: "Adresse", value: fd.betriebsarzt.adresse },
                { label: "Telefon", value: fd.betriebsarzt.telefon },
              ]}
            />
          </View>

          {/* Right column: Rules + more contacts */}
          <View style={s.col}>
            <SectionTitle>Verhalten bei Unfällen</SectionTitle>

            <Text style={s.listItem}>1. Ruhe bewahren — Unfallstelle sichern</Text>
            <Text style={s.listItem}>2. Ersthelfer rufen / Erste Hilfe leisten</Text>
            <Text style={s.listItem}>3. Notruf 112 absetzen (bei schweren Verletzungen)</Text>
            <Text style={s.listItem}>4. Vorgesetzten informieren</Text>
            <Text style={s.listItem}>5. Unfall im Verbandbuch dokumentieren</Text>
            <Text style={s.listItem}>6. Bei Arbeitsunfähigkeit &gt; 3 Tage: Unfallanzeige</Text>

            <View style={{ marginTop: 12 }}>
              <ContactBlock
                title="Berufsgenossenschaft"
                entries={[
                  { label: "Name", value: fd.berufsgenossenschaft.name },
                  { label: "Adresse", value: fd.berufsgenossenschaft.adresse },
                  { label: "Telefon", value: fd.berufsgenossenschaft.telefon },
                ]}
              />

              <ContactBlock
                title="Arbeitsschutzbehörde"
                entries={[
                  { label: "Name", value: fd.arbeitsschutzbehoerde.name },
                  { label: "Adresse", value: fd.arbeitsschutzbehoerde.adresse },
                  { label: "Telefon", value: fd.arbeitsschutzbehoerde.telefon },
                ]}
              />

              {fd.unfallMeldungKontakte && fd.unfallMeldungKontakte.length > 0 && (
                <ContactBlock
                  title="Unfallmeldung"
                  entries={fd.unfallMeldungKontakte.map((k) => ({ label: k.name, value: k.telefon }))}
                />
              )}
            </View>
          </View>
        </View>

        <CreatedWith />
      </Page>
    </Document>
  );
}

export async function renderTV01Unfallverhalten(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any
): Promise<Buffer> {
  const buffer = await renderToBuffer(<TV01Document data={document} />);
  return Buffer.from(buffer);
}
