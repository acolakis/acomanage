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

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 40,
    color: "#000000",
  },
  // Top section: title left + unterweisende firma right
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  topLeft: {
    flex: 1,
  },
  topRight: {
    width: 200,
    borderWidth: 1,
    borderColor: "#000",
    padding: 6,
  },
  titleSmall: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 2,
  },
  titleLarge: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  topRightLabel: {
    fontSize: 7,
    marginBottom: 3,
  },
  topRightText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  topRightTextNormal: {
    fontSize: 9,
  },
  // Info block: 3-column layout
  infoBlock: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 10,
  },
  infoLeft: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  infoMiddle: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  infoMiddleRow: {
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  infoMiddleRowLast: {
    padding: 6,
  },
  infoRight: {
    width: 170,
    padding: 6,
  },
  infoLabel: {
    fontSize: 7,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 9,
  },
  infoTextBold: {
    fontSize: 9,
    fontWeight: "bold",
  },
  // Inhalt section
  inhaltHeader: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
  },
  inhaltBox: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 8,
    marginBottom: 10,
    minHeight: 60,
  },
  inhaltText: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  // Unterwiesene hint
  unterwieseneHint: {
    marginBottom: 6,
  },
  unterwieseneLabel: {
    fontSize: 9,
    fontWeight: "bold",
  },
  unterwieseneText: {
    fontSize: 8,
  },
  // Participant table
  table: {
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#f0f0f0",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    minHeight: 22,
  },
  tableRowLast: {
    flexDirection: "row",
    minHeight: 22,
  },
  colName: {
    width: "35%",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  colVorname: {
    width: "30%",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  colUnterschrift: {
    width: "35%",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  // Footer section
  footerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  footerLeft: {
    width: 120,
  },
  footerMiddle: {
    flex: 1,
    paddingLeft: 20,
  },
  footerRight: {
    width: 180,
    alignItems: "flex-end",
  },
  footerLabel: {
    fontSize: 8,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 9,
    fontWeight: "bold",
  },
  footerLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    width: 180,
    marginBottom: 4,
    marginTop: 20,
  },
  durchfuehrenderName: {
    fontSize: 9,
    fontWeight: "bold",
  },
  durchfuehrenderTitle: {
    fontSize: 8,
    fontStyle: "italic",
  },
});

