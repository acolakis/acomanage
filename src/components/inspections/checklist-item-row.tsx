"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Ban, Check, History, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OptionalDateInput } from "./optional-date-input";

export type CheckStatus = "UNCHECKED" | "IO" | "MANGEL" | "NICHT_RELEVANT";

export interface ChecklistItemData {
  id: string;
  itemKey: string;
  label: string;
  legalReference: string | null;
}

export interface CheckValues {
  status: CheckStatus;
  /** null for values carried over from last year that nobody has confirmed yet */
  checkedAt?: string | null;
  note: string | null;
  lastTestDate: string | null;
  nextTestDate: string | null;
}

export interface CheckPatch {
  status?: CheckStatus;
  note?: string | null;
  lastTestDate?: string | null;
  nextTestDate?: string | null;
}

const day = (d: string | null | undefined) => (d ? d.slice(0, 10) : "");
const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("de-DE") : "");
const statusText: Record<CheckStatus, string> = {
  IO: "JA",
  MANGEL: "NEIN",
  NICHT_RELEVANT: "n.r.",
  UNCHECKED: "offen",
};

/**
 * One line of the paper checklist (A00–XYZ03): JA / NEIN / n.r., "Aktuell/Datum",
 * next test date and name/remark – sized for touch input on a tablet.
 * Text and date fields save on blur.
 */
export function ChecklistItemRow({
  item,
  check,
  previous,
  inspectionDate,
  isEditable,
  findingCount,
  onSave,
  onNein,
  onAddFinding,
  children,
}: {
  item: ChecklistItemData;
  check: CheckValues | undefined;
  previous: CheckValues | undefined;
  inspectionDate: string;
  isEditable: boolean;
  findingCount: number;
  onSave: (patch: CheckPatch) => void;
  onNein: () => void;
  onAddFinding: () => void;
  children?: React.ReactNode;
}) {
  const status = check?.status ?? "UNCHECKED";
  const isNR = status === "NICHT_RELEVANT";

  const [note, setNote] = useState(check?.note ?? "");
  const [last, setLast] = useState(day(check?.lastTestDate));
  const [next, setNext] = useState(day(check?.nextTestDate));
  useEffect(() => setNote(check?.note ?? ""), [check?.note]);
  useEffect(() => setLast(day(check?.lastTestDate)), [check?.lastTestDate]);
  useEffect(() => setNext(day(check?.nextTestDate)), [check?.nextTestDate]);

  const overdue = !!next && next < day(inspectionDate);
  // Carried over from last year and not touched yet (status preselected or values copied)
  const carriedOver =
    !!previous &&
    !!check &&
    !check.checkedAt &&
    (status !== "UNCHECKED" || !!(check.note || check.lastTestDate || check.nextTestDate));

  const saveField = (field: "note" | "lastTestDate" | "nextTestDate", value: string) => {
    const stored = field === "note" ? check?.note ?? "" : day(check?.[field]);
    if (value.trim() === stored) return;
    onSave({ [field]: value.trim() || null });
  };

  const rowColor = isNR
    ? "border-gray-200 bg-gray-50 opacity-60 dark:bg-gray-950/20"
    : status === "IO"
    ? "border-green-300 bg-green-50 dark:bg-green-950/20"
    : status === "MANGEL"
    ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20"
    : "";

  const prevSummary = previous
    ? [
        statusText[previous.status],
        previous.lastTestDate && `Datum ${fmt(previous.lastTestDate)}`,
        previous.nextTestDate && `nächste ${fmt(previous.nextTestDate)}`,
        previous.note,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div className={`rounded-md border p-3 ${rowColor}`} id={`item-${item.itemKey}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${isNR ? "line-through text-muted-foreground" : ""}`}>
            {item.label}
          </p>
          {item.legalReference && !isNR && (
            <p className="text-xs text-muted-foreground">{item.legalReference}</p>
          )}
        </div>

        {isEditable ? (
          <div className="flex shrink-0 gap-1.5">
            <StatusButton
              active={status === "IO"}
              activeClass="bg-green-600 text-white border-green-600"
              onClick={() => onSave({ status: status === "IO" ? "UNCHECKED" : "IO" })}
            >
              <Check className="h-4 w-4" /> JA
            </StatusButton>
            <StatusButton
              active={status === "MANGEL"}
              activeClass="bg-yellow-500 text-white border-yellow-500"
              onClick={() => (status === "MANGEL" ? onSave({ status: "UNCHECKED" }) : onNein())}
            >
              <X className="h-4 w-4" /> NEIN
            </StatusButton>
            <StatusButton
              active={isNR}
              activeClass="bg-gray-500 text-white border-gray-500"
              onClick={() => onSave({ status: isNR ? "UNCHECKED" : "NICHT_RELEVANT" })}
            >
              <Ban className="h-4 w-4" /> n.r.
            </StatusButton>
          </div>
        ) : (
          <span className="shrink-0 text-sm font-medium">{statusText[status]}</span>
        )}
      </div>

      {!isNR && (
        <>
          {isEditable ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-[9.5rem_9.5rem_1fr]">
              <FieldLabel label="Datum / Aktuell">
                <OptionalDateInput
                  className="h-10"
                  value={last}
                  onChange={setLast}
                  onCommit={(v) => saveField("lastTestDate", v)}
                />
              </FieldLabel>
              <FieldLabel label="Nächste Prüfung">
                <OptionalDateInput
                  className="h-10"
                  invalid={overdue}
                  value={next}
                  onChange={setNext}
                  onCommit={(v) => saveField("nextTestDate", v)}
                />
              </FieldLabel>
              <FieldLabel label="Name / Bemerkung">
                <Input
                  className="h-10"
                  value={note}
                  placeholder="z. B. befähigte Person, „alte Adresse“"
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={() => saveField("note", note)}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                />
              </FieldLabel>
            </div>
          ) : (
            (check?.lastTestDate || check?.nextTestDate || check?.note) && (
              <p className="mt-1 text-xs text-foreground/80">
                {[
                  check?.lastTestDate && `Datum ${fmt(check.lastTestDate)}`,
                  check?.nextTestDate && `nächste Prüfung ${fmt(check.nextTestDate)}`,
                  check?.note,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {overdue && (
              <span className="flex items-center gap-1 font-medium text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Prüftermin überfällig, JA wird automatisch zum Mangel
              </span>
            )}
            {prevSummary && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                Vorjahr: {prevSummary}
                {carriedOver && (
                  <span className="text-blue-600">
                    {status === "MANGEL" ? "(Mangel aus Vorjahr übernommen – noch vorhanden?)" : "(aus Vorjahr übernommen)"}
                  </span>
                )}
              </span>
            )}
            {isEditable && status === "MANGEL" && findingCount > 0 && (
              <button onClick={onAddFinding} className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                <Plus className="h-3 w-3" />
                Weiteren Befund
              </button>
            )}
          </div>

          {children}
        </>
      )}
    </div>
  );
}

function StatusButton({
  active,
  activeClass,
  onClick,
  children,
}: {
  active: boolean;
  activeClass: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 min-w-[4.5rem] items-center justify-center gap-1 rounded-md border px-3 text-sm font-semibold transition-colors ${
        active ? activeClass : "bg-background hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
