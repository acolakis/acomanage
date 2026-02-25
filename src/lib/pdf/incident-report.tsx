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
  coverDivider: { height: 3, backgroundColor: "#dc2626", marginVertical: 20, width: 80 },
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
  // Info rows
  infoRow: { flexDirection: "row", marginBottom: 4 },
  infoLabel: { width: 140, fontSize: 9, color: "#666" },
  infoValue: { flex: 1, fontSize: 9, fontWeight: "bold" },
  // Description block
  descriptionBlock: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 10, marginBottom: 12 },
  descriptionText: { fontSize: 9, lineHeight: 1.5, color: "#374151" },
  // Severity badges
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2, alignSelf: "flex-start" },
  severityGering: { backgroundColor: "#dcfce7", color: "#166534" },
  severityMittel: { backgroundColor: "#fef9c3", color: "#854d0e" },
  severitySchwer: { backgroundColor: "#fed7aa", color: "#9a3412" },
  severityToedlich: { backgroundColor: "#fecaca", color: "#991b1b" },
  // Status badges
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2, alignSelf: "flex-start" },
  statusGemeldet: { backgroundColor: "#dbeafe", color: "#1e40af" },
  statusInUntersuchung: { backgroundColor: "#fef9c3", color: "#854d0e" },
  statusMassnahmen: { backgroundColor: "#fed7aa", color: "#9a3412" },
  statusAbgeschlossen: { backgroundColor: "#dcfce7", color: "#166534" },
  // BG section highlight
  bgBlock: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 4, padding: 10, marginBottom: 12 },
  bgBlockNormal: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: 4, padding: 10, marginBottom: 12 },
  // Actions table
  actionsTable: { marginBottom: 12 },
  actionsHeader: {
    flexDirection: "row", backgroundColor: "#f3f4f6",
    borderWidth: 1, borderColor: "#d1d5db",
    paddingVertical: 5, paddingHorizontal: 4,
  },
  actionsRow: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 4, paddingHorizontal: 4, minHeight: 22,
  },
  actionsRowAlt: {
    flexDirection: "row",
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 4, paddingHorizontal: 4, minHeight: 22,
    backgroundColor: "#fafafa",
  },
  actionsColNr: { width: 30, justifyContent: "center" },
  actionsColTitle: { flex: 1, justifyContent: "center", paddingHorizontal: 4 },
  actionsColType: { width: 55, justifyContent: "center", paddingHorizontal: 2 },
  actionsColPriority: { width: 45, justifyContent: "center", paddingHorizontal: 2 },
  actionsColStatus: { width: 55, justifyContent: "center", paddingHorizontal: 2 },
  actionsColResponsible: { width: 80, justifyContent: "center", paddingHorizontal: 2 },
  actionsColDeadline: { width: 55, justifyContent: "center", paddingHorizontal: 2 },
  cellText: { fontSize: 8 },
  headerCellText: { fontSize: 7, fontWeight: "bold", color: "#374151" },
  // Signature
  signatureBlock: { marginTop: 40, flexDirection: "row", justifyContent: "space-between" },
  signatureLine: { width: 200 },
  signatureRule: { borderBottomWidth: 1, borderBottomColor: "#1a1a1a", marginBottom: 4, height: 40 },
  signatureLabel: { fontSize: 8, color: "#666" },
  // Priority color helpers
  priorityNiedrig: { color: "#166534" },
  priorityMittel: { color: "#854d0e" },
  priorityHoch: { color: "#9a3412" },
  prioritySofort: { color: "#991b1b", fontWeight: "bold" },
});

// Types
interface IncidentReportData {
  incidentNumber: string | null;
  incidentType: string;
  severity: string;
  status: string;
  incidentDate: string;
  incidentTime: string | null;
  location: string | null;
  department: string | null;
  description: string;
  affectedPerson: string | null;
  affectedRole: string | null;
  witnesses: string | null;
  rootCause: string | null;
  rootCauseCategory: string | null;
  contributingFactors: string | null;
  injuryType: string | null;
  bodyPart: string | null;
  lostWorkDays: number | null;
  bgReportable: boolean;
  bgReportDate: string | null;
  bgReportNumber: string | null;
  company: { name: string; city: string | null };
  createdBy: { firstName: string; lastName: string } | null;
  investigatedBy: { firstName: string; lastName: string } | null;
  actions: Array<{
    actionNumber: string | null;
    title: string;
    priority: string;
    status: string;
    measureType: string | null;
    deadline: string | null;
    responsible: { firstName: string; lastName: string } | null;
  }>;
}

// Label maps
const typeLabels: Record<string, string> = {
  UNFALL: "Unfall",
  BEINAHEUNFALL: "Beinaheunfall",
  VORFALL: "Vorfall",
  BERUFSKRANKHEIT: "Berufskrankheit",
  ERSTEHILFE: "Erste Hilfe",
};

