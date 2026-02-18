import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import path from "path";
import fs from "fs";

// Register a basic font (system default will work, but we ensure consistency)
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
  // Cover page
  coverPage: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingHorizontal: 40,
    paddingVertical: 60,
    color: "#1a1a1a",
    justifyContent: "space-between",
  },
  coverHeader: {
    marginTop: 80,
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
  },
  coverInfoBlock: {
    marginBottom: 12,
  },
  coverInfoLabel: {
    fontSize: 10,
    color: "#888",
    marginBottom: 2,
  },
  coverInfoValue: {
    fontSize: 13,
    fontWeight: "bold",
  },
  coverDivider: {
    height: 3,
    backgroundColor: "#2563eb",
    marginVertical: 20,
    width: 80,
  },
  coverFooter: {
    marginBottom: 40,
  },
  coverFooterText: {
    fontSize: 8,
    color: "#999",
  },
  // Header/Footer
  header: {
    position: "absolute",
    top: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
  },
  headerLeft: {
    fontSize: 7,
    color: "#888",
  },
  headerRight: {
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
  pageNumber: {
    fontSize: 7,
    color: "#888",
  },
  // Section headers
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 8,
    color: "#1a1a1a",
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
    marginTop: 10,
    color: "#374151",
  },
  // Summary cards
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 10,
  },
  summaryCardLabel: {
    fontSize: 8,
    color: "#888",
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  // Table
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
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#374151",
  },
  tableCell: {
    fontSize: 8,
    color: "#374151",
  },
  // Column widths for findings table
  colNr: { width: "6%" },
  colBereich: { width: "14%" },
  colBeschreibung: { width: "24%" },
  colRisiko: { width: "8%" },
  colMassnahme: { width: "22%" },
  colVerantwortlich: { width: "12%" },
  colFrist: { width: "10%" },
  colStatus: { width: "8%" },
  // Risk level badges
  riskBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  riskNiedrig: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  riskMittel: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
  },
  riskHoch: {
    backgroundColor: "#fed7aa",
    color: "#9a3412",
  },
  riskKritisch: {
    backgroundColor: "#fecaca",
    color: "#991b1b",
  },
  // Status
  statusOpen: { color: "#dc2626" },
  statusInProgress: { color: "#2563eb" },
  statusCompleted: { color: "#16a34a" },
  // Photos
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  photoContainer: {
    width: "48%",
    marginBottom: 8,
  },
  photoImage: {
    width: "100%",
    height: 150,
    objectFit: "cover",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  photoCaption: {
    fontSize: 7,
    color: "#666",
    marginTop: 2,
  },
  // Checklist
  checkItem: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 8,
  },
  checkIcon: {
    width: 14,
    fontSize: 9,
    marginRight: 4,
  },
  checkOk: { color: "#16a34a" },
  checkFinding: { color: "#dc2626" },
  checkNa: { color: "#9ca3af" },
  checkLabel: {
    fontSize: 8,
    flex: 1,
  },
  // Info section
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
  // Signature
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
  // Notes
  notesBlock: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 9,
    lineHeight: 1.5,
    color: "#374151",
  },
});

// Type definitions
interface FindingData {
  id: string;
  findingNumber: number;
  description: string;
  riskLevel: string | null;
  measure: string | null;
  responsible: string | null;
  deadline: string | null;
  status: string;
  section?: { title: string; sectionCode: string } | null;
  templateItem?: { label: string; itemKey: string } | null;
  photos: PhotoData[];
}

interface PhotoData {
  id: string;
  filePath: string;
  fileName: string | null;
  caption: string | null;
}

interface TemplateSection {
  id: string;
  sectionCode: string;
  title: string;
  sortOrder: number;
  items: TemplateItem[];
}

interface TemplateItem {
  id: string;
  itemKey: string;
  label: string;
  legalReference: string | null;
  sortOrder: number;
}

interface InspectionData {
  id: string;
  inspectionNumber: string | null;
  inspectionDate: string;
  inspectionType: string;
  attendees: string | null;
  generalNotes: string | null;
  status: string;
  completedAt: string | null;
  company: { name: string; city: string | null };
  inspector: { firstName: string | null; lastName: string | null };
  template?: {
    name: string;
    sections: TemplateSection[];
  } | null;
  findings: FindingData[];
  photos: PhotoData[];
}

