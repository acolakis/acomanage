import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const colors = {
  orange: "#f97316",
  red: "#dc2626",
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#eab308",
  gray: "#6b7280",
  darkGray: "#374151",
  black: "#000000",
  white: "#ffffff",
  lightGray: "#f3f4f6",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 0,
    color: colors.black,
  },
  // Title bar
  titleBar: {
    backgroundColor: colors.orange,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.white,
  },
  titleRight: {
    fontSize: 10,
    color: colors.white,
  },
  // Section
  section: {
    borderWidth: 2,
    borderColor: colors.orange,
    marginHorizontal: 15,
    marginTop: 8,
  },
  sectionHeader: {
    backgroundColor: colors.orange,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.white,
  },
  sectionContent: {
    padding: 10,
  },
  sectionText: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  // Blue section (protective measures)
  sectionBlue: {
    borderColor: colors.blue,
  },
  sectionHeaderBlue: {
    backgroundColor: colors.blue,
  },
  // Green section (first aid)
  sectionGreen: {
    borderColor: colors.green,
  },
  sectionHeaderGreen: {
    backgroundColor: colors.green,
  },
  // Red section (hazards, emergency)
  sectionRed: {
    borderColor: colors.red,
  },
  sectionHeaderRed: {
    backgroundColor: colors.red,
  },
  // Yellow section (storage)
  sectionYellow: {
    borderColor: colors.yellow,
  },
  sectionHeaderYellow: {
    backgroundColor: colors.yellow,
  },
  // GHS row
  ghsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  ghsBadge: {
    borderWidth: 2,
    borderColor: colors.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    transform: "rotate(45deg)",
  },
  ghsBadgeText: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.red,
  },
  // Table
  bulletItem: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bullet: {
    width: 10,
    fontSize: 9,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.4,
  },
  // Sub-label
  subLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.darkGray,
    marginTop: 4,
    marginBottom: 2,
  },
  // H/P statements
  statementRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  statementBadge: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  statementText: {
    fontSize: 7,
    fontWeight: "bold",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 10,
    left: 15,
    right: 15,
    borderTopWidth: 1,
    borderTopColor: colors.gray,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: colors.gray,
  },
});

interface GbaData {
  substanceName: string;
  manufacturer: string | null;
  casNumber: string | null;
  gbaNumber: string | null;
  companyName: string;
  ghsPictograms: string[];
  signalWord: string | null;
  hStatements: string[];
  pStatements: string[];
  hazards: {
    physicalHazards: string[];
    healthHazards: string[];
    environmentalHazards: string[];
  } | null;
  protectiveMeasures: {
    eyeProtection: string;
    handProtection: string;
    skinProtection: string;
    respiratoryProtection: string;
    generalMeasures: string;
  } | null;
  firstAid: {
    inhalation: string;
    skinContact: string;
    eyeContact: string;
    ingestion: string;
    generalNotes: string;
  } | null;
  emergencyBehavior: {
    fireExtinguishing: string;
    spillCleanup: string;
    personalPrecautions: string;
  } | null;
  disposal: {
    wasteCode: string;
    disposalMethod: string;
  } | null;
  storage: {
    conditions: string;
    incompatibleMaterials: string;
  } | null;
}

const ghsLabels: Record<string, string> = {
  GHS01: "Explosiv",
  GHS02: "Entzündbar",
  GHS03: "Oxidierend",
  GHS04: "Unter Druck",
  GHS05: "Ätzend",
  GHS06: "Giftig",
  GHS07: "Reizend",
  GHS08: "Gesundheitsgefahr",
  GHS09: "Umweltgefährlich",
};

