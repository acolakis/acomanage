import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
    { src: "Helvetica-Oblique", fontStyle: "italic" },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 50,
    color: "#1a1a1a",
  },
  header: {
    position: "absolute",
    top: 20,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
  },
  headerText: { fontSize: 7, color: "#888" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: "#888" },
  companyName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    color: "#666",
    marginBottom: 24,
  },
  divider: {
    height: 2,
    backgroundColor: "#2563eb",
    marginBottom: 24,
    width: 60,
  },
  policyText: {
    fontSize: 10,
    lineHeight: 1.7,
    color: "#1a1a1a",
    marginBottom: 32,
    whiteSpace: "pre-wrap",
  },
  metaSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 16,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  metaLabel: {
    width: 120,
    fontSize: 9,
    color: "#666",
  },
  metaValue: {
    flex: 1,
    fontSize: 9,
    fontWeight: "bold",
  },
  signatureBlock: {
    marginTop: 48,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureLine: { width: 200 },
  signatureRule: {
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    marginBottom: 4,
    height: 40,
  },
  signatureLabel: { fontSize: 8, color: "#666" },
});

interface SgaPolicyData {
  companyName: string;
  companyCity: string | null;
  ohsPolicy: string;
  ohsPolicyDate: string | null;
  ohsPolicyApprovedBy: string | null;
  version: number;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function SgaPolicyDocument({ data }: { data: SgaPolicyData }) {
  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <Document
      title={`SGA-Politik - ${data.companyName}`}
      author="AcoManage"
      subject="SGA-Politik gemäß ISO 45001:2018"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <Text style={styles.headerText}>
            {data.companyName}
            {data.companyCity ? ` — ${data.companyCity}` : ""}
          </Text>
          <Text style={styles.headerText}>
            SGA-Politik | Version {data.version}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Erstellt mit AcoManage — {today}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Seite ${pageNumber} von ${totalPages}`
            }
          />
        </View>

        {/* Content */}
        <Text style={styles.companyName}>{data.companyName}</Text>
        <Text style={styles.title}>SGA-Politik</Text>
        <Text style={styles.subtitle}>
          gemäß ISO 45001:2018, Klausel 5.2
        </Text>
        <View style={styles.divider} />

        <Text style={styles.policyText}>{data.ohsPolicy}</Text>

        {/* Metadata */}
        <View style={styles.metaSection}>
          {data.ohsPolicyApprovedBy && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Genehmigt von:</Text>
              <Text style={styles.metaValue}>
                {data.ohsPolicyApprovedBy}
              </Text>
            </View>
          )}
          {data.ohsPolicyDate && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Datum:</Text>
              <Text style={styles.metaValue}>
                {formatDate(data.ohsPolicyDate)}
              </Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Version:</Text>
            <Text style={styles.metaValue}>{data.version}</Text>
          </View>
        </View>

        {/* Signature */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine}>
            <View style={styles.signatureRule} />
            <Text style={styles.signatureLabel}>Ort, Datum</Text>
          </View>
          <View style={styles.signatureLine}>
            <View style={styles.signatureRule} />
            <Text style={styles.signatureLabel}>
              Unterschrift Geschäftsführung
            </Text>
            {data.ohsPolicyApprovedBy && (
              <Text style={{ fontSize: 8, color: "#666", marginTop: 2 }}>
                {data.ohsPolicyApprovedBy}
              </Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderSgaPolicyPdf(
  data: SgaPolicyData
): Promise<Buffer> {
  const buffer = await renderToBuffer(<SgaPolicyDocument data={data} />);
  return Buffer.from(buffer);
}
