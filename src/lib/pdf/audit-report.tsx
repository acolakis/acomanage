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
  // Table styles
  tableHeader: {
    flexDirection: "row", backgroundColor: "#f3f4f6",
    borderWidth: 1, borderColor: "#d1d5db",
    paddingVertical: 5, paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 4, paddingHorizontal: 4, minHeight: 22,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 4, paddingHorizontal: 4, minHeight: 22,
    backgroundColor: "#fafafa",
  },
  tableHeaderText: { fontSize: 7, fontWeight: "bold", color: "#374151" },
  tableCellText: { fontSize: 8 },
  // Column widths for findings table
  colNr: { width: 24, alignItems: "center", justifyContent: "center" },
  colType: { width: 80, justifyContent: "center", paddingHorizontal: 2 },
  colClause: { width: 50, justifyContent: "center", paddingHorizontal: 2 },
  colDesc: { flex: 1, justifyContent: "center", paddingHorizontal: 4 },
  colEvidence: { width: 100, justifyContent: "center", paddingHorizontal: 2 },
  colAction: { width: 60, justifyContent: "center", paddingHorizontal: 2 },
  // Notes
  notesBlock: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 10, marginBottom: 12 },
  notesText: { fontSize: 9, lineHeight: 1.5, color: "#374151" },
  // Finding type badges
  badgeSchwer: { color: "#991b1b" },
  badgeLeicht: { color: "#9a3412" },
  badgeVerbesserung: { color: "#854d0e" },
  badgePositiv: { color: "#166534" },
});

// Types
interface FindingData {
  id: string;
  findingNumber: number;
  findingType: string;
  isoClause: string | null;
  description: string;
  evidence: string | null;
  action: {
    id: string;
    actionNumber: string | null;
    title: string;
  } | null;
}

export interface AuditReportData {
  id: string;
  auditNumber: string | null;
  title: string;
  auditType: string;
  isoClause: string | null;
  status: string;
  plannedDate: string | null;
  actualDate: string | null;
  auditees: string | null;
  scope: string | null;
  summary: string | null;
  positiveFindings: string | null;
  createdAt: string;
  company: { name: string };
  auditor: { firstName: string | null; lastName: string | null } | null;
  createdBy: { firstName: string | null; lastName: string | null } | null;
  findings: FindingData[];
}

const findingTypeLabels: Record<string, string> = {
  ABWEICHUNG_SCHWER: "Schwere Abweichung",
  ABWEICHUNG_LEICHT: "Leichte Abweichung",
  VERBESSERUNG: "Verbesserungspotential",
  POSITIV: "Positive Feststellung",
};

const auditTypeLabels: Record<string, string> = {
  SYSTEM: "Systemaudit",
  PROZESS: "Prozessaudit",
  COMPLIANCE: "Compliance-Audit",
};

const statusLabels: Record<string, string> = {
  GEPLANT: "Geplant",
  IN_DURCHFUEHRUNG: "In Durchführung",
  BERICHT: "Bericht",
  ABGESCHLOSSEN: "Abgeschlossen",
};

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

function getFindingTypeStyle(type: string) {
  switch (type) {
    case "ABWEICHUNG_SCHWER": return styles.badgeSchwer;
    case "ABWEICHUNG_LEICHT": return styles.badgeLeicht;
    case "VERBESSERUNG": return styles.badgeVerbesserung;
    case "POSITIV": return styles.badgePositiv;
    default: return {};
  }
}

// Cover Page
function CoverPage({ data }: { data: AuditReportData }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverHeader}>
        <Text style={styles.coverTitle}>Interner Auditbericht</Text>
        <Text style={styles.coverSubtitle}>
          {data.auditNumber || "Ohne Nummer"}
        </Text>
        <View style={styles.coverDivider} />

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Betrieb</Text>
          <Text style={styles.coverInfoValue}>{data.company.name}</Text>
        </View>

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Audit-Typ</Text>
          <Text style={styles.coverInfoValue}>{auditTypeLabels[data.auditType] || data.auditType}</Text>
        </View>

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Titel</Text>
          <Text style={styles.coverInfoValue}>{data.title}</Text>
        </View>

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Auditor</Text>
          <Text style={styles.coverInfoValue}>{formatUserName(data.auditor)}</Text>
        </View>

        {data.actualDate && (
          <View style={styles.coverInfoBlock}>
            <Text style={styles.coverInfoLabel}>Durchführungsdatum</Text>
            <Text style={styles.coverInfoValue}>{formatDate(data.actualDate)}</Text>
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
function PageHeader({ data }: { data: AuditReportData }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerText}>{data.company.name}</Text>
      <Text style={styles.headerText}>{auditTypeLabels[data.auditType] || data.auditType}</Text>
      <Text style={styles.headerText}>{data.auditNumber || ""}</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>AcoManage — Interner Auditbericht</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
    </View>
  );
}

