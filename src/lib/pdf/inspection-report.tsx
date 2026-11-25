import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import "@/lib/pdf/shared/fonts";
import { FONT_FAMILY } from "@/lib/pdf/shared/fonts";

// === TYPES ===

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

export interface PrevItemCheck {
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
  company: { name: string; city: string | null; street: string | null; zip: string | null };
  inspector: { firstName: string | null; lastName: string | null };
  template?: { name: string; sections: TemplateSection[] } | null;
  findings: FindingData[];
  itemChecks?: ItemCheck[];
}

// === HELPERS ===

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function getBegehungStand(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function buildAddress(company: InspectionData["company"]): string {
  const parts: string[] = [];
  if (company.street) parts.push(company.street);
  const cityLine = [company.zip, company.city].filter(Boolean).join(" ");
  if (cityLine) parts.push(cityLine);
  return parts.join(", ") || "—";
}

// Is this section the Prüfliste (M01B equipment tests)?
function isPrueflisteSection(sectionCode: string): boolean {
  return sectionCode === "M_PRUEFLISTE";
}

// === STYLES ===

const C = {
  black: "#000000",
  white: "#ffffff",
  red: "#cc0000",
  darkBlue: "#1a3a6b",
  headerBg: "#d8d8d8",
  altRowBg: "#f7f7f7",
  sectionBg: "#c8c8c8",
  border: "#999999",
  borderLight: "#cccccc",
  darkGray: "#555555",
  medGray: "#777777",
  lightGray: "#aaaaaa",
  greenOk: "#1a6b1a",
};

const F = { tiny: 6, small: 7, body: 7.5, label: 8, heading: 9, title: 10 };

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: F.body,
    paddingTop: 14,
    paddingBottom: 24,
    paddingHorizontal: 18,
    color: C.black,
  },

  // ── DOCUMENT TITLE HEADER (page 1 only) ──────────────────────────────────
  titleBlock: {
    backgroundColor: C.darkBlue,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  titleText: {
    color: C.white,
    fontSize: F.heading,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  titleSub: {
    color: "#aaccee",
    fontSize: F.small,
    textAlign: "center",
    marginTop: 1,
  },

  // ── INFO HEADER TABLE ─────────────────────────────────────────────────────
  infoTable: {
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 7,
  },
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  infoRowLast: {
    flexDirection: "row",
  },
  infoCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRightWidth: 0.5,
    borderRightColor: C.border,
  },
  infoCellEnd: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  infoCellFull: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  infoLbl: {
    fontSize: F.small,
    color: C.medGray,
    width: 64,
    paddingTop: 1,
    flexShrink: 0,
  },
  infoVal: {
    fontSize: F.label,
    fontWeight: "bold",
    flex: 1,
  },
  infoValSmall: {
    fontSize: F.body,
    fontWeight: "bold",
    flex: 1,
  },
  infoStand: {
    fontSize: 11,
    fontWeight: "bold",
    color: C.darkBlue,
    flex: 1,
  },

  // ── COMPACT RUNNING HEADER (all pages) ───────────────────────────────────
  runHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
    paddingBottom: 3,
    marginBottom: 5,
  },
  runHeaderLeft: { fontSize: F.small, fontWeight: "bold", flex: 1 },
  runHeaderMid: { fontSize: F.small, color: C.medGray, textAlign: "center", flex: 1 },
  runHeaderRight: { fontSize: F.small, color: C.medGray, textAlign: "right", flex: 1 },

  // ── CHECKLIST TABLE ───────────────────────────────────────────────────────
  table: {
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: C.border,
    marginBottom: 5,
  },

  // Column-header row (Prüfpunkt / Vorhanden / Datum)
  colHeaderRow: {
    flexDirection: "row",
    backgroundColor: C.darkGray,
    borderBottomWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: C.border,
    paddingVertical: 3,
  },
  colHeaderText: {
    fontSize: F.tiny,
    fontWeight: "bold",
    color: C.white,
    textAlign: "center",
  },

  // Section header row
  sectionRow: {
    flexDirection: "row",
    backgroundColor: C.sectionBg,
    borderBottomWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: C.border,
    paddingVertical: 4,
    paddingHorizontal: 5,
    alignItems: "center",
  },
  sectionText: {
    fontSize: F.label,
    fontWeight: "bold",
  },

  // Item row (normal / alternate)
  itemRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: C.border,
    minHeight: 15,
    alignItems: "stretch",
  },
  itemRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: C.border,
    minHeight: 15,
    alignItems: "stretch",
    backgroundColor: C.altRowBg,
  },

  // ── COLUMNS (regular sections) ────────────────────────────────────────────
  cCode: {
    width: 54,
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRightWidth: 0.5,
    borderRightColor: C.border,
    justifyContent: "center",
  },
  cCodeTxt: { fontSize: F.small, fontWeight: "bold" },

  cLabel: {
    flex: 1,
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRightWidth: 0.5,
    borderRightColor: C.border,
    justifyContent: "center",
  },
  cLabelTxt: { fontSize: F.small },

  cStatus: {
    width: 52,
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRightWidth: 0.5,
    borderRightColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },

  cDate: {
    width: 108,
    paddingHorizontal: 3,
    paddingVertical: 2,
    justifyContent: "center",
  },
  cDateTxt: { fontSize: F.tiny },

  // ── COLUMNS (M01B Prüfliste) ──────────────────────────────────────────────
  mCode: {
    width: 60,
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRightWidth: 0.5,
    borderRightColor: C.border,
    justifyContent: "center",
  },
  mCodeTxt: { fontSize: F.small, fontWeight: "bold" },

  mLabel: {
    flex: 1,
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRightWidth: 0.5,
    borderRightColor: C.border,
    justifyContent: "center",
  },
  mLabelTxt: { fontSize: F.small },

  mDateCell: {
    width: 96,
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRightWidth: 0.5,
    borderRightColor: C.border,
    justifyContent: "center",
  },
  mDateCellLast: {
    width: 96,
    paddingHorizontal: 3,
    paddingVertical: 2,
    justifyContent: "center",
  },
  mDateLbl: { fontSize: F.tiny, color: C.medGray },
  mDateVal: { fontSize: F.small, fontWeight: "bold" },

  // ── STATUS TEXT ───────────────────────────────────────────────────────────
  statusJa: { fontSize: F.small, fontWeight: "bold", color: C.greenOk, textAlign: "center" },
  statusNein: { fontSize: F.small, fontWeight: "bold", color: C.red, textAlign: "center" },
  statusNa: { fontSize: F.tiny, color: C.lightGray, textAlign: "center", fontStyle: "italic" },
  statusEmpty: { fontSize: F.tiny, color: C.lightGray, textAlign: "center" },

  // ── RED (changed data) ────────────────────────────────────────────────────
  red: { color: C.red, fontWeight: "bold" },
  redSmall: { color: C.red, fontWeight: "bold", fontSize: F.tiny },

  // ── FINDINGS SECTION ──────────────────────────────────────────────────────
  findTitle: {
    backgroundColor: "#7a0000",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: C.border,
    marginTop: 10,
  },
  findTitleTxt: { color: C.white, fontWeight: "bold", fontSize: F.label },

  findColHeader: {
    flexDirection: "row",
    backgroundColor: C.headerBg,
    borderBottomWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: C.border,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },

  findRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: C.border,
    paddingVertical: 3,
    paddingHorizontal: 4,
    minHeight: 18,
  },
  findRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: C.border,
    paddingVertical: 3,
    paddingHorizontal: 4,
    minHeight: 18,
    backgroundColor: "#fff5f5",
  },

  findNrCol: { width: 22, fontSize: F.small, fontWeight: "bold" },
  findDescCol: { flex: 1, fontSize: F.small, paddingRight: 4 },
  findRiskCol: { width: 55, fontSize: F.small },
  findMeasureCol: { flex: 0.9, fontSize: F.small, color: C.darkGray },

  // ── NOTES ─────────────────────────────────────────────────────────────────
  notesBlock: {
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 5,
  },
  notesLbl: { fontSize: F.small, color: C.medGray, marginBottom: 2 },
  notesTxt: { fontSize: F.body, lineHeight: 1.5 },

  // ── DISCLAIMER ────────────────────────────────────────────────────────────
  disclaimerBlock: {
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: C.borderLight,
    padding: 5,
    backgroundColor: "#fafafa",
  },
  disclaimerTxt: {
    fontSize: F.tiny,
    color: C.medGray,
    lineHeight: 1.6,
    fontStyle: "italic",
  },

  // ── SIGNATURE ─────────────────────────────────────────────────────────────
  sigRow: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "space-between",
  },
  sigBox: { width: "46%" },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: C.black,
    height: 32,
    marginBottom: 3,
  },
  sigLbl: { fontSize: F.small, color: C.medGray },
  sigName: { fontSize: F.body, marginTop: 1 },

  // ── PAGE FOOTER ───────────────────────────────────────────────────────────
  pageFooter: {
    position: "absolute",
    bottom: 8,
    left: 18,
    right: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.borderLight,
    paddingTop: 2,
  },
  pageFooterTxt: { fontSize: F.tiny, color: C.lightGray },
});

