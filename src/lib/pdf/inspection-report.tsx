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
  // Section titles
  sectionTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 12, marginTop: 8, color: "#1a1a1a" },
  subsectionTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 6, marginTop: 10, color: "#374151" },
  // Summary cards
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 10 },
  summaryCardLabel: { fontSize: 8, color: "#888", marginBottom: 4 },
  summaryCardValue: { fontSize: 18, fontWeight: "bold" },
  // Info
  infoRow: { flexDirection: "row", marginBottom: 4 },
  infoLabel: { width: 140, fontSize: 9, color: "#666" },
  infoValue: { flex: 1, fontSize: 9, fontWeight: "bold" },
  // Finding block styles
  findingBlock: { marginBottom: 14, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 4 },
  findingHeaderRow: {
    flexDirection: "row", backgroundColor: "#f3f4f6",
    borderBottomWidth: 1, borderBottomColor: "#d1d5db",
    paddingVertical: 6, paddingHorizontal: 8, alignItems: "center",
  },
  findingNr: { fontSize: 10, fontWeight: "bold", width: 30 },
  findingDescription: { fontSize: 9, flex: 1, paddingRight: 8 },
  findingDetailRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
    paddingVertical: 5, paddingHorizontal: 8,
  },
  findingDetailLabel: { fontSize: 8, color: "#666", width: 80 },
  findingDetailValue: { fontSize: 8, flex: 1 },
  findingPhotoRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    paddingVertical: 6, paddingHorizontal: 8,
  },
  findingPhoto: { width: 60, height: 60, objectFit: "cover", borderRadius: 2, borderWidth: 1, borderColor: "#e5e7eb" },
  // Risk badges
  riskBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, alignSelf: "flex-start" },
  riskNiedrig: { backgroundColor: "#dcfce7", color: "#166534" },
  riskMittel: { backgroundColor: "#fef9c3", color: "#854d0e" },
  riskHoch: { backgroundColor: "#fed7aa", color: "#9a3412" },
  riskKritisch: { backgroundColor: "#fecaca", color: "#991b1b" },
  // Status
  statusOpen: { color: "#dc2626" },
  statusInProgress: { color: "#2563eb" },
  statusCompleted: { color: "#16a34a" },
  // Checklist
  checklistTable: { marginBottom: 12 },
  checklistHeader: {
    flexDirection: "row", backgroundColor: "#f3f4f6",
    borderWidth: 1, borderColor: "#d1d5db",
    paddingVertical: 5, paddingHorizontal: 4,
  },
  checklistRow: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 4, paddingHorizontal: 4, minHeight: 22,
  },
  checklistRowAlt: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 4, paddingHorizontal: 4, minHeight: 22,
    backgroundColor: "#fafafa",
  },
  checkColNr: { width: 24, alignItems: "center", justifyContent: "center" },
  checkColItem: { flex: 1, justifyContent: "center", paddingHorizontal: 4 },
  checkColIO: { width: 30, alignItems: "center", justifyContent: "center" },
  checkColMangel: { width: 30, alignItems: "center", justifyContent: "center" },
  checkColBemerkung: { width: 120, justifyContent: "center", paddingHorizontal: 4 },
  checkText: { fontSize: 8 },
  checkHeaderText: { fontSize: 7, fontWeight: "bold", color: "#374151", textAlign: "center" },
  // Checkbox styles
  checkbox: {
    width: 10, height: 10,
    borderWidth: 1, borderColor: "#374151", borderRadius: 1,
    alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: {
    width: 10, height: 10,
    borderWidth: 1, borderColor: "#374151", borderRadius: 1,
    backgroundColor: "#374151",
    alignItems: "center", justifyContent: "center",
  },
  checkboxX: { fontSize: 7, fontWeight: "bold", color: "#ffffff" },
  // Notes
  notesBlock: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 10, marginBottom: 12 },
  notesText: { fontSize: 9, lineHeight: 1.5, color: "#374151" },
  // Disclaimer
  disclaimerBlock: { marginTop: 24, padding: 12, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4 },
  disclaimerText: { fontSize: 8, lineHeight: 1.6, color: "#666", fontStyle: "italic" },
  // Signature
  signatureBlock: { marginTop: 40, flexDirection: "row", justifyContent: "space-between" },
  signatureLine: { width: 200 },
  signatureRule: { borderBottomWidth: 1, borderBottomColor: "#1a1a1a", marginBottom: 4, height: 40 },
  signatureLabel: { fontSize: 8, color: "#666" },
});

// Types
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

