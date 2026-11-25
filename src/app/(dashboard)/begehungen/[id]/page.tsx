"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  CheckCircle2,
  Camera,
  Save,
  FileDown,
  Minus,
  X,
  ImageIcon,
  Trash2,
  ClipboardList,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ChecklistItemRow,
  type CheckPatch,
  type CheckValues,
} from "@/components/inspections/checklist-item-row";
import { QuickEntryDialog } from "@/components/inspections/quick-entry-dialog";
import { ReportCard } from "@/components/inspections/report-card";
import {
  WordExportSummaryDialog,
  type WordExportSummary,
} from "@/components/inspections/word-export-summary";

interface TemplateItem {
  id: string;
  itemKey: string;
  label: string;
  description: string | null;
  legalReference: string | null;
  suggestedMeasure: string | null;
  defaultRiskLevel: string | null;
  sortOrder: number;
}

interface TemplateSection {
  id: string;
  sectionCode: string;
  title: string;
  items: TemplateItem[];
}

interface Finding {
  id: string;
  findingNumber: number;
  description: string;
  riskLevel: string | null;
  measure: string | null;
  responsible: string | null;
  deadline: string | null;
  status: string;
  section: { title: string; sectionCode: string } | null;
  templateItem: { label: string; itemKey: string } | null;
  photos: { id: string; filePath: string; caption: string | null }[];
}

interface ItemCheck {
  id: string;
  templateItemId: string;
  status: "UNCHECKED" | "IO" | "MANGEL" | "NICHT_RELEVANT";
  note: string | null;
  checkedAt: string | null;
  lastTestDate: string | null;
  nextTestDate: string | null;
}

interface InspectionData {
  id: string;
  inspectionNumber: string;
  inspectionDate: string;
  inspectionType: string;
  status: string;
  attendees: string | null;
  generalNotes: string | null;
  company: { id: string; name: string; city: string | null };
  inspector: { firstName: string; lastName: string };
  template: {
    sections: TemplateSection[];
  } | null;
  findings: Finding[];
  photos: { id: string; filePath: string; caption: string | null }[];
  itemChecks: ItemCheck[];
  reportFileName: string | null;
  reportSource: string | null;
  reportUpdatedAt: string | null;
  previousInspection: {
    id: string;
    inspectionNumber: string | null;
    inspectionDate: string;
    itemChecks: (CheckValues & { templateItemId: string })[];
  } | null;
}

const riskLevelOptions = [
  { value: "NIEDRIG", label: "Niedrig", color: "bg-green-500" },
  { value: "MITTEL", label: "Mittel", color: "bg-yellow-500" },
  { value: "HOCH", label: "Hoch", color: "bg-orange-500" },
  { value: "KRITISCH", label: "Kritisch", color: "bg-red-500" },
];

const statusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  IN_PROGRESS: "In Bearbeitung",
  COMPLETED: "Abgeschlossen",
  SENT: "Versendet",
};

const typeLabels: Record<string, string> = {
  INITIAL: "Erstbegehung",
  REGULAR: "Regelbegehung",
  FOLLOWUP: "Nachkontrolle",
  SPECIAL: "Sonderbegehung",
};

