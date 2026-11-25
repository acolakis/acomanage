import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { FONT_FAMILY } from "./fonts";
import { colors } from "./styles";

// ===== Shared Styles =====

const s = StyleSheet.create({
  // Header / Footer
  header: {
    position: "absolute",
    top: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  headerText: { fontSize: 7, color: "#888", fontFamily: FONT_FAMILY },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: "#888", fontFamily: FONT_FAMILY },

  // Section titles
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
    marginTop: 16,
    color: colors.black,
    fontFamily: FONT_FAMILY,
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
    marginTop: 10,
    color: colors.darkGray,
    fontFamily: FONT_FAMILY,
  },

  // Info rows
  infoRow: { flexDirection: "row", marginBottom: 5 },
  infoLabel: { width: 160, fontSize: 9, color: colors.gray, fontFamily: FONT_FAMILY },
  infoValue: { flex: 1, fontSize: 9, fontWeight: 700, fontFamily: FONT_FAMILY },

  // Content blocks
  contentBlock: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  contentText: { fontSize: 9, lineHeight: 1.6, color: colors.darkGray, fontFamily: FONT_FAMILY },

  // Signature
  signatureBlock: { marginTop: 40, flexDirection: "row", justifyContent: "space-between" },
  signatureLine: { width: 200 },
  signatureRule: { borderBottomWidth: 1, borderBottomColor: colors.black, marginBottom: 4, height: 40 },
  signatureLabel: { fontSize: 8, color: colors.gray, fontFamily: FONT_FAMILY },
  signatureSubLabel: { fontSize: 8, color: colors.gray, marginTop: 2, fontFamily: FONT_FAMILY },

  // Participant table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderDark,
    paddingVertical: 5,
    paddingHorizontal: 4,
    minHeight: 24,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderDark,
    paddingVertical: 5,
    paddingHorizontal: 4,
    minHeight: 24,
    backgroundColor: "#fafafa",
  },
  headerCellText: { fontSize: 7, fontWeight: 700, color: colors.darkGray, textAlign: "center", fontFamily: FONT_FAMILY },
  headerCellTextLeft: { fontSize: 7, fontWeight: 700, color: colors.darkGray, textAlign: "left", fontFamily: FONT_FAMILY },
  cellText: { fontSize: 8, fontFamily: FONT_FAMILY },
  cellTextCenter: { fontSize: 8, textAlign: "center", fontFamily: FONT_FAMILY },

  // Checklist
  checklistRow: { flexDirection: "row", marginBottom: 4, alignItems: "flex-start" },
  checkBox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: colors.darkGray,
    marginRight: 8,
    marginTop: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxChecked: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    marginRight: 8,
    marginTop: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { fontSize: 8, color: colors.white, fontFamily: FONT_FAMILY },
  checkLabel: { flex: 1, fontSize: 9, lineHeight: 1.5, fontFamily: FONT_FAMILY },

  // Bullet list
  bulletRow: { flexDirection: "row", marginBottom: 3, paddingLeft: 4 },
  bullet: { width: 12, fontSize: 9, fontFamily: FONT_FAMILY },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.5, fontFamily: FONT_FAMILY },

  // Divider
  divider: { height: 2, backgroundColor: colors.primary, marginVertical: 12, width: 60 },
  dividerFull: { height: 1, backgroundColor: colors.border, marginVertical: 8 },

  // Created with
  createdWith: { fontSize: 7, color: "#aaa", textAlign: "center", marginTop: 24, fontFamily: FONT_FAMILY },

  // Unterweisungsnachweis meta block
  metaBlock: { marginBottom: 12 },
  metaRow: { flexDirection: "row", marginBottom: 3 },
  metaLabel: { width: 180, fontSize: 8, color: colors.gray, fontFamily: FONT_FAMILY },
  metaValue: { flex: 1, fontSize: 8, fontFamily: FONT_FAMILY },
  metaDivider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
});

// ===== Components =====

// --- PageHeader ---
interface PageHeaderProps {
  left: string;
  center?: string;
  right?: string;
}

export function PageHeader({ left, center, right }: PageHeaderProps) {
  return (
    <View style={s.header} fixed>
      <Text style={s.headerText}>{left}</Text>
      {center && <Text style={s.headerText}>{center}</Text>}
      <Text style={s.headerText}>{right || ""}</Text>
    </View>
  );
}