interface ItemCheck {
  templateItemId: string;
  status: string;
  lastTestDate: string | null;
  nextTestDate: string | null;
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
  template?: { name: string; sections: TemplateSection[] } | null;
  findings: FindingData[];
  photos: PhotoData[];
  itemChecks?: ItemCheck[];
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
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function getRiskStyle(level: string | null) {
  switch (level) {
    case "NIEDRIG": return styles.riskNiedrig;
    case "MITTEL": return styles.riskMittel;
    case "HOCH": return styles.riskHoch;
    case "KRITISCH": return styles.riskKritisch;
    default: return {};
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "OPEN": case "OVERDUE": return styles.statusOpen;
    case "IN_PROGRESS": return styles.statusInProgress;
    case "COMPLETED": return styles.statusCompleted;
    default: return {};
  }
}

function resolvePhotoPath(filePath: string): string | null {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) return fullPath;
  return null;
}

// Checkbox component
function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={checked ? styles.checkboxChecked : styles.checkbox}>
      {checked && <Text style={styles.checkboxX}>X</Text>}
    </View>
  );
}

// Cover Page
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
            {data.company.name}{data.company.city ? ` — ${data.company.city}` : ""}
          </Text>
        </View>

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Begehungsnummer</Text>
          <Text style={styles.coverInfoValue}>{data.inspectionNumber || "—"}</Text>
        </View>

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Datum</Text>
          <Text style={styles.coverInfoValue}>{formatDate(data.inspectionDate)}</Text>
        </View>

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Durchgeführt von</Text>
          <Text style={styles.coverInfoValue}>
            {data.inspector.firstName} {data.inspector.lastName}
          </Text>
        </View>

        {data.attendees && (
          <View style={styles.coverInfoBlock}>
            <Text style={styles.coverInfoLabel}>Teilnehmende Personen</Text>
            <Text style={styles.coverInfoValue}>{data.attendees}</Text>
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
function PageHeader({ inspection }: { inspection: InspectionData }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerText}>
        {inspection.company.name}{inspection.company.city ? ` — ${inspection.company.city}` : ""}
      </Text>
      <Text style={styles.headerText}>{formatDate(inspection.inspectionDate)}</Text>
      <Text style={styles.headerText}>{inspection.inspectionNumber || ""}</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>AcoManage — Begehungsbericht</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
    </View>
  );
}

// Summary Section
function SummarySection({ data }: { data: InspectionData }) {
  const totalFindings = data.findings.length;
  const kritisch = data.findings.filter((f) => f.riskLevel === "KRITISCH").length;
  const hoch = data.findings.filter((f) => f.riskLevel === "HOCH").length;
  const offen = data.findings.filter((f) => f.status === "OPEN" || f.status === "OVERDUE").length;

  return (
    <View>
      <Text style={styles.sectionTitle}>Zusammenfassung</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Befunde gesamt</Text>
          <Text style={styles.summaryCardValue}>{totalFindings}</Text>
        </View>
        <View style={[styles.summaryCard, kritisch > 0 ? { borderColor: "#dc2626" } : {}]}>
          <Text style={styles.summaryCardLabel}>Kritisch</Text>
          <Text style={[styles.summaryCardValue, { color: "#dc2626" }]}>{kritisch}</Text>
        </View>
        <View style={[styles.summaryCard, hoch > 0 ? { borderColor: "#ea580c" } : {}]}>
          <Text style={styles.summaryCardLabel}>Hoch</Text>
          <Text style={[styles.summaryCardValue, { color: "#ea580c" }]}>{hoch}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Offen</Text>
          <Text style={[styles.summaryCardValue, { color: "#2563eb" }]}>{offen}</Text>
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Begehungsart:</Text>
          <Text style={styles.infoValue}>{typeLabels[data.inspectionType]}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Datum:</Text>
          <Text style={styles.infoValue}>{formatDate(data.inspectionDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Durchgeführt von:</Text>
          <Text style={styles.infoValue}>{data.inspector.firstName} {data.inspector.lastName}</Text>
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
          <Text style={[styles.subsectionTitle, { marginTop: 0 }]}>Allgemeine Anmerkungen</Text>
          <Text style={styles.notesText}>{data.generalNotes}</Text>
        </View>
      )}
    </View>
  );
}

