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
  // Title area
  titleBlock: { marginBottom: 20 },
  mainTitle: { fontSize: 22, fontWeight: "bold", color: "#1a1a1a", marginBottom: 4 },
  companyName: { fontSize: 13, color: "#374151", marginBottom: 4 },
  trainingTitle: { fontSize: 14, fontWeight: "bold", color: "#2563eb", marginBottom: 2 },
  trainingType: { fontSize: 10, color: "#666", marginBottom: 2 },
  legalBasis: { fontSize: 9, color: "#666", fontStyle: "italic" },
  divider: { height: 2, backgroundColor: "#2563eb", marginVertical: 12, width: 60 },
  // Info rows
  sectionTitle: { fontSize: 13, fontWeight: "bold", marginBottom: 10, marginTop: 16, color: "#1a1a1a" },
  infoGrid: { marginBottom: 16 },
  infoRow: { flexDirection: "row", marginBottom: 5 },
  infoLabel: { width: 160, fontSize: 9, color: "#666" },
  infoValue: { flex: 1, fontSize: 9, fontWeight: "bold" },
  // Content block
  contentBlock: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 10, marginBottom: 16 },
  contentText: { fontSize: 9, lineHeight: 1.6, color: "#374151" },
  // Participant table
  participantTable: { marginBottom: 16 },
  tableHeader: {
    flexDirection: "row", backgroundColor: "#f3f4f6",
    borderWidth: 1, borderColor: "#d1d5db",
    paddingVertical: 6, paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 5, paddingHorizontal: 4, minHeight: 24,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 5, paddingHorizontal: 4, minHeight: 24,
    backgroundColor: "#fafafa",
  },
  colNr: { width: 28, alignItems: "center", justifyContent: "center" },
  colName: { flex: 1, justifyContent: "center", paddingHorizontal: 4 },
  colDepartment: { width: 100, justifyContent: "center", paddingHorizontal: 4 },
  colAttended: { width: 70, alignItems: "center", justifyContent: "center" },
  colSignature: { width: 110, justifyContent: "center", paddingHorizontal: 4 },
  headerCellText: { fontSize: 7, fontWeight: "bold", color: "#374151", textAlign: "center" },
  headerCellTextLeft: { fontSize: 7, fontWeight: "bold", color: "#374151", textAlign: "left" },
  cellText: { fontSize: 8 },
  cellTextCenter: { fontSize: 8, textAlign: "center" },
  // Structured sections
  sectionItem: { marginBottom: 12 },
  sectionItemTitle: { fontSize: 10, fontWeight: "bold", color: "#2563eb", marginBottom: 4 },
  sectionItemContent: { fontSize: 9, lineHeight: 1.6, color: "#374151" },
  // Notes
  notesBlock: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 10, marginBottom: 16 },
  notesText: { fontSize: 9, lineHeight: 1.5, color: "#374151" },
  // Signature area
  signatureBlock: { marginTop: 40, flexDirection: "row", justifyContent: "space-between" },
  signatureLine: { width: 200 },
  signatureRule: { borderBottomWidth: 1, borderBottomColor: "#1a1a1a", marginBottom: 4, height: 40 },
  signatureLabel: { fontSize: 8, color: "#666" },
  signatureSubLabel: { fontSize: 8, color: "#666", marginTop: 2 },
  // Created with
  createdWith: { fontSize: 7, color: "#aaa", textAlign: "center", marginTop: 24 },
});

// Types
interface TrainingReportSection {
  title: string;
  content: string;
  order: number;
}

interface TrainingReportData {
  title: string;
  trainingType: string;
  legalBasis: string | null;
  description: string | null;
  content: string | null;
  sections: TrainingReportSection[] | null;
  instructor: string | null;
  location: string | null;
  trainingDate: string | null;
  startTime: string | null;
  duration: number | null;
  status: string;
  notes: string | null;
  company: { name: string };
  createdBy: { firstName: string; lastName: string } | null;
  participants: Array<{
    participantName: string;
    department: string | null;
    attended: boolean;
    signedAt: string | null;
    notes: string | null;
  }>;
}