const typeLabels: Record<string, string> = {
  INITIAL: "Erstbegehung",
  REGULAR: "Regelbegehung",
  FOLLOWUP: "Nachkontrolle",
  SPECIAL: "Sonderbegehung",
};

const riskLabels: Record<string, string> = {
  NIEDRIG: "Niedrig",
  MITTEL: "Mittel",
  HOCH: "Hoch",
  KRITISCH: "Kritisch",
};

const statusLabels: Record<string, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Bearbeitung",
  COMPLETED: "Erledigt",
  OVERDUE: "Überfällig",
};

function formatDate(dateStr: string): string {
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

function getRiskStyle(level: string | null) {
  switch (level) {
    case "NIEDRIG":
      return styles.riskNiedrig;
    case "MITTEL":
      return styles.riskMittel;
    case "HOCH":
      return styles.riskHoch;
    case "KRITISCH":
      return styles.riskKritisch;
    default:
      return {};
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "OPEN":
    case "OVERDUE":
      return styles.statusOpen;
    case "IN_PROGRESS":
      return styles.statusInProgress;
    case "COMPLETED":
      return styles.statusCompleted;
    default:
      return {};
  }
}

function resolvePhotoPath(filePath: string): string | null {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    return fullPath;
  }
  return null;
}

// Cover Page Component
function CoverPage({ data }: { data: InspectionData }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverHeader}>
        <Text style={styles.coverTitle}>Begehungsbericht</Text>
        <Text style={styles.coverSubtitle}>
          {typeLabels[data.inspectionType] || data.inspectionType}
        </Text>
        <View style={styles.coverDivider} />

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Betrieb</Text>
          <Text style={styles.coverInfoValue}>
            {data.company.name}
            {data.company.city ? ` — ${data.company.city}` : ""}
          </Text>
        </View>

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Begehungsnummer</Text>
          <Text style={styles.coverInfoValue}>
            {data.inspectionNumber || "—"}
          </Text>
        </View>

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Datum</Text>
          <Text style={styles.coverInfoValue}>
            {formatDate(data.inspectionDate)}
          </Text>
        </View>

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Begehende Fachkraft</Text>
          <Text style={styles.coverInfoValue}>
            {data.inspector.firstName} {data.inspector.lastName}
          </Text>
        </View>

        {data.attendees && (
          <View style={styles.coverInfoBlock}>
            <Text style={styles.coverInfoLabel}>Teilnehmer</Text>
            <Text style={styles.coverInfoValue}>{data.attendees}</Text>
          </View>
        )}
      </View>

      <View style={styles.coverFooter}>
        <Text style={styles.coverFooterText}>
          Erstellt am{" "}
          {new Date().toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}{" "}
          — AcoManage
        </Text>
      </View>
    </Page>
  );
}

// Header/Footer wrapper
function PageHeader({
  inspection,
}: {
  inspection: InspectionData;
}) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerLeft}>
        {inspection.company.name} — {inspection.inspectionNumber}
      </Text>
      <Text style={styles.headerRight}>
        {formatDate(inspection.inspectionDate)}
      </Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>AcoManage — Begehungsbericht</Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `Seite ${pageNumber} von ${totalPages}`
        }
      />
    </View>
  );
}

