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
  NumberedList,
  ContentBlock,
  ContentText,
  CreatedWith,
  formatDate,
} from "@/lib/pdf/shared/components";
import { A02FormData } from "@/types/digital-documents";

const A02_DEFAULT_PFLICHTEN = [
  "Einrichtung und Unterhaltung der Arbeitsstätten entsprechend den Vorschriften",
  "Beschaffung und Bereitstellung von Arbeitsmitteln gemäß den Arbeitsschutzvorschriften",
  "Sichere Gestaltung von Arbeitsverfahren und Arbeitsabläufen",
  "Einweisung und Unterweisung der Beschäftigten über Gefahren und Schutzmaßnahmen",
  "Überwachung der Einhaltung der Arbeitsschutzvorschriften und -maßnahmen",
  "Sicherstellung der arbeitsmedizinischen Vorsorge",
  "Beschaffung und Bereitstellung von persönlicher Schutzausrüstung (PSA)",
  "Überwachung des Tragens und der Benutzung der PSA",
  "Regelung des Verhaltens bei Gefahr / Notfallplanung",
  "Sicherstellung der Ersten Hilfe",
  "Meldung von Arbeitsunfällen und Berufskrankheiten",
  "Begehung der Arbeitsstätten / regelmäßige Kontrollen",
  "Zusammenarbeit mit dem Betriebsarzt und der Fachkraft für Arbeitssicherheit",
  "Gefährdungsbeurteilungen durchführen und dokumentieren",
  "Betriebsanweisungen erstellen und bekanntmachen",
  "Prüfung technischer Arbeitsmittel veranlassen",
  "Koordination bei Zusammenarbeit mit Fremdfirmen",
  "Einhaltung der Mutterschutz- und Jugendarbeitsschutzvorschriften",
  "Sicherstellung der Gefahrstofflagerung und -kennzeichnung",
  "Überwachung der Einhaltung von Transportvorschriften",
  "Umsetzung der Brandschutzmaßnahmen im Zuständigkeitsbereich",
  "Dokumentation aller Arbeitsschutzmaßnahmen",
  "Mitwirkung bei der Weiterentwicklung des Arbeitsschutzmanagementsystems",
];

const localStyles = StyleSheet.create({
  mainTitle: { fontSize: 22, fontWeight: 700, color: colors.black, marginBottom: 4, fontFamily: FONT_FAMILY },
  companyName: { fontSize: 13, color: colors.darkGray, marginBottom: 4, fontFamily: FONT_FAMILY },
  categoryTitle: { fontSize: 14, fontWeight: 700, color: colors.primary, marginBottom: 2, fontFamily: FONT_FAMILY },
  zusatzTitle: { fontSize: 18, fontWeight: 700, color: colors.black, marginBottom: 12, fontFamily: FONT_FAMILY, textAlign: "center" },
  zusatzSubtitle: { fontSize: 12, color: colors.darkGray, marginBottom: 16, fontFamily: FONT_FAMILY, textAlign: "center" },
  legalText: { fontSize: 9, lineHeight: 1.8, color: colors.darkGray, fontFamily: FONT_FAMILY, marginBottom: 12 },
});

