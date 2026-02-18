"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Minus,
  Camera,
  Save,
  FileDown,
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

interface TemplateItem {
  id: string;
  itemKey: string;
  label: string;
  description: string | null;
  legalReference: string | null;
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
        fetchInspection();
      }
    } catch (error) {
      console.error("Error adding finding:", error);
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

  const openFindingForSection = (sectionId: string, itemId?: string) => {
    setNewFinding({
      ...newFinding,
      sectionId,
      templateItemId: itemId || "",
      description: "",
      riskLevel: "",
      measure: "",
      responsible: "",
      deadline: "",
    });
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

  // Group findings by section
  const findingsBySection: Record<string, Finding[]> = {};
  for (const finding of inspection.findings) {
    const key = finding.section?.sectionCode || "SONSTIG";
    if (!findingsBySection[key]) findingsBySection[key] = [];
    findingsBySection[key].push(finding);
  }

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
              <Button
                onClick={() => handleStatusChange("COMPLETED")}
              >
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
              {
                inspection.findings.filter((f) => f.riskLevel === "MITTEL")
                  .length
              }
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
          {sections.map((section) => {
            const sectionFindings = findingsBySection[section.sectionCode] || [];
            return (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {section.title}
                    </CardTitle>
                    {sectionFindings.length > 0 && (
                      <Badge variant="destructive">
                        {sectionFindings.length} Befunde
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {section.items.map((item) => {
                      const itemFindings = sectionFindings.filter(
                        (f) => f.templateItem?.itemKey === item.itemKey
                      );
                      const hasIssue = itemFindings.length > 0;

                      return (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3 rounded-md border p-3 ${
                            hasIssue
                              ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20"
                              : ""
                          }`}
                        >
                          <div className="mt-0.5">
                            {hasIssue ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{item.label}</p>
                            {item.legalReference && (
                              <p className="text-xs text-muted-foreground">
                                {item.legalReference}
                              </p>
                            )}
                            {itemFindings.map((f) => (
                              <div
                                key={f.id}
                                className="mt-2 text-sm border-l-2 border-yellow-400 pl-3"
                              >
                                <p>{f.description}</p>
                                {f.riskLevel && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs mt-1"
                                  >
                                    {f.riskLevel}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                          {isEditable && (
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Befund hinzufügen"
                                onClick={() =>
                                  openFindingForSection(section.id, item.id)
                                }
                              >
                                {hasIssue ? (
                                  <Plus className="h-3.5 w-3.5" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
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
                            {new Date(finding.deadline).toLocaleDateString(
                              "de-DE"
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    {isEditable && (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, finding.id)}
                          disabled={photoUploading}
                        />
                        <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <Camera className="h-4 w-4" />
                          Foto
                        </div>
                      </label>
                    )}
                  </div>
                  {finding.photos.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {finding.photos.map((photo) => (
                        <div
                          key={photo.id}
                          className="h-16 w-16 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground"
                        >
                          Foto
                        </div>
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
                    {new Date(inspection.inspectionDate).toLocaleDateString(
                      "de-DE"
                    )}
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

          {/* Photo upload */}
          {isEditable && (
            <Card>
              <CardHeader>
                <CardTitle>Allgemeine Fotos</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:bg-accent/50 transition-colors">
                  <Camera className="h-8 w-8 text-muted-foreground mb-2" />
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
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Finding Dialog */}
      <Dialog open={findingDialogOpen} onOpenChange={setFindingDialogOpen}>
        <DialogContent className="sm:max-w-lg">
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
                      newFinding.riskLevel === rl.value
                        ? "default"
                        : "outline"
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
              onClick={() => setFindingDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAddFinding}
              disabled={!newFinding.description}
            >
              Befund speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