// Summary Section
function SummarySection({ data }: { data: InspectionData }) {
  const totalFindings = data.findings.length;
  const kritisch = data.findings.filter(
    (f) => f.riskLevel === "KRITISCH"
  ).length;
  const hoch = data.findings.filter((f) => f.riskLevel === "HOCH").length;
  const offen = data.findings.filter(
    (f) => f.status === "OPEN" || f.status === "OVERDUE"
  ).length;

  return (
    <View>
      <Text style={styles.sectionTitle}>Zusammenfassung</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Befunde gesamt</Text>
          <Text style={styles.summaryCardValue}>{totalFindings}</Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            kritisch > 0
              ? { borderColor: "#dc2626" }
              : {},
          ]}
        >
          <Text style={styles.summaryCardLabel}>Kritisch</Text>
          <Text style={[styles.summaryCardValue, { color: "#dc2626" }]}>
            {kritisch}
          </Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            hoch > 0 ? { borderColor: "#ea580c" } : {},
          ]}
        >
          <Text style={styles.summaryCardLabel}>Hoch</Text>
          <Text style={[styles.summaryCardValue, { color: "#ea580c" }]}>
            {hoch}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Offen</Text>
          <Text style={[styles.summaryCardValue, { color: "#2563eb" }]}>
            {offen}
          </Text>
        </View>
      </View>

      {/* General info */}
      <View style={{ marginBottom: 12 }}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Begehungsart:</Text>
          <Text style={styles.infoValue}>
            {typeLabels[data.inspectionType]}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Datum:</Text>
          <Text style={styles.infoValue}>
            {formatDate(data.inspectionDate)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Begehende Fachkraft:</Text>
          <Text style={styles.infoValue}>
            {data.inspector.firstName} {data.inspector.lastName}
          </Text>
        </View>
        {data.attendees && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Teilnehmer:</Text>
            <Text style={styles.infoValue}>{data.attendees}</Text>
          </View>
        )}
      </View>

      {data.generalNotes && (
        <View style={styles.notesBlock}>
          <Text style={[styles.subsectionTitle, { marginTop: 0 }]}>
            Allgemeine Anmerkungen
          </Text>
          <Text style={styles.notesText}>{data.generalNotes}</Text>
        </View>
      )}
    </View>
  );
}