export default function BegehungDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [findingDialogOpen, setFindingDialogOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxSeconds, setDocxSeconds] = useState(0);
  const [docxSummary, setDocxSummary] = useState<WordExportSummary | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [findingSaving, setFindingSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pending photos for finding dialog
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);

  const [filter, setFilter] = useState<"all" | "open" | "mangel">("all");
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [quickEntrySummary, setQuickEntrySummary] = useState<string | null>(null);

  // New finding form state
  const [newFinding, setNewFinding] = useState({
    sectionId: "",
    templateItemId: "",
    description: "",
    riskLevel: "",
    measure: "",
    responsible: "",
    deadline: "",
  });

  const fetchInspection = useCallback(async () => {
    try {
      const res = await fetch(`/api/inspections/${params.id}`);
      if (!res.ok) throw new Error("Nicht gefunden");
      const data = await res.json();
      setInspection(data);
    } catch {
      router.push("/begehungen");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  const handleAddFinding = async () => {
    if (!newFinding.description) return;
    setFindingSaving(true);
    try {
      const res = await fetch(`/api/inspections/${params.id}/findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newFinding,
          sectionId: newFinding.sectionId || null,
          templateItemId: newFinding.templateItemId || null,
          riskLevel: newFinding.riskLevel || null,
        }),
      });
      if (res.ok) {
        const finding = await res.json();
        // Upload pending photos
        for (const file of pendingPhotos) {
          const formData = new FormData();
          formData.append("photo", file);
          formData.append("findingId", finding.id);
          await fetch(`/api/inspections/${params.id}/photos`, {
            method: "POST",
            body: formData,
          });
        }
        setFindingDialogOpen(false);
        setNewFinding({
          sectionId: "",
          templateItemId: "",
          description: "",
          riskLevel: "",
          measure: "",
          responsible: "",
          deadline: "",
        });
        setPendingPhotos([]);
        fetchInspection();
      }
    } catch (error) {
      console.error("Error adding finding:", error);
    } finally {
      setFindingSaving(false);
    }
  };

  // Saves one checklist line. The server may turn JA into NEIN (overdue test date) and add a finding.
  const saveCheck = async (templateItemId: string, patch: CheckPatch) => {
    const current = inspection?.itemChecks.find((ic) => ic.templateItemId === templateItemId);
    const status = patch.status ?? current?.status ?? "UNCHECKED";
    // Leaving NEIN with findings attached: they would stay in the report, so ask to remove them
    let removeFindings = false;
    const itemKey = inspection?.template?.sections.flatMap((s) => s.items).find((i) => i.id === templateItemId)?.itemKey;
    const itemFindingCount = inspection?.findings.filter((f) => itemKey && f.templateItem?.itemKey === itemKey).length ?? 0;
    if (patch.status && patch.status !== "MANGEL" && current?.status === "MANGEL" && itemFindingCount > 0) {
      if (
        !confirm(
          `Mangel behoben? ${itemFindingCount === 1 ? "Der Befund" : `Die ${itemFindingCount} Befunde`} zu diesem Punkt ${itemFindingCount === 1 ? "wird" : "werden"} gelöscht.`
        )
      )
        return;
      removeFindings = true;
    }
    try {
      const res = await fetch(`/api/inspections/${params.id}/item-checks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateItemId, ...patch, status, removeFindings }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Fehler beim Speichern");
        return;
      }
      if (data.findingCreated || data.removedFindings) {
        fetchInspection();
        return;
      }
      setInspection((prev) => {
        if (!prev) return prev;
        const rest = prev.itemChecks.filter((ic) => ic.templateItemId !== templateItemId);
        return { ...prev, itemChecks: [...rest, data] };
      });
    } catch (error) {
      console.error("Error saving item check:", error);
      alert("Fehler beim Speichern");
    }
  };


  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    findingId?: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      if (findingId) formData.append("findingId", findingId);
      const res = await fetch(`/api/inspections/${params.id}/photos`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) fetchInspection();
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  const handlePhotoDelete = async (photoId: string) => {
    if (!confirm("Foto wirklich löschen?")) return;
    try {
      const res = await fetch(
        `/api/inspections/${params.id}/photos/${photoId}`,
        { method: "DELETE" }
      );
      if (res.ok) fetchInspection();
    } catch (error) {
      console.error("Error deleting photo:", error);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      const res = await fetch(`/api/inspections/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchInspection();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Begehung wirklich löschen? Alle Befunde und Fotos werden unwiderruflich gelöscht.")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/inspections/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/begehungen");
      } else {
        const data = await res.json();
        alert(data.error || "Fehler beim Löschen");
      }
    } catch (error) {
      console.error("Error deleting inspection:", error);
      alert("Fehler beim Löschen der Begehung");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/inspections/${params.id}/pdf`);
      if (!res.ok) throw new Error("PDF-Fehler");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ||
        "Begehungsbericht.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Fehler beim Generieren des PDF-Berichts");
    } finally {
      setPdfLoading(false);
    }
  };

  // Word export runs as a background job on the server (takes minutes); poll until done.
  const handleDownloadDocx = async () => {
    setDocxLoading(true);
    setDocxSeconds(0);
    try {
      const start = await fetch(`/api/inspections/${params.id}/docx`, { method: "POST" });
      const started = await start.json().catch(() => null);
      if (!start.ok || !started?.jobId) throw new Error(started?.error || `Fehler ${start.status}`);
      const jobUrl = `/api/inspections/${params.id}/docx?job=${started.jobId}`;
      let failures = 0;
      for (;;) {
        await new Promise((r) => setTimeout(r, 3000));
        let job;
        try {
          const res = await fetch(jobUrl, { cache: "no-store" });
          job = await res.json();
          if (!res.ok) throw new Error(job?.error || `Fehler ${res.status}`);
          failures = 0;
        } catch (err) {
          if (++failures >= 5) throw err;
          continue;
        }
        if (job.status === "running") {
          setDocxSeconds(job.seconds);
          continue;
        }
        if (job.status === "error") throw new Error(job.error);
        const a = document.createElement("a");
        a.href = `${jobUrl}&download=1`;
        a.download = job.filename || "Begehungsbericht.docx";
        a.click();
        setDocxSummary(job.summary);
        fetchInspection();
        break;
      }
    } catch (error) {
      console.error("Error generating DOCX:", error);
      alert(`Fehler beim Erstellen des Word-Berichts: ${error instanceof Error ? error.message : error}`);
    } finally {
      setDocxLoading(false);
    }
  };

  const openFindingForItem = (sectionId: string, item: TemplateItem) => {
    setNewFinding({
      sectionId,
      templateItemId: item.id,
      description: item.label,
      riskLevel: item.defaultRiskLevel || "",
      measure: item.suggestedMeasure || "",
      responsible: "",
      deadline: "",
    });
    setPendingPhotos([]);
    setFindingDialogOpen(true);
  };

  if (loading || !inspection) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sections = inspection.template?.sections || [];
  const isEditable =
    inspection.status === "DRAFT" || inspection.status === "IN_PROGRESS";

  // Build itemCheck lookup
  const itemCheckMap = new Map<string, ItemCheck>();
  for (const ic of inspection.itemChecks || []) {
    itemCheckMap.set(ic.templateItemId, ic);
  }
  const previousCheckMap = new Map<string, CheckValues>();
  for (const ic of inspection.previousInspection?.itemChecks || []) {
    previousCheckMap.set(ic.templateItemId, ic);
  }
  const matchesFilter = (item: TemplateItem) => {
    const st = itemCheckMap.get(item.id)?.status ?? "UNCHECKED";
    if (filter === "open") return st === "UNCHECKED";
    if (filter === "mangel") return st === "MANGEL";
    return true;
  };

  // Group findings by template item
  const findingsByItemKey: Record<string, Finding[]> = {};
  const findingsBySection: Record<string, Finding[]> = {};
  for (const finding of inspection.findings) {
    if (finding.templateItem?.itemKey) {
      if (!findingsByItemKey[finding.templateItem.itemKey])
        findingsByItemKey[finding.templateItem.itemKey] = [];
      findingsByItemKey[finding.templateItem.itemKey].push(finding);
    }
    const key = finding.section?.sectionCode || "SONSTIG";
    if (!findingsBySection[key]) findingsBySection[key] = [];
    findingsBySection[key].push(finding);
  }

  // Calculate progress — NICHT_RELEVANT items count as "done" but reduce total display
  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const nichtRelevantItems = (inspection.itemChecks || []).filter(
    (ic) => ic.status === "NICHT_RELEVANT"
  ).length;
  const relevantItems = totalItems - nichtRelevantItems;
  const checkedItems = (inspection.itemChecks || []).filter(
    (ic) => ic.status === "IO" || ic.status === "MANGEL"
  ).length;
  const mangelItems = (inspection.itemChecks || []).filter((ic) => ic.status === "MANGEL").length;
  const openItems = totalItems - nichtRelevantItems - checkedItems;
  const progressPercent = relevantItems > 0 ? Math.round((checkedItems / relevantItems) * 100) : 0;

  const PhotoThumbnail = ({
    photo,
    onDelete,
    size = "md",
  }: {
    photo: { id: string; filePath: string; caption: string | null };
    onDelete?: () => void;
    size?: "sm" | "md";
  }) => {
    const sizeClass = size === "sm" ? "h-16 w-16" : "h-20 w-20";
    return (
      <div className={`relative group ${sizeClass}`}>
        <img
          src={`/api/uploads/${photo.filePath.replace(/^uploads\//, "")}`}
          alt={photo.caption || "Foto"}
          className={`${sizeClass} rounded border object-cover cursor-pointer`}
          onClick={() =>
            setLightboxPhoto(
              `/api/uploads/${photo.filePath.replace(/^uploads\//, "")}`
            )
          }
        />
        {onDelete && isEditable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/begehungen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {inspection.company.name}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{inspection.inspectionNumber}</span>
            <Badge variant="outline">
              {typeLabels[inspection.inspectionType]}
            </Badge>
            <span>
              {new Date(inspection.inspectionDate).toLocaleDateString("de-DE")}
            </span>
            <Badge>{statusLabels[inspection.status]}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditable && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Löschen
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDownloadDocx}
            disabled={docxLoading}
          >
            {docxLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Bericht wird abgeglichen… {Math.floor(docxSeconds / 60)}:{String(docxSeconds % 60).padStart(2, "0")}
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Word
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            PDF
          </Button>
          {isEditable && (
            <>
              <Button
                variant="outline"
                onClick={() => handleStatusChange("IN_PROGRESS")}
                disabled={inspection.status === "IN_PROGRESS"}
              >
                <Save className="mr-2 h-4 w-4" />
                In Bearbeitung
              </Button>
              <Button onClick={() => handleStatusChange("COMPLETED")}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Abschließen
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{inspection.findings.length}</p>
            <p className="text-xs text-muted-foreground">Befunde gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-red-600">
              {
                inspection.findings.filter(
                  (f) => f.riskLevel === "KRITISCH" || f.riskLevel === "HOCH"
                ).length
              }
            </p>
            <p className="text-xs text-muted-foreground">Hoch/Kritisch</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-yellow-600">
              {inspection.findings.filter((f) => f.riskLevel === "MITTEL").length}
            </p>
            <p className="text-xs text-muted-foreground">Mittel</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{inspection.photos.length}</p>
            <p className="text-xs text-muted-foreground">Fotos</p>
          </CardContent>
        </Card>
      </div>

      <ReportCard
        inspectionId={inspection.id}
        fileName={inspection.reportFileName}
        source={inspection.reportSource}
        updatedAt={inspection.reportUpdatedAt}
        canEdit
        onChanged={fetchInspection}
      />

      {/* Progress bar */}
      {totalItems > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Checkliste</span>
            <span>
              {checkedItems} / {relevantItems} geprüft ({progressPercent}%)
              {nichtRelevantItems > 0 && (
                <span className="ml-1 text-xs">· {nichtRelevantItems} n.r.</span>
              )}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {/* Tabs: Checklist / Findings / Info */}
      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist">Checkliste</TabsTrigger>
          <TabsTrigger value="findings">
            Befunde ({inspection.findings.length})
          </TabsTrigger>
          <TabsTrigger value="info">Informationen</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["all", `Alle (${totalItems})`],
                ["open", `Offen (${openItems})`],
                ["mangel", `Mängel (${mangelItems})`],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={filter === value ? "default" : "outline"}
                className="h-9"
                onClick={() => setFilter(value)}
              >
                {label}
              </Button>
            ))}
            {isEditable && (
              <Button size="sm" variant="secondary" className="h-9" onClick={() => setQuickEntryOpen(true)}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Schnellerfassung Prüfdaten
              </Button>
            )}
            {inspection.previousInspection && (
              <span className="text-xs text-muted-foreground sm:ml-auto">
                Vorbelegt aus {inspection.previousInspection.inspectionNumber || "letzter Begehung"} vom{" "}
                {new Date(inspection.previousInspection.inspectionDate).toLocaleDateString("de-DE")}: alle Antworten
                und Befunde übernommen, nur Änderungen antippen.
              </span>
            )}
          </div>

          {quickEntrySummary && (
            <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-950/20 dark:text-blue-200">
              <span>Schnellerfassung: {quickEntrySummary}</span>
              <button onClick={() => setQuickEntrySummary(null)} aria-label="Hinweis schließen">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {sections.map((section) => {
            const sectionItems = section.items;
            if (filter !== "all" && !sectionItems.some(matchesFilter)) return null;
            const sectionNR = sectionItems.filter((item) => {
              const check = itemCheckMap.get(item.id);
              return check?.status === "NICHT_RELEVANT";
            }).length;
            const sectionRelevant = sectionItems.length - sectionNR;
            const sectionChecked = sectionItems.filter((item) => {
              const check = itemCheckMap.get(item.id);
              return check && (check.status === "IO" || check.status === "MANGEL");
            }).length;
            const sectionFindings = findingsBySection[section.sectionCode] || [];

            return (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {section.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {sectionChecked}/{sectionRelevant}
                        {sectionNR > 0 && ` (${sectionNR} n.r.)`}
                      </span>
                      {sectionFindings.length > 0 && (
                        <Badge variant="destructive">
                          {sectionFindings.length} Befunde
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sectionItems.filter(matchesFilter).map((item) => {
                      const itemFindings = findingsByItemKey[item.itemKey] || [];
                      return (
                        <ChecklistItemRow
                          key={item.id}
                          item={item}
                          check={itemCheckMap.get(item.id)}
                          previous={previousCheckMap.get(item.id)}
                          inspectionDate={inspection.inspectionDate}
                          isEditable={isEditable}
                          findingCount={itemFindings.length}
                          onSave={(patch) => saveCheck(item.id, patch)}
                          onNein={async () => {
                            await saveCheck(item.id, { status: "MANGEL" });
                            if (itemFindings.length === 0) openFindingForItem(section.id, item);
                          }}
                          onAddFinding={() => openFindingForItem(section.id, item)}
                        >
                          {itemFindings.map((f) => (
                            <div key={f.id} className="mt-2 text-sm border-l-2 border-yellow-400 pl-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-yellow-700">#{f.findingNumber}</span>
                                <p className="flex-1">{f.description}</p>
                              </div>
                              {f.measure && (
                                <p className="text-xs text-muted-foreground mt-1">Maßnahme: {f.measure}</p>
                              )}
                              {f.riskLevel && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {f.riskLevel}
                                </Badge>
                              )}
                              {f.photos.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {f.photos.map((photo) => (
                                    <PhotoThumbnail
                                      key={photo.id}
                                      photo={photo}
                                      onDelete={() => handlePhotoDelete(photo.id)}
                                      size="sm"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </ChecklistItemRow>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {isEditable && (
            <Button
              variant="outline"
              onClick={() => {
                setNewFinding({
                  sectionId: "",
                  templateItemId: "",
                  description: "",
                  riskLevel: "",
                  measure: "",
                  responsible: "",
                  deadline: "",
                });
                setPendingPhotos([]);
                setFindingDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Allgemeinen Befund hinzufügen
            </Button>
          )}
        </TabsContent>

        <TabsContent value="findings" className="space-y-4 mt-4">
          {inspection.findings.length > 0 ? (
            inspection.findings.map((finding) => (
              <Card key={finding.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          #{finding.findingNumber}
                        </Badge>
                        {finding.riskLevel && (
                          <Badge
                            className={
                              finding.riskLevel === "KRITISCH"
                                ? "bg-red-500"
                                : finding.riskLevel === "HOCH"
                                ? "bg-orange-500"
                                : finding.riskLevel === "MITTEL"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }
                          >
                            {finding.riskLevel}
                          </Badge>
                        )}
                        {finding.section && (
                          <Badge variant="secondary">
                            {finding.section.title}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{finding.description}</p>
                      {finding.measure && (
                        <p className="text-sm mt-2">
                          <span className="font-medium">Maßnahme:</span>{" "}
                          {finding.measure}
                        </p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {finding.responsible && (
                          <span>Verantwortlich: {finding.responsible}</span>
                        )}
                        {finding.deadline && (
                          <span>
                            Frist:{" "}
                            {new Date(finding.deadline).toLocaleDateString("de-DE")}
                          </span>
                        )}
                      </div>
                    </div>
                    {isEditable && (
                      <label className="cursor-pointer shrink-0 ml-2">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, finding.id)}
                          disabled={photoUploading}
                        />
                        <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border rounded px-2 py-1">
                          <Camera className="h-4 w-4" />
                          Foto
                        </div>
                      </label>
                    )}
                  </div>
                  {finding.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {finding.photos.map((photo) => (
                        <PhotoThumbnail
                          key={photo.id}
                          photo={photo}
                          onDelete={() => handlePhotoDelete(photo.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Minus className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  Noch keine Befunde erfasst.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="info" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Begehungsdetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Betrieb</p>
                  <p className="text-muted-foreground">
                    {inspection.company.name}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Nummer</p>
                  <p className="text-muted-foreground">
                    {inspection.inspectionNumber}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Art</p>
                  <p className="text-muted-foreground">
                    {typeLabels[inspection.inspectionType]}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Datum</p>
                  <p className="text-muted-foreground">
                    {new Date(inspection.inspectionDate).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Prüfer</p>
                  <p className="text-muted-foreground">
                    {inspection.inspector.firstName}{" "}
                    {inspection.inspector.lastName}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-muted-foreground">
                    {statusLabels[inspection.status]}
                  </p>
                </div>
              </div>
              {inspection.attendees && (
                <div>
                  <p className="font-medium">Teilnehmer</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {inspection.attendees}
                  </p>
                </div>
              )}
              {inspection.generalNotes && (
                <div>
                  <p className="font-medium">Anmerkungen</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {inspection.generalNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* General Photos */}
          <Card>
            <CardHeader>
              <CardTitle>Allgemeine Fotos</CardTitle>
            </CardHeader>
            <CardContent>
              {inspection.photos.filter((p) => !inspection.findings.some((f) => f.photos.some((fp) => fp.id === p.id))).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {inspection.photos
                    .filter((p) => !inspection.findings.some((f) => f.photos.some((fp) => fp.id === p.id)))
                    .map((photo) => (
                      <PhotoThumbnail
                        key={photo.id}
                        photo={photo}
                        onDelete={() => handlePhotoDelete(photo.id)}
                        size="md"
                      />
                    ))}
                </div>
              )}
              {isEditable && (
                <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:bg-accent/50 transition-colors">
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {photoUploading
                      ? "Wird hochgeladen..."
                      : "Foto aufnehmen oder hochladen"}
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e)}
                    disabled={photoUploading}
                  />
                </label>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Finding Dialog */}
      <Dialog open={findingDialogOpen} onOpenChange={(open) => {
        setFindingDialogOpen(open);
        if (!open) setPendingPhotos([]);
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Befund erfassen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Beschreibung <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={newFinding.description}
                onChange={(e) =>
                  setNewFinding({ ...newFinding, description: e.target.value })
                }
                placeholder="Beschreiben Sie den Mangel oder Befund..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Risikobewertung</Label>
              <div className="flex gap-2">
                {riskLevelOptions.map((rl) => (
                  <Button
                    key={rl.value}
                    type="button"
                    variant={
                      newFinding.riskLevel === rl.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setNewFinding({ ...newFinding, riskLevel: rl.value })
                    }
                  >
                    <div
                      className={`mr-1 h-2 w-2 rounded-full ${rl.color}`}
                    />
                    {rl.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Maßnahme</Label>
              <Textarea
                value={newFinding.measure}
                onChange={(e) =>
                  setNewFinding({ ...newFinding, measure: e.target.value })
                }
                placeholder="Welche Maßnahme ist erforderlich?"
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Verantwortlich</Label>
                <Input
                  value={newFinding.responsible}
                  onChange={(e) =>
                    setNewFinding({
                      ...newFinding,
                      responsible: e.target.value,
                    })
                  }
                  placeholder="Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Frist</Label>
                <Input
                  type="date"
                  value={newFinding.deadline}
                  onChange={(e) =>
                    setNewFinding({
                      ...newFinding,
                      deadline: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Photo upload in dialog */}
            <div className="space-y-2">
              <Label>Fotos</Label>
              <div className="flex flex-wrap gap-2">
                {pendingPhotos.map((file, idx) => (
                  <div key={idx} className="relative group h-16 w-16">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Foto ${idx + 1}`}
                      className="h-16 w-16 rounded border object-cover"
                    />
                    <button
                      onClick={() => setPendingPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="h-16 w-16 flex flex-col items-center justify-center rounded border-2 border-dashed cursor-pointer hover:bg-accent/50 transition-colors">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPendingPhotos((prev) => [...prev, file]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            {sections.length > 0 && !newFinding.sectionId && (
              <div className="space-y-2">
                <Label>Bereich (optional)</Label>
                <Select
                  value={newFinding.sectionId || "__none__"}
                  onValueChange={(v) =>
                    setNewFinding({
                      ...newFinding,
                      sectionId: v === "__none__" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bereich wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Kein Bereich</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFindingDialogOpen(false);
                setPendingPhotos([]);
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAddFinding}
              disabled={!newFinding.description || findingSaving}
            >
              {findingSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {findingSaving ? "Wird gespeichert..." : "Befund speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isEditable && (
        <QuickEntryDialog
          open={quickEntryOpen}
          onOpenChange={setQuickEntryOpen}
          inspectionId={inspection.id}
          inspectionDate={inspection.inspectionDate}
          generalNotes={inspection.generalNotes}
          items={sections.flatMap((s) => s.items)}
          statuses={Object.fromEntries(inspection.itemChecks.map((ic) => [ic.templateItemId, ic.status]))}
          onDone={(summary) => {
            setQuickEntrySummary(summary);
            fetchInspection();
          }}
        />
      )}

      <WordExportSummaryDialog summary={docxSummary} onClose={() => setDocxSummary(null)} />

      {/* Photo Lightbox */}
      <Dialog
        open={!!lightboxPhoto}
        onOpenChange={() => setLightboxPhoto(null)}
      >
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          {lightboxPhoto && (
            <img
              src={lightboxPhoto}
              alt="Foto"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