// Finding Block (reference document style)
function FindingBlock({ finding }: { finding: FindingData }) {
  const photos = finding.photos
    .map((p) => ({ ...p, resolved: resolvePhotoPath(p.filePath) }))
    .filter((p) => p.resolved);

  return (
    <View style={styles.findingBlock} wrap={false}>
      {/* Header row: Nr + Description + Risk */}
      <View style={styles.findingHeaderRow}>
        <Text style={styles.findingNr}>{finding.findingNumber}.</Text>
        <Text style={styles.findingDescription}>{finding.description}</Text>
        {finding.riskLevel && (
          <View style={[styles.riskBadge, getRiskStyle(finding.riskLevel)]}>
            <Text style={[{ fontSize: 7, fontWeight: "bold" }, getRiskStyle(finding.riskLevel)]}>
              {riskLabels[finding.riskLevel] || finding.riskLevel}
            </Text>
          </View>
        )}
      </View>

      {/* Section info */}
      {finding.section && (
        <View style={styles.findingDetailRow}>
          <Text style={styles.findingDetailLabel}>Bereich:</Text>
          <Text style={styles.findingDetailValue}>{finding.section.title}</Text>
        </View>
      )}

      {/* Measure */}
      {finding.measure && (
        <View style={styles.findingDetailRow}>
          <Text style={styles.findingDetailLabel}>Maßnahme:</Text>
          <Text style={[styles.findingDetailValue, { fontWeight: "bold" }]}>{finding.measure}</Text>
        </View>
      )}

      {/* Responsible + Deadline row */}
      <View style={styles.findingDetailRow}>
        <Text style={styles.findingDetailLabel}>Verantwortlich:</Text>
        <Text style={[styles.findingDetailValue, { width: 150 }]}>{finding.responsible || "—"}</Text>
        <Text style={[styles.findingDetailLabel, { width: 70 }]}>Umsetzung bis:</Text>
        <Text style={styles.findingDetailValue}>
          {finding.deadline ? formatDate(finding.deadline) : "—"}
        </Text>
      </View>

      {/* Status */}
      <View style={[styles.findingDetailRow, { borderBottomWidth: photos.length > 0 ? 1 : 0 }]}>
        <Text style={styles.findingDetailLabel}>Status:</Text>
        <Text style={[styles.findingDetailValue, getStatusStyle(finding.status)]}>
          {statusLabels[finding.status] || finding.status}
        </Text>
      </View>

      {/* Photos */}
      {photos.length > 0 && (
        <View style={styles.findingPhotoRow}>
          {photos.map((photo) => (
            <View key={photo.id}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={photo.resolved!} style={styles.findingPhoto} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Findings Section (block layout like reference document)
function FindingsSection({ findings }: { findings: FindingData[] }) {
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
      <Text style={styles.sectionTitle}>Befunde</Text>
      {findings.map((finding) => (
        <FindingBlock key={finding.id} finding={finding} />
      ))}
    </View>
  );
}

// Checklist Section with checkboxes — reference document style
function ChecklistSection({ data }: { data: InspectionData }) {
  if (!data.template?.sections?.length) return null;

  const checkMap = new Map<string, ItemCheck>();
  for (const c of data.itemChecks || []) {
    checkMap.set(c.templateItemId, c);
  }

  // Map item to finding numbers
  const findingsByItemId = new Map<string, number[]>();
  for (const finding of data.findings) {
    if (finding.templateItem) {
      for (const section of data.template.sections) {
        for (const item of section.items) {
          if (item.itemKey === finding.templateItem.itemKey) {
            const existing = findingsByItemId.get(item.id) || [];
            existing.push(finding.findingNumber);
            findingsByItemId.set(item.id, existing);
          }
        }
      }
    }
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Checkliste — Prüfergebnis</Text>

      {data.template.sections.map((section) => {
        // Filter out NICHT_RELEVANT items
        const visibleItems = section.items.filter((item) => {
          const check = checkMap.get(item.id);
          return !check || check.status !== "NICHT_RELEVANT";
        });

        if (visibleItems.length === 0) return null;

        const ioCount = visibleItems.filter((i) => checkMap.get(i.id)?.status === "IO").length;
        const mangelCount = visibleItems.filter((i) => checkMap.get(i.id)?.status === "MANGEL").length;

        return (
          <View key={section.id} style={{ marginBottom: 14 }} wrap={false}>
            <Text style={styles.subsectionTitle}>
              {section.title}
              <Text style={{ fontSize: 8, fontWeight: "normal", color: "#666" }}>
                {" "}({ioCount} i.O. / {mangelCount} Mangel / {visibleItems.length} Punkte)
              </Text>
            </Text>

            <View style={styles.checklistTable}>
              {/* Header */}
              <View style={styles.checklistHeader}>
                <View style={styles.checkColNr}>
                  <Text style={styles.checkHeaderText}>Nr.</Text>
                </View>
                <View style={styles.checkColItem}>
                  <Text style={[styles.checkHeaderText, { textAlign: "left" }]}>Prüfpunkt</Text>
                </View>
                <View style={styles.checkColIO}>
                  <Text style={styles.checkHeaderText}>i.O.</Text>
                </View>
                <View style={styles.checkColMangel}>
                  <Text style={styles.checkHeaderText}>Mangel</Text>
                </View>
                <View style={styles.checkColBemerkung}>
                  <Text style={[styles.checkHeaderText, { textAlign: "left" }]}>Bemerkung</Text>
                </View>
              </View>

              {/* Rows */}
              {visibleItems.map((item, idx) => {
                const check = checkMap.get(item.id);
                const status = check?.status;
                const findingNrs = findingsByItemId.get(item.id);
                const rowStyle = idx % 2 === 0 ? styles.checklistRow : styles.checklistRowAlt;

                // Build remark text
                const remarks: string[] = [];
                if (findingNrs && findingNrs.length > 0) {
                  remarks.push(`Befund #${findingNrs.join(", #")}`);
                }
                if (check?.lastTestDate) {
                  remarks.push(`Letzte: ${formatDate(check.lastTestDate)}`);
                }
                if (check?.nextTestDate) {
                  remarks.push(`Nächste: ${formatDate(check.nextTestDate)}`);
                }

                return (
                  <View key={item.id} style={rowStyle}>
                    <View style={styles.checkColNr}>
                      <Text style={styles.checkText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.checkColItem}>
                      <Text style={styles.checkText}>{item.label}</Text>
                    </View>
                    <View style={styles.checkColIO}>
                      <Checkbox checked={status === "IO"} />
                    </View>
                    <View style={styles.checkColMangel}>
                      <Checkbox checked={status === "MANGEL"} />
                    </View>
                    <View style={styles.checkColBemerkung}>
                      <Text style={[styles.checkText, { fontSize: 7, color: "#666" }]}>
                        {remarks.join(" | ")}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Disclaimer
function DisclaimerSection() {
  return (
    <View style={styles.disclaimerBlock}>
      <Text style={styles.disclaimerText}>
        Bitte beachten Sie, dass bei einer stichprobenartigen Besichtigung nicht alle Mängel
        offenkundig werden müssen. Es bleibt in der Verantwortung der Führungskräfte und
        Mitarbeitenden, alles Erforderliche zur Vermeidung von Arbeitsunfällen,
        Berufserkrankungen und arbeitsbedingten Gesundheitsgefahren zu unternehmen.
        Die in diesem Bericht genannten Maßnahmen sind als Empfehlungen zu verstehen und
        müssen ggf. an die betrieblichen Gegebenheiten angepasst werden.
      </Text>
    </View>
  );
}

// Signature Section
function SignatureSection({ data }: { data: InspectionData }) {
  return (
    <View wrap={false}>
      <DisclaimerSection />
      <View style={styles.signatureBlock}>
        <View style={styles.signatureLine}>
          <View style={styles.signatureRule} />
          <Text style={styles.signatureLabel}>
            Ort, Datum
          </Text>
        </View>
        <View style={styles.signatureLine}>
          <View style={styles.signatureRule} />
          <Text style={styles.signatureLabel}>
            Ort, Datum
          </Text>
        </View>
      </View>
      <View style={[styles.signatureBlock, { marginTop: 24 }]}>
        <View style={styles.signatureLine}>
          <View style={styles.signatureRule} />
          <Text style={styles.signatureLabel}>
            Fachkraft für Arbeitssicherheit
          </Text>
          <Text style={{ fontSize: 8, color: "#666", marginTop: 2 }}>
            {data.inspector.firstName} {data.inspector.lastName}
          </Text>
        </View>
        <View style={styles.signatureLine}>
          <View style={styles.signatureRule} />
          <Text style={styles.signatureLabel}>
            Arbeitgeber / Vertreter
          </Text>
        </View>
      </View>
    </View>
  );
}

// Main Document
function InspectionReportDocument({ data }: { data: InspectionData }) {
  return (
    <Document
      title={`Begehungsbericht ${data.inspectionNumber || ""} - ${data.company.name}`}
      author="AcoManage"
      subject="Begehungsbericht"
    >
      <CoverPage data={data} />

      <Page size="A4" style={styles.page}>
        <PageHeader inspection={data} />
        <PageFooter />
        <SummarySection data={data} />
        <FindingsSection findings={data.findings} />
      </Page>

      {data.template?.sections?.length ? (
        <Page size="A4" style={styles.page}>
          <PageHeader inspection={data} />
          <PageFooter />
          <ChecklistSection data={data} />
          <SignatureSection data={data} />
        </Page>
      ) : (
        <Page size="A4" style={styles.page}>
          <PageHeader inspection={data} />
          <PageFooter />
          <SignatureSection data={data} />
        </Page>
      )}
    </Document>
  );
}

export async function renderInspectionReport(data: InspectionData): Promise<Buffer> {
  const buffer = await renderToBuffer(<InspectionReportDocument data={data} />);
  return Buffer.from(buffer);
}
