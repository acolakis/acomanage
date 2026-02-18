import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: "#1a1a1a",
  },
  header: {
    position: "absolute",
    top: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
  },
  headerText: {
    fontSize: 7,
    color: "#888",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: "#888",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoLabel: {
    width: 140,
    fontSize: 9,
    color: "#666",
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    fontWeight: "bold",
  },
  table: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 5,
    paddingHorizontal: 4,
    minHeight: 28,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 5,
    paddingHorizontal: 4,
    minHeight: 28,
    backgroundColor: "#fafafa",
  },
  th: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#374151",
  },
  td: {
    fontSize: 8,
    color: "#374151",
  },
  colNr: { width: "5%" },
  colFactor: { width: "18%" },
  colDesc: { width: "17%" },
  colRisk: { width: "8%" },
  colMeasure: { width: "22%" },
  colType: { width: "6%" },
  colResp: { width: "12%" },
  colDeadline: { width: "8%" },
  colStatus: { width: "7%" },
  riskBadge: {
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  matrix: {
    marginTop: 12,
  },
  matrixRow: {
    flexDirection: "row",
  },
  matrixCell: {
    width: 50,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#d1d5db",
  },
  matrixLabel: {
    width: 50,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  signatureBlock: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureLine: {
    width: 200,
  },
  signatureRule: {
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    marginBottom: 4,
    height: 40,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#666",
  },
});

interface HazardData {
  hazardNumber: number;
  hazardFactor: string;
  hazardCategory: string | null;
  description: string | null;
  probability: number | null;
  severity: number | null;
  riskLevel: string | null;
  measure: string | null;
  measureType: string | null;
  responsible: string | null;
  deadline: string | null;
  status: string;
}

interface GbuData {
  title: string;
  assessmentType: string;
  legalBasis: string | null;
  assessedArea: string | null;
  status: string;
  version: number;
  assessmentDate: string | null;
  nextReviewDate: string | null;
  companyName: string;
  assessedByName: string | null;
  hazards: HazardData[];
}

const typeLabels: Record<string, string> = {
  activity: "Tätigkeitsbezogen",
  workplace: "Arbeitsplatzbezogen",
  substance: "Gefahrstoffbezogen",
  machine: "Maschinenbezogen",
  psyche: "Psychische Belastungen",
};

const riskLabels: Record<string, string> = {
  NIEDRIG: "Niedrig",
  MITTEL: "Mittel",
  HOCH: "Hoch",
  KRITISCH: "Kritisch",
};

function getRiskStyle(level: string | null) {
  switch (level) {
    case "NIEDRIG":
      return { backgroundColor: "#dcfce7", color: "#166534" };
    case "MITTEL":
      return { backgroundColor: "#fef9c3", color: "#854d0e" };
    case "HOCH":
      return { backgroundColor: "#fed7aa", color: "#9a3412" };
    case "KRITISCH":
      return { backgroundColor: "#fecaca", color: "#991b1b" };
    default:
      return {};
  }
}