const severityLabels: Record<string, string> = {
  GERING: "Gering",
  MITTEL: "Mittel",
  SCHWER: "Schwer",
  TOEDLICH: "Tödlich",
};

const statusLabels: Record<string, string> = {
  GEMELDET: "Gemeldet",
  IN_UNTERSUCHUNG: "In Untersuchung",
  MASSNAHMEN: "Maßnahmen offen",
  ABGESCHLOSSEN: "Abgeschlossen",
};

const rootCauseLabels: Record<string, string> = {
  MENSCH: "Mensch",
  TECHNIK: "Technik",
  ORGANISATION: "Organisation",
  UMGEBUNG: "Umgebung",
};

const priorityLabels: Record<string, string> = {
  NIEDRIG: "Niedrig",
  MITTEL: "Mittel",
  HOCH: "Hoch",
  SOFORT: "Sofort",
};

const actionStatusLabels: Record<string, string> = {
  OFFEN: "Offen",
  IN_BEARBEITUNG: "In Bearbeitung",
  UMGESETZT: "Umgesetzt",
  WIRKSAMKEIT_GEPRUEFT: "Geprüft",
  ABGESCHLOSSEN: "Abgeschlossen",
};

const measureTypeLabels: Record<string, string> = {
  T: "Technisch",
  O: "Organisatorisch",
  P: "Personenbezogen",
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function getSeverityStyle(severity: string) {
  switch (severity) {
    case "GERING": return styles.severityGering;
    case "MITTEL": return styles.severityMittel;
    case "SCHWER": return styles.severitySchwer;
    case "TOEDLICH": return styles.severityToedlich;
    default: return {};
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "GEMELDET": return styles.statusGemeldet;
    case "IN_UNTERSUCHUNG": return styles.statusInUntersuchung;
    case "MASSNAHMEN": return styles.statusMassnahmen;
    case "ABGESCHLOSSEN": return styles.statusAbgeschlossen;
    default: return {};
  }
}

function getPriorityStyle(priority: string) {
  switch (priority) {
    case "NIEDRIG": return styles.priorityNiedrig;
    case "MITTEL": return styles.priorityMittel;
    case "HOCH": return styles.priorityHoch;
    case "SOFORT": return styles.prioritySofort;
    default: return {};
  }
}

// Cover Page
function CoverPage({ data }: { data: IncidentReportData }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverHeader}>
        <Text style={styles.coverTitle}>Vorfallbericht</Text>
        <Text style={styles.coverSubtitle}>
          {typeLabels[data.incidentType] || data.incidentType}
          {" — "}
          {severityLabels[data.severity] || data.severity}
        </Text>
        <View style={styles.coverDivider} />

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Betrieb</Text>
          <Text style={styles.coverInfoValue}>
            {data.company.name}{data.company.city ? ` — ${data.company.city}` : ""}
          </Text>
        </View>

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Vorfallnummer</Text>
          <Text style={styles.coverInfoValue}>{data.incidentNumber || "—"}</Text>
        </View>

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Datum des Vorfalls</Text>
          <Text style={styles.coverInfoValue}>
            {formatDate(data.incidentDate)}
            {data.incidentTime ? ` um ${data.incidentTime} Uhr` : ""}
          </Text>
        </View>

        {data.location && (
          <View style={styles.coverInfoBlock}>
            <Text style={styles.coverInfoLabel}>Ort</Text>
            <Text style={styles.coverInfoValue}>{data.location}</Text>
          </View>
        )}

        <View style={styles.coverInfoBlock}>
          <Text style={styles.coverInfoLabel}>Status</Text>
          <Text style={styles.coverInfoValue}>
            {statusLabels[data.status] || data.status}
          </Text>
        </View>
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
function PageHeader({ data }: { data: IncidentReportData }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerText}>
        {data.company.name}{data.company.city ? ` — ${data.company.city}` : ""}
      </Text>
      <Text style={styles.headerText}>{formatDate(data.incidentDate)}</Text>
      <Text style={styles.headerText}>{data.incidentNumber || ""}</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>AcoManage — Vorfallbericht</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
    </View>
  );
}