interface DocumentData {
  id: string;
  categoryCode: string;
  title: string;
  formData: A02FormData;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

// Page 1: Pflichtenübertragung
function PflichtenPage({ data }: { data: DocumentData }) {
  const fd = data.formData;
  return (
    <Page size="A4" style={baseStyles.page}>
      <PageHeader
        left={data.company.name}
        center="Pflichtenübertragung"
        right={formatDate(fd.datum)}
      />
      <PageFooter label="Pflichtenübertragung" />

      <View style={{ marginBottom: 16 }}>
        <Text style={localStyles.mainTitle}>Übertragung der Unternehmerpflichten</Text>
        <Text style={localStyles.companyName}>{fd.firmenNamen || data.company.name}</Text>
        <Divider />
      </View>

      <SectionTitle>Angaben zur beauftragten Person</SectionTitle>
      <InfoGrid>
        <InfoRow label="Name:" value={fd.person.name} />
        {fd.person.position && <InfoRow label="Position:" value={fd.person.position} />}
        <InfoRow label="Abteilung:" value={fd.personAbteilung} />
        <InfoRow label="Rolle:" value={fd.personRolle} />
        <InfoRow label="Datum:" value={formatDate(fd.datum)} />
      </InfoGrid>

      {fd.betragslimit && (
        <ContentBlock>
          <ContentText>
            Für die Erfüllung der übertragenen Pflichten steht ein Budget von bis zu {fd.betragslimit} EUR
            zur Verfügung, das eigenverantwortlich eingesetzt werden kann.
          </ContentText>
        </ContentBlock>
      )}

      <SectionTitle>Übertragene Pflichten</SectionTitle>
      <NumberedList items={fd.pflichten.length > 0 ? fd.pflichten : A02_DEFAULT_PFLICHTEN} />

      <SignatureBlock
        lines={[
          { label: "Geschäftsführer/in" },
          { label: "Beauftragte Person", name: fd.person.name },
        ]}
      />
      <CreatedWith />
    </Page>
  );
}

// Page 2: Zusatz zum Arbeitsvertrag
function ZusatzPage({ data }: { data: DocumentData }) {
  const fd = data.formData;
  return (
    <Page size="A4" style={baseStyles.page}>
      <PageHeader
        left={data.company.name}
        center="Zusatz zum Arbeitsvertrag"
        right={formatDate(fd.datum)}
      />
      <PageFooter label="Zusatz zum Arbeitsvertrag" />

      <Text style={localStyles.zusatzTitle}>Zusatz zum Arbeitsvertrag</Text>
      <Text style={localStyles.zusatzSubtitle}>
        Ergänzung zum bestehenden Arbeitsvertrag
      </Text>
      <Divider />

      <Text style={localStyles.legalText}>
        Zwischen {fd.firmenNamen || data.company.name} (nachfolgend &quot;Arbeitgeber&quot;) und{"\n"}
        {fd.person.name}, {fd.zusatzRolle || fd.personRolle} (nachfolgend &quot;Arbeitnehmer&quot;){"\n\n"}
        wird folgender Zusatz zum bestehenden Arbeitsvertrag vereinbart:
      </Text>

      <SectionTitle>§ 1 Übertragung von Unternehmerpflichten</SectionTitle>
      <Text style={localStyles.legalText}>
        Dem Arbeitnehmer werden im Rahmen seiner Tätigkeit als {fd.zusatzRolle || fd.personRolle} die
        in der beigefügten Pflichtenübertragung genannten Unternehmerpflichten im Bereich
        Arbeitsschutz übertragen. Der Arbeitnehmer verpflichtet sich, diese Pflichten
        gewissenhaft und eigenverantwortlich wahrzunehmen.
      </Text>

      <SectionTitle>§ 2 Rechtsgrundlagen</SectionTitle>
      <Text style={localStyles.legalText}>
        Die Übertragung erfolgt auf Grundlage von § 13 Abs. 2 ArbSchG, § 13 DGUV Vorschrift 1
        und § 9 Abs. 2 Nr. 2 OWiG. Der Arbeitnehmer wurde über die mit der Pflichtenübertragung
        verbundenen Rechte und Pflichten sowie die möglichen Rechtsfolgen bei Pflichtverletzungen
        (§§ 25, 26 ArbSchG, § 209 SGB VII, §§ 222, 229 StGB) informiert.
      </Text>

      <SectionTitle>§ 3 Haftung</SectionTitle>
      <Text style={localStyles.legalText}>
        Bei schuldhafter Verletzung der übertragenen Pflichten kann der Arbeitnehmer gemäß
        den gesetzlichen Bestimmungen persönlich haftbar gemacht werden. Der Arbeitgeber
        stellt den Arbeitnehmer im Rahmen der betrieblichen Haftungsregelungen von
        Ansprüchen Dritter frei, soweit keine grobe Fahrlässigkeit oder Vorsatz vorliegt.
      </Text>

      <SectionTitle>§ 4 Schlussbestimmungen</SectionTitle>
      <Text style={localStyles.legalText}>
        Alle übrigen Bestimmungen des Arbeitsvertrages bleiben unberührt. Dieser Zusatz
        tritt mit Unterzeichnung durch beide Parteien in Kraft. Änderungen und Ergänzungen
        bedürfen der Schriftform.
      </Text>

      <InfoGrid>
        <InfoRow label="Ort, Datum:" value={formatDate(fd.datum)} />
      </InfoGrid>

      <SignatureBlock
        lines={[
          { label: "Arbeitgeber" },
          { label: "Arbeitnehmer", name: fd.person.name },
        ]}
      />
      <CreatedWith />
    </Page>
  );
}

function A02Document({ data }: { data: DocumentData }) {
  return (
    <Document
      title={`Pflichtenübertragung - ${data.formData.person.name} - ${data.company.name}`}
      author="AcoManage"
      subject="Übertragung der Unternehmerpflichten + Zusatz zum Arbeitsvertrag"
    >
      <PflichtenPage data={data} />
      <ZusatzPage data={data} />
    </Document>
  );
}

export async function renderA02Pflichtuebertragung(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any
): Promise<Buffer> {
  const buffer = await renderToBuffer(<A02Document data={document} />);
  return Buffer.from(buffer);
}

export { A02_DEFAULT_PFLICHTEN };