function getMatrixColor(risk: number) {
  if (risk >= 16) return "#ef4444";
  if (risk >= 10) return "#f97316";
  if (risk >= 5) return "#eab308";
  return "#22c55e";
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function GbuDocument({ data }: { data: GbuData }) {
  return (
    <Document
      title={`GBU ${data.title} - ${data.companyName}`}
      author="AcoManage"
      subject="Gefährdungsbeurteilung"
    >
      {/* Page 1: Info + Hazards Table */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerText}>
            {data.companyName} — {data.title}
          </Text>
          <Text style={styles.headerText}>Version {data.version}</Text>
        </View>
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AcoManage — Gefährdungsbeurteilung</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Seite ${pageNumber} von ${totalPages}`
            }
          />
        </View>

        <Text style={styles.title}>Gefährdungsbeurteilung</Text>
        <Text style={styles.subtitle}>{data.title}</Text>

        {/* Info Section */}
        <View style={{ marginBottom: 16 }}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Betrieb:</Text>
            <Text style={styles.infoValue}>{data.companyName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Art:</Text>
            <Text style={styles.infoValue}>
              {typeLabels[data.assessmentType] || data.assessmentType}
            </Text>
          </View>
          {data.assessedArea && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Beurteilter Bereich:</Text>
              <Text style={styles.infoValue}>{data.assessedArea}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Datum:</Text>
            <Text style={styles.infoValue}>{formatDate(data.assessmentDate)}</Text>
          </View>
          {data.assessedByName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Beurteilt von:</Text>
              <Text style={styles.infoValue}>{data.assessedByName}</Text>
            </View>
          )}
          {data.legalBasis && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rechtsgrundlage:</Text>
              <Text style={styles.infoValue}>{data.legalBasis}</Text>
            </View>
          )}
        </View>

        {/* Hazards Table */}
        <Text style={styles.sectionTitle}>Gefährdungen und Maßnahmen</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colNr]}>Nr.</Text>
            <Text style={[styles.th, styles.colFactor]}>Gefährdung</Text>
            <Text style={[styles.th, styles.colDesc]}>Beschreibung</Text>
            <Text style={[styles.th, styles.colRisk]}>Risiko</Text>
            <Text style={[styles.th, styles.colMeasure]}>Maßnahme</Text>
            <Text style={[styles.th, styles.colType]}>TOP</Text>
            <Text style={[styles.th, styles.colResp]}>Verantw.</Text>
            <Text style={[styles.th, styles.colDeadline]}>Frist</Text>
            <Text style={[styles.th, styles.colStatus]}>Status</Text>
          </View>

          {data.hazards.map((h, idx) => (
            <View
              key={h.hazardNumber}
              style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              wrap={false}
            >
              <Text style={[styles.td, styles.colNr]}>{h.hazardNumber}</Text>
              <Text style={[styles.td, styles.colFactor]}>{h.hazardFactor}</Text>
              <Text style={[styles.td, styles.colDesc]}>{h.description || "—"}</Text>
              <View style={styles.colRisk}>
                {h.riskLevel ? (
                  <View style={[styles.riskBadge, getRiskStyle(h.riskLevel)]}>
                    <Text style={[{ fontSize: 7 }, getRiskStyle(h.riskLevel)]}>
                      {riskLabels[h.riskLevel]}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.td}>—</Text>
                )}
              </View>
              <Text style={[styles.td, styles.colMeasure]}>{h.measure || "—"}</Text>
              <Text style={[styles.td, styles.colType]}>{h.measureType || "—"}</Text>
              <Text style={[styles.td, styles.colResp]}>{h.responsible || "—"}</Text>
              <Text style={[styles.td, styles.colDeadline]}>
                {h.deadline ? formatDate(h.deadline) : "—"}
              </Text>
              <Text style={[styles.td, styles.colStatus]}>
                {h.status === "completed" ? "✓" : "○"}
              </Text>
            </View>
          ))}
        </View>
      </Page>

      {/* Page 2: Risk Matrix + Signatures */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerText}>
            {data.companyName} — {data.title}
          </Text>
          <Text style={styles.headerText}>Risikomatrix</Text>
        </View>
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AcoManage — Gefährdungsbeurteilung</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Seite ${pageNumber} von ${totalPages}`
            }
          />
        </View>

        <Text style={styles.sectionTitle}>Risikomatrix (5×5)</Text>

        {/* Matrix */}
        <View style={styles.matrix}>
          {/* Header row */}
          <View style={styles.matrixRow}>
            <View style={styles.matrixLabel}>
              <Text style={{ fontSize: 7, color: "#888" }}>W \ S</Text>
            </View>
            {[1, 2, 3, 4, 5].map((s) => (
              <View key={s} style={styles.matrixLabel}>
                <Text style={{ fontSize: 8, fontWeight: "bold" }}>{s}</Text>
              </View>
            ))}
          </View>

          {[5, 4, 3, 2, 1].map((p) => (
            <View key={p} style={styles.matrixRow}>
              <View style={styles.matrixLabel}>
                <Text style={{ fontSize: 8, fontWeight: "bold" }}>{p}</Text>
              </View>
              {[1, 2, 3, 4, 5].map((s) => {
                const hazardsInCell = data.hazards.filter(
                  (h) => h.probability === p && h.severity === s
                );
                return (
                  <View
                    key={s}
                    style={[
                      styles.matrixCell,
                      { backgroundColor: getMatrixColor(p * s) },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 7,
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      {hazardsInCell.length > 0
                        ? hazardsInCell.map((h) => `#${h.hazardNumber}`).join(",")
                        : p * s}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 8, color: "#888", marginTop: 8 }}>
          W = Wahrscheinlichkeit (1-5), S = Schwere (1-5), Risikozahl = W × S
        </Text>
        <Text style={{ fontSize: 8, color: "#888", marginTop: 2 }}>
          Grün (1-4) = Niedrig, Gelb (5-9) = Mittel, Orange (10-15) = Hoch, Rot
          (16-25) = Kritisch
        </Text>

        {/* Summary */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Zusammenfassung</Text>
        <View style={{ marginBottom: 8 }}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gefährdungen gesamt:</Text>
            <Text style={styles.infoValue}>{data.hazards.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hoch/Kritisch:</Text>
            <Text style={[styles.infoValue, { color: "#dc2626" }]}>
              {data.hazards.filter((h) => h.riskLevel === "HOCH" || h.riskLevel === "KRITISCH").length}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Offene Maßnahmen:</Text>
            <Text style={styles.infoValue}>
              {data.hazards.filter((h) => h.status === "open").length}
            </Text>
          </View>
          {data.nextReviewDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nächste Überprüfung:</Text>
              <Text style={styles.infoValue}>{formatDate(data.nextReviewDate)}</Text>
            </View>
          )}
        </View>

        {/* Signatures */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine}>
            <View style={styles.signatureRule} />
            <Text style={styles.signatureLabel}>
              Erstellt von (FaSi)
            </Text>
          </View>
          <View style={styles.signatureLine}>
            <View style={styles.signatureRule} />
            <Text style={styles.signatureLabel}>
              Genehmigt von (Arbeitgeber)
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderGbuReport(data: GbuData): Promise<Buffer> {
  const buffer = await renderToBuffer(<GbuDocument data={data} />);
  return Buffer.from(buffer);
}