// Grunddaten Section
function GrunddatenSection({ data }: { data: IncidentReportData }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Grunddaten</Text>
      <View style={{ marginBottom: 12 }}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Vorfallart:</Text>
          <Text style={styles.infoValue}>{typeLabels[data.incidentType] || data.incidentType}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Schweregrad:</Text>
          <View style={[styles.severityBadge, getSeverityStyle(data.severity)]}>
            <Text style={[{ fontSize: 8, fontWeight: "bold" }, getSeverityStyle(data.severity)]}>
              {severityLabels[data.severity] || data.severity}
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <View style={[styles.statusBadge, getStatusStyle(data.status)]}>
            <Text style={[{ fontSize: 8, fontWeight: "bold" }, getStatusStyle(data.status)]}>
              {statusLabels[data.status] || data.status}
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Datum:</Text>
          <Text style={styles.infoValue}>{formatDate(data.incidentDate)}</Text>
        </View>
        {data.incidentTime && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Uhrzeit:</Text>
            <Text style={styles.infoValue}>{data.incidentTime} Uhr</Text>
          </View>
        )}
        {data.location && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ort:</Text>
            <Text style={styles.infoValue}>{data.location}</Text>
          </View>
        )}
        {data.department && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Abteilung:</Text>
            <Text style={styles.infoValue}>{data.department}</Text>
          </View>
        )}
        {data.createdBy && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gemeldet von:</Text>
            <Text style={styles.infoValue}>{data.createdBy.firstName} {data.createdBy.lastName}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Beschreibung Section
function BeschreibungSection({ data }: { data: IncidentReportData }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Beschreibung des Vorfalls</Text>
      <View style={styles.descriptionBlock}>
        <Text style={styles.descriptionText}>{data.description}</Text>
      </View>
    </View>
  );
}

