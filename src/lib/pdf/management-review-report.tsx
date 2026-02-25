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
    fontSize: 9,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: "#1a1a1a",
  },
  coverPage: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingHorizontal: 40,
    paddingVertical: 60,
    color: "#1a1a1a",
    justifyContent: "space-between",
  },
  coverHeader: { marginTop: 80 },
  coverTitle: { fontSize: 28, fontWeight: "bold", color: "#1a1a1a", marginBottom: 8 },
  coverSubtitle: { fontSize: 16, color: "#666", marginBottom: 40 },
  coverInfoBlock: { marginBottom: 12 },
  coverInfoLabel: { fontSize: 10, color: "#888", marginBottom: 2 },
  coverInfoValue: { fontSize: 13, fontWeight: "bold" },
  coverDivider: { height: 3, backgroundColor: "#2563eb", marginVertical: 20, width: 80 },
  coverFooter: { marginBottom: 40 },
  coverFooterText: { fontSize: 8, color: "#999" },
  // Header/Footer
  header: {
    position: "absolute", top: 20, left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 8,
  },
  headerText: { fontSize: 7, color: "#888" },
  footer: {
    position: "absolute", bottom: 20, left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8,
  },
  footerText: { fontSize: 7, color: "#888" },
  // Sections
  sectionTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 12, marginTop: 8, color: "#1a1a1a" },
  subsectionTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 6, marginTop: 10, color: "#374151" },
  // Info rows
  infoRow: { flexDirection: "row", marginBottom: 4 },
  infoLabel: { width: 150, fontSize: 9, color: "#666" },
  infoValue: { flex: 1, fontSize: 9, fontWeight: "bold" },
  // Content blocks
  contentBlock: {
    backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 4, padding: 10, marginBottom: 10,
  },
  contentLabel: { fontSize: 9, fontWeight: "bold", color: "#374151", marginBottom: 4 },
  contentText: { fontSize: 9, lineHeight: 1.5, color: "#374151" },
  // Empty placeholder
  emptyText: { fontSize: 9, color: "#999", fontStyle: "italic" },
});

// Types
export interface ReviewReportData {
  id: string;
  reviewNumber: string | null;
  reviewDate: string;
  // Inputs (Clause 9.3)
  statusPreviousActions: string | null;
  changesInternalExternal: string | null;
  ohsPerformance: unknown;
  incidentSummary: string | null;
  auditResults: string | null;
  consultationResults: string | null;
  risksOpportunities: string | null;
  objectiveProgress: string | null;
  // Outputs
  ohsFitness: string | null;
  improvementNeeds: string | null;
  resourceNeeds: string | null;
  decisions: string | null;
  // Meta
  attendees: string | null;
  approvedAt: string | null;
  createdAt: string;
  company: { name: string };
  approvedBy: { firstName: string | null; lastName: string | null } | null;
  createdBy: { firstName: string | null; lastName: string | null } | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatUserName(user: { firstName: string | null; lastName: string | null } | null): string {
  if (!user) return "—";
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "—";
}

function formatOhsPerformance(data: unknown): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
  return String(data);
}

// Content block component for input/output sections
function ContentItem({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.contentBlock}>
      <Text style={styles.contentLabel}>{label}</Text>
      {value ? (
        <Text style={styles.contentText}>{value}</Text>
      ) : (
        <Text style={styles.emptyText}>Keine Angabe</Text>
      )}
    </View>
  );
}

// Cover Page
function CoverPage({ data }: { data: ReviewReportData }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverHeader}>
        <Text style={styles.coverTitle}>Managementbewertung</Text>
        <Text style={styles.coverSubtitle}>
          {data.reviewNumber || "Ohne Nummer"}
        </Text>
        <View style={styles.coverDivider} />

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Betrieb</Text>
          <Text style={styles.coverInfoValue}>{data.company.name}</Text>
        </View>

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Bewertungsdatum</Text>
          <Text style={styles.coverInfoValue}>{formatDate(data.reviewDate)}</Text>
        </View>

        {data.attendees && (
          <View style={styles.coverInfoBlock}>
            <Text style={styles.coverInfoLabel}>Teilnehmer</Text>
            <Text style={styles.coverInfoValue}>{data.attendees}</Text>
          </View>
        )}

        {data.approvedBy && (
          <View style={styles.coverInfoBlock}>
            <Text style={styles.coverInfoLabel}>Genehmigt von</Text>
            <Text style={styles.coverInfoValue}>{formatUserName(data.approvedBy)}</Text>
          </View>
        )}
      </View>

      <View style={styles.coverFooter}>
        <Text style={styles.coverFooterText}>
          Erstellt am {new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })} — AcoManage
        </Text>
      </View>
    </Page>
  );
}