const typeLabels: Record<string, string> = {
  ERSTUNTERWEISUNG: "Erstunterweisung",
  UNTERWEISUNG: "Unterweisung",
  FORTBILDUNG: "Fortbildung",
  ZERTIFIKAT: "Zertifikat",
  ERSTE_HILFE: "Erste Hilfe",
  BRANDSCHUTZ: "Brandschutz",
  GEFAHRSTOFF: "Gefahrstoff-Unterweisung",
  PSA: "PSA-Unterweisung",
  MASCHINE: "Maschinen-Unterweisung",
  ELEKTRO: "Elektro-Unterweisung",
  HOEHENARBEIT: "Höhenarbeit",
  STAPLERFAHRER: "Staplerfahrer-Unterweisung",
  BILDSCHIRMARBEIT: "Bildschirmarbeitsplatz",
  SONSTIG: "Sonstige Schulung",
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

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours} Std.`;
  return `${hours} Std. ${remaining} Min.`;
}

// Header
function PageHeader({ data }: { data: TrainingReportData }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerText}>{data.company.name}</Text>
      <Text style={styles.headerText}>Unterweisungsnachweis</Text>
      <Text style={styles.headerText}>{formatDate(data.trainingDate)}</Text>
    </View>
  );
}

// Footer
function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>AcoManage — Unterweisungsnachweis</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
    </View>
  );
}

// Title Section
function TitleSection({ data }: { data: TrainingReportData }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.mainTitle}>Unterweisungsnachweis</Text>
      <Text style={styles.companyName}>{data.company.name}</Text>
      <View style={styles.divider} />
      <Text style={styles.trainingTitle}>{data.title}</Text>
      <Text style={styles.trainingType}>{typeLabels[data.trainingType] || data.trainingType}</Text>
      {data.legalBasis && (
        <Text style={styles.legalBasis}>Rechtsgrundlage: {data.legalBasis}</Text>
      )}
    </View>
  );
}

// Details Section
function DetailsSection({ data }: { data: TrainingReportData }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Schulungsdetails</Text>
      <View style={styles.infoGrid}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Datum:</Text>
          <Text style={styles.infoValue}>{formatDate(data.trainingDate)}</Text>
        </View>
        {data.startTime && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Uhrzeit:</Text>
            <Text style={styles.infoValue}>{data.startTime} Uhr</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dauer:</Text>
          <Text style={styles.infoValue}>{formatDuration(data.duration)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dozent / Unterweisender:</Text>
          <Text style={styles.infoValue}>{data.instructor || "—"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ort:</Text>
          <Text style={styles.infoValue}>{data.location || "—"}</Text>
        </View>
        {data.legalBasis && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rechtsgrundlage:</Text>
            <Text style={styles.infoValue}>{data.legalBasis}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Content Section
function ContentSection({ data }: { data: TrainingReportData }) {
  const sections = data.sections as TrainingReportSection[] | null;

  if (sections && sections.length > 0) {
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    return (
      <View>
        <Text style={styles.sectionTitle}>Inhalt / Themen</Text>
        {sorted.map((section, idx) => (
          <View key={idx} style={styles.sectionItem}>
            <Text style={styles.sectionItemTitle}>
              {section.order}. {section.title}
            </Text>
            {section.content.split("\n").filter((l) => l.trim()).map((line, li) => (
              <Text key={li} style={styles.sectionItemContent}>{line.trim()}</Text>
            ))}
          </View>
        ))}
      </View>
    );
  }

  if (!data.content) return null;

  const lines = data.content.split("\n").filter((line) => line.trim().length > 0);

  return (
    <View>
      <Text style={styles.sectionTitle}>Inhalt / Themen</Text>
      <View style={styles.contentBlock}>
        {lines.map((line, idx) => (
          <Text key={idx} style={styles.contentText}>{line.trim()}</Text>
        ))}
      </View>
    </View>
  );
}

// Participant Table
function ParticipantTable({ data }: { data: TrainingReportData }) {
  const participants = data.participants;

  return (
    <View>
      <Text style={styles.sectionTitle}>
        Teilnehmerliste
        <Text style={{ fontSize: 9, fontWeight: "normal", color: "#666" }}>
          {" "}({participants.length} {participants.length === 1 ? "Teilnehmer" : "Teilnehmer"})
        </Text>
      </Text>

      <View style={styles.participantTable}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <View style={styles.colNr}>
            <Text style={styles.headerCellText}>Nr.</Text>
          </View>
          <View style={styles.colName}>
            <Text style={styles.headerCellTextLeft}>Name</Text>
          </View>
          <View style={styles.colDepartment}>
            <Text style={styles.headerCellTextLeft}>Abteilung</Text>
          </View>
          <View style={styles.colAttended}>
            <Text style={styles.headerCellText}>Teilgenommen</Text>
          </View>
          <View style={styles.colSignature}>
            <Text style={styles.headerCellTextLeft}>Unterschrift</Text>
          </View>
        </View>

        {/* Table Rows */}
        {participants.map((participant, idx) => {
          const rowStyle = idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt;

          return (
            <View key={idx} style={rowStyle}>
              <View style={styles.colNr}>
                <Text style={styles.cellTextCenter}>{idx + 1}</Text>
              </View>
              <View style={styles.colName}>
                <Text style={styles.cellText}>{participant.participantName}</Text>
              </View>
              <View style={styles.colDepartment}>
                <Text style={styles.cellText}>{participant.department || "—"}</Text>
              </View>
              <View style={styles.colAttended}>
                <Text style={styles.cellTextCenter}>
                  {participant.attended ? "\u2713" : "\u2014"}
                </Text>
              </View>
              <View style={styles.colSignature}>
                <Text style={styles.cellText}>
                  {participant.signedAt ? formatDate(participant.signedAt) : "______________________"}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Notes Section
function NotesSection({ data }: { data: TrainingReportData }) {
  if (!data.notes) return null;

  return (
    <View>
      <Text style={styles.sectionTitle}>Anmerkungen</Text>
      <View style={styles.notesBlock}>
        <Text style={styles.notesText}>{data.notes}</Text>
      </View>
    </View>
  );
}

// Signature Section
function SignatureSection({ data }: { data: TrainingReportData }) {
  return (
    <View wrap={false}>
      <View style={{ marginTop: 8 }}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Datum:</Text>
          <Text style={styles.infoValue}>
            {formatDate(data.trainingDate) !== "\u2014"
              ? formatDate(data.trainingDate)
              : new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
            }
          </Text>
        </View>
      </View>

      <View style={styles.signatureBlock}>
        <View style={styles.signatureLine}>
          <View style={styles.signatureRule} />
          <Text style={styles.signatureLabel}>Dozent / Unterweisender</Text>
          {data.instructor && (
            <Text style={styles.signatureSubLabel}>{data.instructor}</Text>
          )}
        </View>
        <View style={styles.signatureLine}>
          <View style={styles.signatureRule} />
          <Text style={styles.signatureLabel}>Sicherheitsfachkraft</Text>
          {data.createdBy && (
            <Text style={styles.signatureSubLabel}>
              {data.createdBy.firstName} {data.createdBy.lastName}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.createdWith}>Erstellt mit AcoManage</Text>
    </View>
  );
}

// Main Document
function TrainingReport({ data }: { data: TrainingReportData }) {
  return (
    <Document
      title={`Unterweisungsnachweis - ${data.title} - ${data.company.name}`}
      author="AcoManage"
      subject="Unterweisungsnachweis / Teilnehmerliste"
    >
      <Page size="A4" style={styles.page}>
        <PageHeader data={data} />
        <PageFooter />
        <TitleSection data={data} />
        <DetailsSection data={data} />
        <ContentSection data={data} />
        <ParticipantTable data={data} />
        <NotesSection data={data} />
        <SignatureSection data={data} />
      </Page>
    </Document>
  );
}

export async function renderTrainingReport(data: TrainingReportData): Promise<Buffer> {
  const buffer = await renderToBuffer(<TrainingReport data={data} />);
  return Buffer.from(buffer);
}