interface UnterweisungData {
  company: {
    name: string;
    street?: string | null;
    zip?: string | null;
    city?: string | null;
  };
  abteilung?: string | null;
  ort?: string | null;
  datum: string;
  zeitVon?: string | null;
  zeitBis?: string | null;
  anlass: string[];
  inhalt: string;
  naechsterTermin?: string | null;
  teilnehmerAnzahl?: number | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function UnterweisungNachweis({ data }: { data: UnterweisungData }) {
  const rows = data.teilnehmerAnzahl || 10;
  const datumStr = formatDate(data.datum);
  const zeitStr =
    data.zeitVon && data.zeitBis
      ? `${datumStr}, ${data.zeitVon} – ${data.zeitBis}`
      : data.zeitVon
        ? `${datumStr}, ${data.zeitVon}`
        : datumStr;

  const companyAddress = [
    data.company.street,
    [data.company.zip, data.company.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Document
      title="Unterweisungsnachweis"
      author="AcoManage"
      subject="Unterweisungsnachweis"
    >
      <Page size="A4" style={styles.page}>
        {/* Top: Title + Unterweisende Firma */}
        <View style={styles.topSection}>
          <View style={styles.topLeft}>
            <Text style={styles.titleSmall}>Arbeitsschutzberatung</Text>
            <Text style={styles.titleLarge}>Unterweisungsnachweis</Text>
          </View>
          <View style={styles.topRight}>
            <Text style={styles.topRightLabel}>
              Unterweisende Firma/Unterweisender:
            </Text>
            <Text style={styles.topRightText}>Abdurrahman Colak</Text>
            <Text style={styles.topRightText}>
              Fachkraft für Arbeitssicherheit
            </Text>
            <Text style={styles.topRightTextNormal}>AWS Arbeitsschutz</Text>
            <Text style={styles.topRightTextNormal}>
              Carlo – Schmid – Str. 12
            </Text>
            <Text style={styles.topRightTextNormal}>52146 Würselen</Text>
          </View>
        </View>

        {/* Info block */}
        <View style={styles.infoBlock}>
          {/* Left: Zu unterweisende Firma */}
          <View style={styles.infoLeft}>
            <Text style={styles.infoLabel}>Zu unterweisende Firma:</Text>
            <Text style={styles.infoTextBold}>{data.company.name}</Text>
            {companyAddress ? (
              <Text style={styles.infoText}>{companyAddress}</Text>
            ) : null}
          </View>
          {/* Middle: Abteilung, Ort, Datum */}
          <View style={styles.infoMiddle}>
            <View style={styles.infoMiddleRow}>
              <Text style={styles.infoLabel}>
                Abteilung: {data.abteilung || ""}
              </Text>
            </View>
            <View style={styles.infoMiddleRow}>
              <Text style={styles.infoLabel}>Ort: {data.ort || ""}</Text>
            </View>
            <View style={styles.infoMiddleRowLast}>
              <Text style={styles.infoLabel}>Datum: {zeitStr}</Text>
            </View>
          </View>
          {/* Right: Anlass */}
          <View style={styles.infoRight}>
            <Text style={styles.infoLabel}>Anlass der Unterweisung:</Text>
            {data.anlass.map((a, i) => (
              <Text key={i} style={styles.infoText}>
                {a}
              </Text>
            ))}
          </View>
        </View>

        {/* Inhalt der Unterweisung / Beratung */}
        <Text style={styles.inhaltHeader}>
          Inhalt der Unterweisung / Beratung
        </Text>
        <View style={styles.inhaltBox}>
          <Text style={styles.inhaltText}>{data.inhalt}</Text>
        </View>

        {/* Unterwiesene Hinweis */}
        <View style={styles.unterwieseneHint}>
          <Text>
            <Text style={styles.unterwieseneLabel}>Unterwiesene: </Text>
            <Text style={styles.unterwieseneText}>
              Mit der Unterschrift bestätigt der Mitarbeiter die Schulungs-/
              Unterweisungsinhalte verstanden zu haben und zukünftig umzusetzen.
            </Text>
          </Text>
        </View>

        {/* Teilnehmer-Tabelle (leer) */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeaderRow}>
            <View style={styles.colName}>
              <Text style={styles.tableHeaderText}>Name</Text>
            </View>
            <View style={styles.colVorname}>
              <Text style={styles.tableHeaderText}>Vorname</Text>
            </View>
            <View style={styles.colUnterschrift}>
              <Text style={styles.tableHeaderText}>Unterschrift</Text>
            </View>
          </View>
          {/* Empty rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <View
              key={i}
              style={i < rows - 1 ? styles.tableRow : styles.tableRowLast}
            >
              <View style={styles.colName}>
                <Text> </Text>
              </View>
              <View style={styles.colVorname}>
                <Text> </Text>
              </View>
              <View style={styles.colUnterschrift}>
                <Text> </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer: Nächster Termin + Unterschriften */}
        <View style={styles.footerSection}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerLabel}>
              Nächster Unter-{"\n"}weisungstermin
            </Text>
            <Text style={styles.footerValue}>
              {data.naechsterTermin || ""}
            </Text>
          </View>
          <View style={styles.footerMiddle}>
            <Text style={styles.footerLabel}>Unterschrift Unternehmer:</Text>
            <View style={styles.footerLine} />
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.footerLabel}>Durchführender</Text>
            <Text style={styles.durchfuehrenderName}>Abdurrahman Colak</Text>
            <Text style={styles.durchfuehrenderTitle}>
              Fachkraft für Arbeitssicherheit
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderUnterweisungNachweis(
  data: UnterweisungData
): Promise<Buffer> {
  const buffer = await renderToBuffer(<UnterweisungNachweis data={data} />);
  return Buffer.from(buffer);
}