function BulletItem({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View style={styles.bulletItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function GbaDocument({ data }: { data: GbaData }) {
  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <Document
      title={`Betriebsanweisung ${data.substanceName}`}
      author="AcoManage"
      subject="Gefahrstoff-Betriebsanweisung"
    >
      <Page size="A4" style={styles.page}>
        {/* Title */}
        <View style={styles.titleBar}>
          <Text style={styles.titleText}>
            Betriebsanweisung — Gefahrstoffe
          </Text>
          <Text style={styles.titleRight}>
            {data.companyName}
          </Text>
        </View>

        {/* Substance Info */}
        <View style={[styles.section, { marginTop: 12 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>
              Gefahrstoffbezeichnung
            </Text>
          </View>
          <View style={styles.sectionContent}>
            <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 4 }}>
              {data.substanceName}
            </Text>
            {data.manufacturer && (
              <Text style={styles.sectionText}>
                Hersteller: {data.manufacturer}
              </Text>
            )}
            {data.casNumber && (
              <Text style={styles.sectionText}>
                CAS-Nr.: {data.casNumber}
              </Text>
            )}
            {data.gbaNumber && (
              <Text style={styles.sectionText}>
                GBA-Nr.: {data.gbaNumber}
              </Text>
            )}

            {/* GHS Pictograms */}
            {data.ghsPictograms.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <View style={styles.ghsRow}>
                  {data.ghsPictograms.map((ghs) => (
                    <View key={ghs} style={{ alignItems: "center" }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderWidth: 2,
                          borderColor: colors.red,
                          transform: "rotate(45deg)",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 6,
                            fontWeight: "bold",
                            color: colors.red,
                            transform: "rotate(-45deg)",
                          }}
                        >
                          {ghs}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 6, color: colors.gray, marginTop: 4 }}>
                        {ghsLabels[ghs]}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {data.signalWord && (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: data.signalWord === "Gefahr" ? colors.red : colors.orange,
                  marginTop: 4,
                }}
              >
                {data.signalWord}
              </Text>
            )}

            {/* H-Statements */}
            {data.hStatements.length > 0 && (
              <View style={styles.statementRow}>
                {data.hStatements.map((h) => (
                  <View key={h} style={styles.statementBadge}>
                    <Text style={styles.statementText}>{h}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Gefahren */}
        <View style={[styles.section, styles.sectionRed]}>
          <View style={[styles.sectionHeader, styles.sectionHeaderRed]}>
            <Text style={styles.sectionHeaderText}>
              Gefahren für Mensch und Umwelt
            </Text>
          </View>
          <View style={styles.sectionContent}>
            {data.hazards?.healthHazards?.map((h, i) => (
              <BulletItem key={`h-${i}`} text={h} />
            ))}
            {data.hazards?.physicalHazards?.map((h, i) => (
              <BulletItem key={`p-${i}`} text={h} />
            ))}
            {data.hazards?.environmentalHazards?.map((h, i) => (
              <BulletItem key={`e-${i}`} text={h} />
            ))}
          </View>
        </View>

        {/* Schutzmaßnahmen */}
        <View style={[styles.section, styles.sectionBlue]}>
          <View style={[styles.sectionHeader, styles.sectionHeaderBlue]}>
            <Text style={styles.sectionHeaderText}>
              Schutzmaßnahmen und Verhaltensregeln
            </Text>
          </View>
          <View style={styles.sectionContent}>
            {data.protectiveMeasures?.generalMeasures && (
              <BulletItem text={data.protectiveMeasures.generalMeasures} />
            )}
            {data.protectiveMeasures?.eyeProtection && (
              <>
                <Text style={styles.subLabel}>Augenschutz:</Text>
                <BulletItem text={data.protectiveMeasures.eyeProtection} />
              </>
            )}
            {data.protectiveMeasures?.handProtection && (
              <>
                <Text style={styles.subLabel}>Handschutz:</Text>
                <BulletItem text={data.protectiveMeasures.handProtection} />
              </>
            )}
            {data.protectiveMeasures?.skinProtection && (
              <>
                <Text style={styles.subLabel}>Hautschutz:</Text>
                <BulletItem text={data.protectiveMeasures.skinProtection} />
              </>
            )}
            {data.protectiveMeasures?.respiratoryProtection && (
              <>
                <Text style={styles.subLabel}>Atemschutz:</Text>
                <BulletItem text={data.protectiveMeasures.respiratoryProtection} />
              </>
            )}

            {/* P-Statements */}
            {data.pStatements.length > 0 && (
              <View style={[styles.statementRow, { marginTop: 6 }]}>
                {data.pStatements.map((p) => (
                  <View key={p} style={styles.statementBadge}>
                    <Text style={styles.statementText}>{p}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Erste Hilfe */}
        <View style={[styles.section, styles.sectionGreen]}>
          <View style={[styles.sectionHeader, styles.sectionHeaderGreen]}>
            <Text style={styles.sectionHeaderText}>
              Verhalten im Gefahrfall / Erste Hilfe
            </Text>
          </View>
          <View style={styles.sectionContent}>
            {data.firstAid?.inhalation && (
              <>
                <Text style={styles.subLabel}>Einatmen:</Text>
                <BulletItem text={data.firstAid.inhalation} />
              </>
            )}
            {data.firstAid?.skinContact && (
              <>
                <Text style={styles.subLabel}>Hautkontakt:</Text>
                <BulletItem text={data.firstAid.skinContact} />
              </>
            )}
            {data.firstAid?.eyeContact && (
              <>
                <Text style={styles.subLabel}>Augenkontakt:</Text>
                <BulletItem text={data.firstAid.eyeContact} />
              </>
            )}
            {data.firstAid?.ingestion && (
              <>
                <Text style={styles.subLabel}>Verschlucken:</Text>
                <BulletItem text={data.firstAid.ingestion} />
              </>
            )}
            {data.emergencyBehavior?.fireExtinguishing && (
              <>
                <Text style={styles.subLabel}>Brandbekämpfung:</Text>
                <BulletItem text={data.emergencyBehavior.fireExtinguishing} />
              </>
            )}
            {data.emergencyBehavior?.spillCleanup && (
              <>
                <Text style={styles.subLabel}>Bei Freisetzung:</Text>
                <BulletItem text={data.emergencyBehavior.spillCleanup} />
              </>
            )}
          </View>
        </View>

        {/* Lagerung und Entsorgung */}
        <View style={[styles.section, styles.sectionYellow]}>
          <View style={[styles.sectionHeader, styles.sectionHeaderYellow]}>
            <Text style={[styles.sectionHeaderText, { color: colors.black }]}>
              Sachgerechte Lagerung / Entsorgung
            </Text>
          </View>
          <View style={styles.sectionContent}>
            {data.storage?.conditions && (
              <>
                <Text style={styles.subLabel}>Lagerung:</Text>
                <BulletItem text={data.storage.conditions} />
              </>
            )}
            {data.storage?.incompatibleMaterials && (
              <>
                <Text style={styles.subLabel}>Unverträglichkeiten:</Text>
                <BulletItem text={data.storage.incompatibleMaterials} />
              </>
            )}
            {data.disposal?.disposalMethod && (
              <>
                <Text style={styles.subLabel}>Entsorgung:</Text>
                <BulletItem text={data.disposal.disposalMethod} />
              </>
            )}
            {data.disposal?.wasteCode && (
              <Text style={{ fontSize: 8, color: colors.gray, marginTop: 2 }}>
                Abfallschlüssel: {data.disposal.wasteCode}
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Erstellt: {today} — AcoManage
          </Text>
          <Text style={styles.footerText}>
            Nächste Überprüfung: _____________
          </Text>
          <Text style={styles.footerText}>
            Unterschrift: _____________
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderGbaReport(data: GbaData): Promise<Buffer> {
  const buffer = await renderToBuffer(<GbaDocument data={data} />);
  return Buffer.from(buffer);
}