// Header/Footer
function PageHeader({ data }: { data: ReviewReportData }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerText}>{data.company.name}</Text>
      <Text style={styles.headerText}>Managementbewertung</Text>
      <Text style={styles.headerText}>{data.reviewNumber || ""}</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>AcoManage — Managementbewertung</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
    </View>
  );
}

// Meta Section
function MetaSection({ data }: { data: ReviewReportData }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Allgemeine Angaben</Text>
      <View style={{ marginBottom: 12 }}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Betrieb:</Text>
          <Text style={styles.infoValue}>{data.company.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Bewertungsdatum:</Text>
          <Text style={styles.infoValue}>{formatDate(data.reviewDate)}</Text>
        </View>
        {data.attendees && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Teilnehmer:</Text>
            <Text style={styles.infoValue}>{data.attendees}</Text>
          </View>
        )}
        {data.approvedBy && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Genehmigt von:</Text>
            <Text style={styles.infoValue}>
              {formatUserName(data.approvedBy)}
              {data.approvedAt ? ` (${formatDate(data.approvedAt)})` : ""}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Inputs Section (Clause 9.3)
function InputsSection({ data }: { data: ReviewReportData }) {
  const ohsPerformanceText = formatOhsPerformance(data.ohsPerformance);

  return (
    <View>
      <Text style={styles.sectionTitle}>Eingaben gemäß ISO 45001:2018 Abschnitt 9.3</Text>

      <ContentItem
        label="Status vorheriger Maßnahmen"
        value={data.statusPreviousActions}
      />

      <ContentItem
        label="Änderungen interner/externer Themen"
        value={data.changesInternalExternal}
      />

      <ContentItem
        label="SGA-Leistung"
        value={ohsPerformanceText || null}
      />

      <ContentItem
        label="Vorfallzusammenfassung"
        value={data.incidentSummary}
      />

      <ContentItem
        label="Auditergebnisse"
        value={data.auditResults}
      />

      <ContentItem
        label="Konsultationsergebnisse"
        value={data.consultationResults}
      />

      <ContentItem
        label="Risiken und Chancen"
        value={data.risksOpportunities}
      />

      <ContentItem
        label="Zielfortschritte"
        value={data.objectiveProgress}
      />
    </View>
  );
}

// Outputs Section
function OutputsSection({ data }: { data: ReviewReportData }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Ergebnisse</Text>

      <ContentItem
        label="Eignung des SGA-Systems"
        value={data.ohsFitness}
      />

      <ContentItem
        label="Verbesserungsbedarf"
        value={data.improvementNeeds}
      />

      <ContentItem
        label="Ressourcenbedarf"
        value={data.resourceNeeds}
      />

      <ContentItem
        label="Beschlüsse"
        value={data.decisions}
      />
    </View>
  );
}

// Footer info section
function FooterInfoSection({ data }: { data: ReviewReportData }) {
  return (
    <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 12 }}>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Erstellt am:</Text>
        <Text style={styles.infoValue}>{formatDate(data.createdAt)}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Erstellt von:</Text>
        <Text style={styles.infoValue}>{formatUserName(data.createdBy)}</Text>
      </View>
    </View>
  );
}

// Main Document
function ManagementReviewDocument({ data }: { data: ReviewReportData }) {
  return (
    <Document
      title={`Managementbewertung ${data.reviewNumber || ""} - ${data.company.name}`}
      author="AcoManage"
      subject="Managementbewertung"
    >
      <CoverPage data={data} />

      <Page size="A4" style={styles.page}>
        <PageHeader data={data} />
        <PageFooter />
        <MetaSection data={data} />
        <InputsSection data={data} />
      </Page>

      <Page size="A4" style={styles.page}>
        <PageHeader data={data} />
        <PageFooter />
        <OutputsSection data={data} />
        <FooterInfoSection data={data} />
      </Page>
    </Document>
  );
}

export async function renderManagementReviewReport(data: ReviewReportData): Promise<Buffer> {
  const buffer = await renderToBuffer(<ManagementReviewDocument data={data} />);
  return Buffer.from(buffer);
}