// Findings Table
function FindingsTable({ findings }: { findings: FindingData[] }) {
  if (findings.length === 0) {
    return (
      <View>
        <Text style={styles.sectionTitle}>Befunde</Text>
        <Text style={{ fontSize: 9, color: "#666", fontStyle: "italic" }}>
          Keine Befunde bei dieser Begehung festgestellt.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Befundübersicht</Text>

      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colNr]}>Nr.</Text>
          <Text style={[styles.tableHeaderCell, styles.colBereich]}>
            Bereich
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colBeschreibung]}>
            Sachverhalt
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colRisiko]}>
            Risiko
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colMassnahme]}>
            Maßnahme
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colVerantwortlich]}>
            Verantw.
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colFrist]}>Frist</Text>
          <Text style={[styles.tableHeaderCell, styles.colStatus]}>
            Status
          </Text>
        </View>

        {/* Table Rows */}
        {findings.map((finding, idx) => (
          <View
            key={finding.id}
            style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            wrap={false}
          >
            <Text style={[styles.tableCell, styles.colNr]}>
              {finding.findingNumber}
            </Text>
            <Text style={[styles.tableCell, styles.colBereich]}>
              {finding.section?.title || "—"}
            </Text>
            <Text style={[styles.tableCell, styles.colBeschreibung]}>
              {finding.description}
            </Text>
            <View style={styles.colRisiko}>
              {finding.riskLevel ? (
                <View style={[styles.riskBadge, getRiskStyle(finding.riskLevel)]}>
                  <Text style={[{ fontSize: 7 }, getRiskStyle(finding.riskLevel)]}>
                    {riskLabels[finding.riskLevel] || finding.riskLevel}
                  </Text>
                </View>
              ) : (
                <Text style={styles.tableCell}>—</Text>
              )}
            </View>
            <Text style={[styles.tableCell, styles.colMassnahme]}>
              {finding.measure || "—"}
            </Text>
            <Text style={[styles.tableCell, styles.colVerantwortlich]}>
              {finding.responsible || "—"}
            </Text>
            <Text style={[styles.tableCell, styles.colFrist]}>
              {finding.deadline ? formatDate(finding.deadline) : "—"}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.colStatus,
                getStatusStyle(finding.status),
              ]}
            >
              {statusLabels[finding.status] || finding.status}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Detailed Findings with Photos
function FindingsDetail({ findings }: { findings: FindingData[] }) {
  const findingsWithPhotos = findings.filter((f) => f.photos.length > 0);
  if (findingsWithPhotos.length === 0) return null;

  return (
    <View break>
      <Text style={styles.sectionTitle}>Befunde — Detailansicht mit Fotos</Text>

      {findingsWithPhotos.map((finding) => (
        <View key={finding.id} wrap={false} style={{ marginBottom: 16 }}>
          <Text style={styles.subsectionTitle}>
            Befund {finding.findingNumber}:{" "}
            {finding.section?.title || "Allgemein"}
          </Text>
          <Text style={{ fontSize: 9, marginBottom: 4 }}>
            {finding.description}
          </Text>
          {finding.riskLevel && (
            <Text style={{ fontSize: 8, color: "#666", marginBottom: 4 }}>
              Risiko: {riskLabels[finding.riskLevel]}
              {finding.measure ? ` | Maßnahme: ${finding.measure}` : ""}
            </Text>
          )}

          <View style={styles.photoGrid}>
            {finding.photos.map((photo) => {
              const resolvedPath = resolvePhotoPath(photo.filePath);
              if (!resolvedPath) return null;
              return (
                <View key={photo.id} style={styles.photoContainer}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={resolvedPath} style={styles.photoImage} />
                  {photo.caption && (
                    <Text style={styles.photoCaption}>{photo.caption}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

// Checklist Section
function ChecklistSection({
  data,
}: {
  data: InspectionData;
}) {
  if (!data.template?.sections?.length) return null;

  // Build a set of template item IDs that have findings
  const itemsWithFindings = new Set(
    data.findings
      .filter((f) => f.templateItem)
      .map((f) => f.templateItem?.itemKey)
  );

  return (
    <View break>
      <Text style={styles.sectionTitle}>Checkliste</Text>

      {data.template.sections.map((section) => (
        <View key={section.id} style={{ marginBottom: 10 }}>
          <Text style={styles.subsectionTitle}>
            {section.sectionCode}. {section.title}
          </Text>
          {section.items.map((item) => {
            const hasFinding = itemsWithFindings.has(item.itemKey);
            return (
              <View key={item.id} style={styles.checkItem}>
                <Text
                  style={[
                    styles.checkIcon,
                    hasFinding ? styles.checkFinding : styles.checkOk,
                  ]}
                >
                  {hasFinding ? "✗" : "✓"}
                </Text>
                <Text style={styles.checkLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// Signature Section
function SignatureSection() {
  return (
    <View style={styles.signatureBlock} wrap={false}>
      <View style={styles.signatureLine}>
        <View style={styles.signatureRule} />
        <Text style={styles.signatureLabel}>
          Ort, Datum / Fachkraft für Arbeitssicherheit
        </Text>
      </View>
      <View style={styles.signatureLine}>
        <View style={styles.signatureRule} />
        <Text style={styles.signatureLabel}>
          Ort, Datum / Arbeitgeber/Vertreter
        </Text>
      </View>
    </View>
  );
}

// Main Document
function InspectionReportDocument({
  data,
}: {
  data: InspectionData;
}) {
  return (
    <Document
      title={`Begehungsbericht ${data.inspectionNumber || ""} - ${data.company.name}`}
      author="AcoManage"
      subject="Begehungsbericht"
    >
      {/* Cover Page */}
      <CoverPage data={data} />

      {/* Content Pages */}
      <Page size="A4" style={styles.page}>
        <PageHeader inspection={data} />
        <PageFooter />

        <SummarySection data={data} />
        <FindingsTable findings={data.findings} />
      </Page>

      {/* Checklist Page */}
      {data.template?.sections?.length ? (
        <Page size="A4" style={styles.page}>
          <PageHeader inspection={data} />
          <PageFooter />
          <ChecklistSection data={data} />
        </Page>
      ) : null}

      {/* Detailed Findings with Photos */}
      {data.findings.some((f) => f.photos.length > 0) && (
        <Page size="A4" style={styles.page}>
          <PageHeader inspection={data} />
          <PageFooter />
          <FindingsDetail findings={data.findings} />
        </Page>
      )}

      {/* Signature Page */}
      <Page size="A4" style={styles.page}>
        <PageHeader inspection={data} />
        <PageFooter />
        <SignatureSection />
      </Page>
    </Document>
  );
}

// Render to buffer - exported for API route usage
export async function renderInspectionReport(data: InspectionData): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <InspectionReportDocument data={data} />
  );
  return Buffer.from(buffer);
}