// Basisdaten Section
function BasisdatenSection({ data }: { data: AuditReportData }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Basisdaten</Text>
      <View style={{ marginBottom: 12 }}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Betrieb:</Text>
          <Text style={styles.infoValue}>{data.company.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Audit-Typ:</Text>
          <Text style={styles.infoValue}>{auditTypeLabels[data.auditType] || data.auditType}</Text>
        </View>
        {data.isoClause && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ISO-Klausel:</Text>
            <Text style={styles.infoValue}>{data.isoClause}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Geplantes Datum:</Text>
          <Text style={styles.infoValue}>{formatDate(data.plannedDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Durchführungsdatum:</Text>
          <Text style={styles.infoValue}>{formatDate(data.actualDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Auditor:</Text>
          <Text style={styles.infoValue}>{formatUserName(data.auditor)}</Text>
        </View>
        {data.auditees && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Auditierte Bereiche:</Text>
            <Text style={styles.infoValue}>{data.auditees}</Text>
          </View>
        )}
        {data.scope && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Geltungsbereich:</Text>
            <Text style={styles.infoValue}>{data.scope}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={styles.infoValue}>{statusLabels[data.status] || data.status}</Text>
        </View>
      </View>
    </View>
  );
}

// Zusammenfassung Section
function ZusammenfassungSection({ data }: { data: AuditReportData }) {
  if (!data.summary && !data.positiveFindings) return null;

  return (
    <View>
      <Text style={styles.sectionTitle}>Zusammenfassung</Text>
      {data.summary && (
        <View style={styles.notesBlock}>
          <Text style={[styles.subsectionTitle, { marginTop: 0 }]}>Zusammenfassung</Text>
          <Text style={styles.notesText}>{data.summary}</Text>
        </View>
      )}
      {data.positiveFindings && (
        <View style={styles.notesBlock}>
          <Text style={[styles.subsectionTitle, { marginTop: 0 }]}>Positive Feststellungen</Text>
          <Text style={styles.notesText}>{data.positiveFindings}</Text>
        </View>
      )}
    </View>
  );
}

// Findings Table Section
function FindingsSection({ findings }: { findings: FindingData[] }) {
  if (findings.length === 0) {
    return (
      <View>
        <Text style={styles.sectionTitle}>Feststellungen</Text>
        <Text style={{ fontSize: 9, color: "#666", fontStyle: "italic" }}>
          Keine Feststellungen bei diesem Audit erfasst.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Feststellungen</Text>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <View style={styles.colNr}>
          <Text style={styles.tableHeaderText}>Nr.</Text>
        </View>
        <View style={styles.colType}>
          <Text style={styles.tableHeaderText}>Typ</Text>
        </View>
        <View style={styles.colClause}>
          <Text style={styles.tableHeaderText}>ISO-Klausel</Text>
        </View>
        <View style={styles.colDesc}>
          <Text style={styles.tableHeaderText}>Beschreibung</Text>
        </View>
        <View style={styles.colEvidence}>
          <Text style={styles.tableHeaderText}>Nachweis</Text>
        </View>
        <View style={styles.colAction}>
          <Text style={styles.tableHeaderText}>Maßnahme</Text>
        </View>
      </View>

      {/* Table Rows */}
      {findings.map((finding, idx) => (
        <View key={finding.id} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt} wrap={false}>
          <View style={styles.colNr}>
            <Text style={styles.tableCellText}>{finding.findingNumber}</Text>
          </View>
          <View style={styles.colType}>
            <Text style={[styles.tableCellText, getFindingTypeStyle(finding.findingType)]}>
              {findingTypeLabels[finding.findingType] || finding.findingType}
            </Text>
          </View>
          <View style={styles.colClause}>
            <Text style={styles.tableCellText}>{finding.isoClause || "—"}</Text>
          </View>
          <View style={styles.colDesc}>
            <Text style={styles.tableCellText}>{finding.description}</Text>
          </View>
          <View style={styles.colEvidence}>
            <Text style={styles.tableCellText}>{finding.evidence || "—"}</Text>
          </View>
          <View style={styles.colAction}>
            <Text style={styles.tableCellText}>
              {finding.action ? (finding.action.actionNumber || "Verknüpft") : "—"}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// Footer info section
function FooterInfoSection({ data }: { data: AuditReportData }) {
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
function AuditReportDocument({ data }: { data: AuditReportData }) {
  return (
    <Document
      title={`Auditbericht ${data.auditNumber || ""} - ${data.company.name}`}
      author="AcoManage"
      subject="Interner Auditbericht"
    >
      <CoverPage data={data} />

      <Page size="A4" style={styles.page}>
        <PageHeader data={data} />
        <PageFooter />
        <BasisdatenSection data={data} />
        <ZusammenfassungSection data={data} />
        <FindingsSection findings={data.findings} />
        <FooterInfoSection data={data} />
      </Page>
    </Document>
  );
}

export async function renderAuditReport(data: AuditReportData): Promise<Buffer> {
  const buffer = await renderToBuffer(<AuditReportDocument data={data} />);
  return Buffer.from(buffer);
}