// Betroffene Person Section
function BetroffenePersonSection({ data }: { data: IncidentReportData }) {
  const hasPersonData = data.affectedPerson || data.affectedRole || data.witnesses || data.injuryType || data.bodyPart || data.lostWorkDays !== null;
  if (!hasPersonData) return null;

  return (
    <View>
      <Text style={styles.sectionTitle}>Betroffene Person</Text>
      <View style={{ marginBottom: 12 }}>
        {data.affectedPerson && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{data.affectedPerson}</Text>
          </View>
        )}
        {data.affectedRole && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Funktion / Rolle:</Text>
            <Text style={styles.infoValue}>{data.affectedRole}</Text>
          </View>
        )}
        {data.witnesses && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Zeugen:</Text>
            <Text style={styles.infoValue}>{data.witnesses}</Text>
          </View>
        )}
        {data.injuryType && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Art der Verletzung:</Text>
            <Text style={styles.infoValue}>{data.injuryType}</Text>
          </View>
        )}
        {data.bodyPart && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Betroffenes Körperteil:</Text>
            <Text style={styles.infoValue}>{data.bodyPart}</Text>
          </View>
        )}
        {data.lostWorkDays !== null && data.lostWorkDays !== undefined && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ausfalltage:</Text>
            <Text style={styles.infoValue}>
              {data.lostWorkDays} {data.lostWorkDays === 1 ? "Tag" : "Tage"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// BG-Meldung Section
function BgMeldungSection({ data }: { data: IncidentReportData }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>BG-Meldung</Text>
      <View style={data.bgReportable ? styles.bgBlock : styles.bgBlockNormal}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Meldepflichtig:</Text>
          <Text style={[styles.infoValue, data.bgReportable ? { color: "#991b1b" } : { color: "#166534" }]}>
            {data.bgReportable ? "Ja" : "Nein"}
          </Text>
        </View>
        {data.bgReportable && data.bgReportDate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Meldedatum:</Text>
            <Text style={styles.infoValue}>{formatDate(data.bgReportDate)}</Text>
          </View>
        )}
        {data.bgReportable && data.bgReportNumber && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BG-Aktenzeichen:</Text>
            <Text style={styles.infoValue}>{data.bgReportNumber}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Untersuchung Section
function UntersuchungSection({ data }: { data: IncidentReportData }) {
  const hasInvestigationData = data.rootCause || data.rootCauseCategory || data.contributingFactors || data.investigatedBy;
  if (!hasInvestigationData) return null;

  return (
    <View>
      <Text style={styles.sectionTitle}>Untersuchung</Text>
      <View style={{ marginBottom: 12 }}>
        {data.investigatedBy && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Untersucht von:</Text>
            <Text style={styles.infoValue}>{data.investigatedBy.firstName} {data.investigatedBy.lastName}</Text>
          </View>
        )}
        {data.rootCauseCategory && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ursachenkategorie:</Text>
            <Text style={styles.infoValue}>{rootCauseLabels[data.rootCauseCategory] || data.rootCauseCategory}</Text>
          </View>
        )}
        {data.rootCause && (
          <View style={{ marginTop: 6 }}>
            <Text style={styles.subsectionTitle}>Ursachenanalyse</Text>
            <View style={styles.descriptionBlock}>
              <Text style={styles.descriptionText}>{data.rootCause}</Text>
            </View>
          </View>
        )}
        {data.contributingFactors && (
          <View style={{ marginTop: 6 }}>
            <Text style={styles.subsectionTitle}>Beitragende Faktoren</Text>
            <View style={styles.descriptionBlock}>
              <Text style={styles.descriptionText}>{data.contributingFactors}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// Massnahmen Table Section
function MassnahmenSection({ data }: { data: IncidentReportData }) {
  if (!data.actions || data.actions.length === 0) return null;

  return (
    <View>
      <Text style={styles.sectionTitle}>Maßnahmen</Text>
      <View style={styles.actionsTable}>
        {/* Header */}
        <View style={styles.actionsHeader}>
          <View style={styles.actionsColNr}>
            <Text style={styles.headerCellText}>Nr.</Text>
          </View>
          <View style={styles.actionsColTitle}>
            <Text style={styles.headerCellText}>Maßnahme</Text>
          </View>
          <View style={styles.actionsColType}>
            <Text style={styles.headerCellText}>Typ</Text>
          </View>
          <View style={styles.actionsColPriority}>
            <Text style={styles.headerCellText}>Priorität</Text>
          </View>
          <View style={styles.actionsColStatus}>
            <Text style={styles.headerCellText}>Status</Text>
          </View>
          <View style={styles.actionsColResponsible}>
            <Text style={styles.headerCellText}>Verantwortlich</Text>
          </View>
          <View style={styles.actionsColDeadline}>
            <Text style={styles.headerCellText}>Frist</Text>
          </View>
        </View>

        {/* Rows */}
        {data.actions.map((action, idx) => {
          const rowStyle = idx % 2 === 0 ? styles.actionsRow : styles.actionsRowAlt;

          return (
            <View key={idx} style={rowStyle} wrap={false}>
              <View style={styles.actionsColNr}>
                <Text style={styles.cellText}>{action.actionNumber || (idx + 1).toString()}</Text>
              </View>
              <View style={styles.actionsColTitle}>
                <Text style={styles.cellText}>{action.title}</Text>
              </View>
              <View style={styles.actionsColType}>
                <Text style={styles.cellText}>
                  {action.measureType ? (measureTypeLabels[action.measureType] || action.measureType) : "—"}
                </Text>
              </View>
              <View style={styles.actionsColPriority}>
                <Text style={[styles.cellText, getPriorityStyle(action.priority)]}>
                  {priorityLabels[action.priority] || action.priority}
                </Text>
              </View>
              <View style={styles.actionsColStatus}>
                <Text style={styles.cellText}>
                  {actionStatusLabels[action.status] || action.status}
                </Text>
              </View>
              <View style={styles.actionsColResponsible}>
                <Text style={styles.cellText}>
                  {action.responsible ? `${action.responsible.firstName} ${action.responsible.lastName}` : "—"}
                </Text>
              </View>
              <View style={styles.actionsColDeadline}>
                <Text style={styles.cellText}>
                  {action.deadline ? formatDate(action.deadline) : "—"}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Signature Section
function SignatureSection({ data }: { data: IncidentReportData }) {
  return (
    <View wrap={false}>
      <View style={styles.signatureBlock}>
        <View style={styles.signatureLine}>
          <View style={styles.signatureRule} />
          <Text style={styles.signatureLabel}>Ort, Datum</Text>
        </View>
        <View style={styles.signatureLine}>
          <View style={styles.signatureRule} />
          <Text style={styles.signatureLabel}>Ort, Datum</Text>
        </View>
      </View>
      <View style={[styles.signatureBlock, { marginTop: 24 }]}>
        <View style={styles.signatureLine}>
          <View style={styles.signatureRule} />
          <Text style={styles.signatureLabel}>Fachkraft für Arbeitssicherheit</Text>
          {data.investigatedBy && (
            <Text style={{ fontSize: 8, color: "#666", marginTop: 2 }}>
              {data.investigatedBy.firstName} {data.investigatedBy.lastName}
            </Text>
          )}
        </View>
        <View style={styles.signatureLine}>
          <View style={styles.signatureRule} />
          <Text style={styles.signatureLabel}>Arbeitgeber / Vertreter</Text>
        </View>
      </View>
    </View>
  );
}

// Main Document
function IncidentReport({ data }: { data: IncidentReportData }) {
  return (
    <Document
      title={`Vorfallbericht ${data.incidentNumber || ""} - ${data.company.name}`}
      author="AcoManage"
      subject="Vorfallbericht"
    >
      <CoverPage data={data} />

      <Page size="A4" style={styles.page}>
        <PageHeader data={data} />
        <PageFooter />
        <GrunddatenSection data={data} />
        <BeschreibungSection data={data} />
        <BetroffenePersonSection data={data} />
        <BgMeldungSection data={data} />
        <UntersuchungSection data={data} />
        <MassnahmenSection data={data} />
        <SignatureSection data={data} />
      </Page>
    </Document>
  );
}

export async function renderIncidentReport(data: IncidentReportData): Promise<Buffer> {
  const buffer = await renderToBuffer(<IncidentReport data={data} />);
  return Buffer.from(buffer);
}