// === DIFF HELPERS ===

type DiffMap = Map<string, { statusChanged: boolean; lastChanged: boolean; nextChanged: boolean; isNew: boolean }>;

function buildDiffMap(
  currentChecks: ItemCheck[] | undefined,
  prevChecks: PrevItemCheck[] | undefined
): DiffMap {
  const diff: DiffMap = new Map();
  if (!prevChecks || prevChecks.length === 0) return diff;

  const prevMap = new Map<string, PrevItemCheck>();
  for (const p of prevChecks) prevMap.set(p.templateItemId, p);

  for (const cur of currentChecks || []) {
    const prev = prevMap.get(cur.templateItemId);
    if (!prev) {
      // New item (exists in current but not in previous)
      const hasData = cur.status !== "UNCHECKED" || cur.lastTestDate || cur.nextTestDate;
      if (hasData) {
        diff.set(cur.templateItemId, { statusChanged: true, lastChanged: !!cur.lastTestDate, nextChanged: !!cur.nextTestDate, isNew: true });
      }
      continue;
    }
    const prevWasEmpty = prev.status === "UNCHECKED" || prev.status === "NICHT_RELEVANT";
    const statusChanged = !prevWasEmpty && prev.status !== cur.status;
    const lastChanged = (prev.lastTestDate || null) !== (cur.lastTestDate || null);
    const nextChanged = (prev.nextTestDate || null) !== (cur.nextTestDate || null);
    if (statusChanged || lastChanged || nextChanged) {
      diff.set(cur.templateItemId, { statusChanged, lastChanged, nextChanged, isNew: false });
    }
  }
  return diff;
}