// --- PageFooter ---
export function PageFooter({ label }: { label: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>AcoManage — {label}</Text>
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`}
      />
    </View>
  );
}

// --- SectionTitle ---
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

export function SubsectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.subsectionTitle}>{children}</Text>;
}

// --- InfoRow ---
interface InfoRowProps {
  label: string;
  value: string;
  labelWidth?: number;
}

export function InfoRow({ label, value, labelWidth }: InfoRowProps) {
  return (
    <View style={s.infoRow}>
      <Text style={[s.infoLabel, labelWidth ? { width: labelWidth } : {}]}>{label}</Text>
      <Text style={s.infoValue}>{value || "—"}</Text>
    </View>
  );
}

export function InfoGrid({ children }: { children: React.ReactNode }) {
  return <View style={{ marginBottom: 16 }}>{children}</View>;
}

// --- ContentBlock ---
export function ContentBlock({ children }: { children: React.ReactNode }) {
  return <View style={s.contentBlock}>{children}</View>;
}

export function ContentText({ children }: { children: React.ReactNode }) {
  return <Text style={s.contentText}>{children}</Text>;
}

// --- Divider ---
export function Divider({ full }: { full?: boolean } = {}) {
  return <View style={full ? s.dividerFull : s.divider} />;
}

// --- SignatureBlock ---
interface SignatureLineConfig {
  label: string;
  name?: string;
}

export function SignatureBlock({ lines }: { lines: SignatureLineConfig[] }) {
  // Arrange in rows of 2
  const rows: SignatureLineConfig[][] = [];
  for (let i = 0; i < lines.length; i += 2) {
    rows.push(lines.slice(i, i + 2));
  }

  return (
    <View wrap={false}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={s.signatureBlock}>
          {row.map((line, idx) => (
            <View key={idx} style={s.signatureLine}>
              <View style={s.signatureRule} />
              <Text style={s.signatureLabel}>{line.label}</Text>
              {line.name && <Text style={s.signatureSubLabel}>{line.name}</Text>}
            </View>
          ))}
          {row.length === 1 && <View style={s.signatureLine} />}
        </View>
      ))}
    </View>
  );
}

// --- ChecklistItem ---
export function ChecklistItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <View style={s.checklistRow}>
      <View style={checked ? s.checkBoxChecked : s.checkBox}>
        {checked && <Text style={s.checkMark}>✓</Text>}
      </View>
      <Text style={s.checkLabel}>{label}</Text>
    </View>
  );
}

// --- BulletList ---
export function BulletList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx} style={s.bulletRow}>
          <Text style={s.bullet}>•</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// --- NumberedList ---
export function NumberedList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx} style={s.bulletRow}>
          <Text style={[s.bullet, { width: 18 }]}>{idx + 1}.</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// --- ParticipantTable ---
interface Participant {
  name: string;
  department?: string;
  signature?: string;
}

export function ParticipantTable({
  participants,
  emptyRows = 0,
  showDepartment = true,
}: {
  participants: Participant[];
  emptyRows?: number;
  showDepartment?: boolean;
}) {
  const allRows = [
    ...participants,
    ...Array.from({ length: emptyRows }, () => ({ name: "", department: "", signature: "" })),
  ];

  return (
    <View style={{ marginBottom: 16 }}>
      {/* Header */}
      <View style={s.tableHeader}>
        <View style={{ width: 28, alignItems: "center" }}>
          <Text style={s.headerCellText}>Nr.</Text>
        </View>
        <View style={{ flex: 1, paddingHorizontal: 4 }}>
          <Text style={s.headerCellTextLeft}>Name / Vorname</Text>
        </View>
        {showDepartment && (
          <View style={{ width: 100, paddingHorizontal: 4 }}>
            <Text style={s.headerCellTextLeft}>Abteilung</Text>
          </View>
        )}
        <View style={{ width: 120, paddingHorizontal: 4 }}>
          <Text style={s.headerCellTextLeft}>Unterschrift</Text>
        </View>
      </View>

      {/* Rows */}
      {allRows.map((p, idx) => (
        <View key={idx} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
          <View style={{ width: 28, alignItems: "center", justifyContent: "center" }}>
            <Text style={s.cellTextCenter}>{idx + 1}</Text>
          </View>
          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 4 }}>
            <Text style={s.cellText}>{p.name || ""}</Text>
          </View>
          {showDepartment && (
            <View style={{ width: 100, justifyContent: "center", paddingHorizontal: 4 }}>
              <Text style={s.cellText}>{p.department || ""}</Text>
            </View>
          )}
          <View style={{ width: 120, justifyContent: "center", paddingHorizontal: 4 }}>
            <Text style={s.cellText}>{p.signature || ""}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// --- Generic Table ---
interface TableColumn {
  key: string;
  label: string;
  width?: number;
  align?: "left" | "center" | "right";
}

export function PdfTable({
  columns,
  rows,
}: {
  columns: TableColumn[];
  rows: Record<string, string>[];
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={s.tableHeader}>
        {columns.map((col) => (
          <View key={col.key} style={{ width: col.width, flex: col.width ? undefined : 1, paddingHorizontal: 4 }}>
            <Text style={col.align === "center" ? s.headerCellText : s.headerCellTextLeft}>
              {col.label}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((row, idx) => (
        <View key={idx} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
          {columns.map((col) => (
            <View key={col.key} style={{ width: col.width, flex: col.width ? undefined : 1, justifyContent: "center", paddingHorizontal: 4 }}>
              <Text style={col.align === "center" ? s.cellTextCenter : s.cellText}>
                {row[col.key] || ""}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// --- UnterweisungsnachweisMeta ---
// Standard metadata block used in all Unterweisungsnachweis documents
interface UNMetaProps {
  unterweisendeFirma: string;
  unterweisendeFirmaAdresse: string;
  zuUnterweisendeFirma: string;
  zuUnterweisendeFirmaAdresse: string;
  abteilung: string;
  rechtsgrundlage: string;
  datum: string;
  ort: string;
}

export function UnterweisungsnachweisMeta(props: UNMetaProps) {
  return (
    <View style={s.metaBlock}>
      <View style={s.metaRow}>
        <Text style={s.metaLabel}>Unterweisende Firma:</Text>
        <Text style={s.metaValue}>{props.unterweisendeFirma}, {props.unterweisendeFirmaAdresse}</Text>
      </View>
      <View style={s.metaRow}>
        <Text style={s.metaLabel}>Zu unterweisende Firma:</Text>
        <Text style={s.metaValue}>{props.zuUnterweisendeFirma}, {props.zuUnterweisendeFirmaAdresse}</Text>
      </View>
      <View style={s.metaDivider} />
      <View style={s.metaRow}>
        <Text style={s.metaLabel}>Abt.:</Text>
        <Text style={s.metaValue}>{props.abteilung}</Text>
      </View>
      <View style={s.metaRow}>
        <Text style={s.metaLabel}>Rechtsgrundlage:</Text>
        <Text style={s.metaValue}>{props.rechtsgrundlage}</Text>
      </View>
      <View style={s.metaDivider} />
      <View style={{ flexDirection: "row" }}>
        <View style={{ flex: 1 }}>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Datum:</Text>
            <Text style={s.metaValue}>{props.datum}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Ort:</Text>
            <Text style={s.metaValue}>{props.ort}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// --- CreatedWith ---
export function CreatedWith() {
  return <Text style={s.createdWith}>Erstellt mit AcoManage</Text>;
}

// --- ConfirmationText ---
// Standard text for training confirmation
export function ConfirmationText() {
  return (
    <View style={[s.contentBlock, { marginTop: 12 }]}>
      <Text style={s.contentText}>
        Mit der Unterschrift bestätigt der Mitarbeiter die Schulungs-/Unterweisungsinhalte
        verstanden zu haben und zukünftig umzusetzen.
      </Text>
    </View>
  );
}

// --- NextTopicBlock ---
export function NextTopicBlock({ topic, nextDate }: { topic?: string; nextDate?: string }) {
  return (
    <View style={{ marginTop: 16 }}>
      <View style={s.metaRow}>
        <Text style={s.metaLabel}>Geplantes Thema / Nächster Unterweisungstermin:</Text>
        <Text style={s.metaValue}>{topic || ""}</Text>
      </View>
      {nextDate && (
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>Nächster Termin:</Text>
          <Text style={s.metaValue}>{nextDate}</Text>
        </View>
      )}
    </View>
  );
}

// --- Utility: formatDate ---
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}