// === COMPONENTS ===

function PageFooter() {
  return (
    <View style={styles.pageFooter} fixed>
      <Text style={styles.pageFooterTxt}>Begehungsprotokoll A00-XYZ03 — AcoManage</Text>
      <Text
        style={styles.pageFooterTxt}
        render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`}
      />
    </View>
  );
}

function RunningHeader({ data }: { data: InspectionData }) {
  return (
    <View style={styles.runHeader} fixed>
      <Text style={styles.runHeaderLeft}>{data.company.name}</Text>
      <Text style={styles.runHeaderMid}>Begehungsprotokoll A00–XYZ03</Text>
      <Text style={styles.runHeaderRight}>
        Stand: {getBegehungStand(data.inspectionDate)} | {formatDate(data.inspectionDate)}
      </Text>
    </View>
  );
}

function InfoHeader({ data }: { data: InspectionData }) {
  const address = buildAddress(data.company);
  const stand = getBegehungStand(data.inspectionDate);
  return (
    <View>
      <View style={styles.titleBlock}>
        <Text style={styles.titleText}>Begehungsprotokoll – Checkliste A00-XYZ03</Text>
        <Text style={styles.titleSub}>
          Arbeitsschutz-Begehung gemäß ASiG und DGUV Vorschrift 2
        </Text>
      </View>

      <View style={styles.infoTable}>
        <View style={styles.infoRow}>
          <View style={[styles.infoCell, { flex: 1.6 }]}>
            <Text style={styles.infoLbl}>Firma:</Text>
            <Text style={[styles.infoVal, { fontSize: 9.5 }]}>{data.company.name}</Text>
          </View>
          <View style={styles.infoCellEnd}>
            <Text style={styles.infoLbl}>Begehung Stand:</Text>
            <Text style={styles.infoStand}>{stand}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={[styles.infoCell, { flex: 1.6 }]}>
            <Text style={styles.infoLbl}>Anschrift:</Text>
            <Text style={styles.infoValSmall}>{address}</Text>
          </View>
          <View style={styles.infoCellEnd}>
            <Text style={styles.infoLbl}>Datum:</Text>
            <Text style={styles.infoValSmall}>{formatDate(data.inspectionDate)}</Text>
          </View>
        </View>
        <View style={styles.infoRowLast}>
          <View style={styles.infoCellFull}>
            <Text style={styles.infoLbl}>Teilnehmer:</Text>
            <Text style={styles.infoValSmall}>{data.attendees || "—"}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function StatusCell({
  status,
  changed,
  isNew,
}: {
  status: string;
  changed: boolean;
  isNew: boolean;
}) {
  const isRed = changed || isNew;
  if (status === "IO") {
    return (
      <Text style={isRed ? [styles.statusJa, styles.red] : styles.statusJa}>JA</Text>
    );
  }
  if (status === "MANGEL") {
    return <Text style={styles.statusNein}>NEIN</Text>;
  }
  if (status === "NICHT_RELEVANT") {
    return <Text style={styles.statusNa}>n/v</Text>;
  }
  return <Text style={styles.statusEmpty}>—</Text>;
}

function RegularSectionRows({
  section,
  checkMap,
  diff,
}: {
  section: TemplateSection;
  checkMap: Map<string, ItemCheck>;
  diff: DiffMap;
}) {
  const visibleItems = section.items.filter((item) => {
    const check = checkMap.get(item.id);
    return !check || check.status !== "NICHT_RELEVANT";
  });

  if (visibleItems.length === 0) return null;

  return (
    <View>
      {/* Section header */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionText}>{section.title}</Text>
      </View>

      {/* Column header */}
      <View style={styles.colHeaderRow}>
        <View style={[styles.cCode, { borderRightWidth: 0 }]}>
          <Text style={styles.colHeaderText}>Code</Text>
        </View>
        <View style={[styles.cLabel, { borderRightWidth: 0 }]}>
          <Text style={[styles.colHeaderText, { textAlign: "left", paddingLeft: 2 }]}>
            Prüfpunkt / Beschreibung
          </Text>
        </View>
        <View style={[styles.cStatus, { borderRightWidth: 0 }]}>
          <Text style={styles.colHeaderText}>Vorhanden</Text>
        </View>
        <View style={[styles.cDate, { borderRightWidth: 0 }]}>
          <Text style={[styles.colHeaderText, { textAlign: "left", paddingLeft: 2 }]}>
            Datum / Bemerkung
          </Text>
        </View>
      </View>

      {/* Item rows */}
      {visibleItems.map((item, idx) => {
        const check = checkMap.get(item.id);
        const d = diff.get(item.id);
        const rowStyle = idx % 2 === 0 ? styles.itemRow : styles.itemRowAlt;

        const lastFmt = formatMonthYear(check?.lastTestDate);
        const nextFmt = formatMonthYear(check?.nextTestDate);
        const dateParts: string[] = [];
        if (lastFmt) dateParts.push(lastFmt);
        if (nextFmt) dateParts.push(`nächste: ${nextFmt}`);
        const dateStr = dateParts.join("  |  ") || "";

        return (
          <View key={item.id} style={rowStyle} wrap={false}>
            <View style={styles.cCode}>
              <Text style={styles.cCodeTxt}>{item.itemKey}</Text>
            </View>
            <View style={styles.cLabel}>
              <Text style={styles.cLabelTxt}>{item.label}</Text>
            </View>
            <View style={styles.cStatus}>
              <StatusCell
                status={check?.status || "UNCHECKED"}
                changed={!!(d?.statusChanged)}
                isNew={!!(d?.isNew)}
              />
            </View>
            <View style={styles.cDate}>
              {dateStr ? (
                <Text style={d?.lastChanged || d?.nextChanged ? styles.redSmall : styles.cDateTxt}>
                  {dateStr}
                </Text>
              ) : (
                <Text style={styles.cDateTxt}> </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PrueflisteSectionRows({
  section,
  checkMap,
  diff,
}: {
  section: TemplateSection;
  checkMap: Map<string, ItemCheck>;
  diff: DiffMap;
}) {
  // Only show items that have data or exist in template
  const visibleItems = section.items.filter((item) => {
    const check = checkMap.get(item.id);
    return !check || check.status !== "NICHT_RELEVANT";
  });

  if (visibleItems.length === 0) return null;

  return (
    <View>
      {/* Section header */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionText}>{section.title}</Text>
      </View>

      {/* Column header */}
      <View style={styles.colHeaderRow}>
        <View style={[styles.mCode, { borderRightWidth: 0 }]}>
          <Text style={styles.colHeaderText}>Code</Text>
        </View>
        <View style={[styles.mLabel, { borderRightWidth: 0 }]}>
          <Text style={[styles.colHeaderText, { textAlign: "left", paddingLeft: 2 }]}>
            Prüfgegenstand
          </Text>
        </View>
        <View style={[styles.mDateCell, { borderRightWidth: 0 }]}>
          <Text style={styles.colHeaderText}>Letzte Prüfung</Text>
        </View>
        <View style={[styles.mDateCellLast]}>
          <Text style={styles.colHeaderText}>Nächste Prüfung</Text>
        </View>
      </View>

      {/* Item rows */}
      {visibleItems.map((item, idx) => {
        const check = checkMap.get(item.id);
        const d = diff.get(item.id);
        const rowStyle = idx % 2 === 0 ? styles.itemRow : styles.itemRowAlt;

        const lastFmt = formatMonthYear(check?.lastTestDate);
        const nextFmt = formatMonthYear(check?.nextTestDate);

        return (
          <View key={item.id} style={rowStyle} wrap={false}>
            <View style={styles.mCode}>
              <Text style={styles.mCodeTxt}>{item.itemKey}</Text>
            </View>
            <View style={styles.mLabel}>
              <Text style={styles.mLabelTxt}>{item.label}</Text>
            </View>
            <View style={styles.mDateCell}>
              <Text style={styles.mDateLbl}>Letzte Prüfung</Text>
              {lastFmt ? (
                <Text style={d?.lastChanged ? [styles.mDateVal, styles.red] : styles.mDateVal}>
                  {lastFmt}
                </Text>
              ) : (
                <Text style={styles.mDateVal}> </Text>
              )}
            </View>
            <View style={styles.mDateCellLast}>
              <Text style={styles.mDateLbl}>Nächste Prüfung</Text>
              {nextFmt ? (
                <Text style={d?.nextChanged ? [styles.mDateVal, styles.red] : styles.mDateVal}>
                  {nextFmt}
                </Text>
              ) : (
                <Text style={styles.mDateVal}> </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const riskLabels: Record<string, string> = {
  NIEDRIG: "Niedrig",
  MITTEL: "Mittel",
  HOCH: "Hoch",
  KRITISCH: "Kritisch",
};

function FindingsSection({ findings }: { findings: FindingData[] }) {
  if (findings.length === 0) return null;
  return (
    <View>
      <View style={styles.findTitle}>
        <Text style={styles.findTitleTxt}>
          Festgestellte Mängel / Maßnahmen ({findings.length})
        </Text>
      </View>
      <View style={styles.findColHeader}>
        <Text style={[styles.findNrCol, { fontSize: F.tiny, fontWeight: "bold" }]}>Nr.</Text>
        <Text style={[styles.findDescCol, { fontSize: F.tiny, fontWeight: "bold" }]}>Mangelbeschreibung</Text>
        <Text style={[styles.findRiskCol, { fontSize: F.tiny, fontWeight: "bold" }]}>Risiko</Text>
        <Text style={[styles.findMeasureCol, { fontSize: F.tiny, fontWeight: "bold" }]}>Maßnahme / Verantwortlich / Termin</Text>
      </View>
      {findings.map((f, idx) => {
        const rowStyle = idx % 2 === 0 ? styles.findRow : styles.findRowAlt;
        const detailParts: string[] = [];
        if (f.measure) detailParts.push(f.measure);
        if (f.responsible) detailParts.push(`Verantw.: ${f.responsible}`);
        if (f.deadline) detailParts.push(`bis: ${formatDate(f.deadline)}`);
        return (
          <View key={f.id} style={rowStyle} wrap={false}>
            <Text style={styles.findNrCol}>{f.findingNumber}.</Text>
            <Text style={styles.findDescCol}>{f.description}</Text>
            <Text style={[styles.findRiskCol, { color: f.riskLevel === "HOCH" || f.riskLevel === "KRITISCH" ? C.red : C.black }]}>
              {f.riskLevel ? (riskLabels[f.riskLevel] || f.riskLevel) : "—"}
            </Text>
            <Text style={styles.findMeasureCol}>{detailParts.join(" | ") || "—"}</Text>
          </View>
        );
      })}
    </View>
  );
}

function DisclaimerAndSignature({ data }: { data: InspectionData }) {
  return (
    <View wrap={false}>
      <View style={styles.disclaimerBlock}>
        <Text style={styles.disclaimerTxt}>
          Bitte beachten Sie, dass bei einer stichprobenartigen Besichtigung nicht alle Mängel
          offenkundig werden müssen. Es bleibt in der Verantwortung der Führungskräfte und
          Mitarbeitenden, alles Erforderliche zur Vermeidung von Arbeitsunfällen,
          Berufserkrankungen und arbeitsbedingten Gesundheitsgefahren zu unternehmen.
          Alle genannten Maßnahmen sind als Empfehlungen zu verstehen und sind an die
          betrieblichen Gegebenheiten anzupassen.
        </Text>
      </View>
      <View style={styles.sigRow}>
        <View style={styles.sigBox}>
          <View style={styles.sigLine} />
          <Text style={styles.sigLbl}>Ort, Datum</Text>
        </View>
        <View style={styles.sigBox}>
          <View style={styles.sigLine} />
          <Text style={styles.sigLbl}>Fachkraft für Arbeitssicherheit</Text>
          <Text style={styles.sigName}>
            {data.inspector.firstName} {data.inspector.lastName}
          </Text>
        </View>
      </View>
      <View style={[styles.sigRow, { marginTop: 14 }]}>
        <View style={styles.sigBox}>
          <View style={styles.sigLine} />
          <Text style={styles.sigLbl}>Arbeitgeber / Vertreter</Text>
        </View>
        <View style={styles.sigBox}>
          <View style={styles.sigLine} />
          <Text style={styles.sigLbl}>Datum Kenntnisnahme</Text>
        </View>
      </View>
    </View>
  );
}

// === MAIN DOCUMENT ===

function InspectionDocument({
  data,
  prevChecks,
}: {
  data: InspectionData;
  prevChecks?: PrevItemCheck[];
}) {
  const checkMap = new Map<string, ItemCheck>();
  for (const c of data.itemChecks || []) {
    checkMap.set(c.templateItemId, c);
  }

  const diff = buildDiffMap(data.itemChecks, prevChecks);

  const hasSections = !!data.template?.sections?.length;
  const sections = data.template?.sections || [];

  return (
    <Document
      title={`Begehungsprotokoll ${getBegehungStand(data.inspectionDate)} – ${data.company.name}`}
      author="AcoManage"
      subject="Begehungsprotokoll A00-XYZ03"
    >
      <Page size="A4" style={styles.page}>
        <PageFooter />
        <RunningHeader data={data} />
        <InfoHeader data={data} />

        {hasSections && (
          <View style={styles.table}>
            {sections.map((section) => {
              if (isPrueflisteSection(section.sectionCode)) {
                return (
                  <PrueflisteSectionRows
                    key={section.id}
                    section={section}
                    checkMap={checkMap}
                    diff={diff}
                  />
                );
              }
              return (
                <RegularSectionRows
                  key={section.id}
                  section={section}
                  checkMap={checkMap}
                  diff={diff}
                />
              );
            })}
          </View>
        )}

        {data.generalNotes && (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLbl}>Allgemeine Anmerkungen</Text>
            <Text style={styles.notesTxt}>{data.generalNotes}</Text>
          </View>
        )}

        <FindingsSection findings={data.findings} />
        <DisclaimerAndSignature data={data} />
      </Page>
    </Document>
  );
}

// === EXPORT ===

export async function renderInspectionReport(
  data: InspectionData,
  prevChecks?: PrevItemCheck[]
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <InspectionDocument data={data} prevChecks={prevChecks} />
  );
  return Buffer.from(buffer);
}
