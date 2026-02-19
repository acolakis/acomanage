"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileText,
  Building2,
  Clock,
  AlertTriangle,
  Plus,
  RefreshCw,
  Loader2,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentDetailProps {
  document: {
    id: string;
    title: string;
    description: string | null;
    fileType: string | null;
    fileSize: number | null;
    filePath: string | null;
    isTemplate: boolean;
    version: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    category: {
      id: string;
      code: string;
      name: string;
      fullName: string;
      parentGroup: string;
    };
    createdBy: { firstName: string; lastName: string } | null;
    companyDocuments: {
      id: string;
      syncedVersion: number;
      isCurrent: boolean;
      assignedAt: string;
      syncedAt: string | null;
      company: { id: string; name: string; isActive: boolean };
      assignedBy: { firstName: string; lastName: string } | null;
    }[];
    propagations: {
      id: string;
      fromVersion: number;
      toVersion: number;
      companyIds: string[];
      propagatedAt: string;
      notes: string | null;
      propagatedBy: { firstName: string; lastName: string } | null;
    }[];
    gbaSubstances?: {
      id: string;
      tradeName: string;
      company: { id: string; name: string };
    }[];
    baMachines?: {
      id: string;
      name: string;
      company: { id: string; name: string };
    }[];
  };
  allCompanies: { id: string; name: string }[];
}

export function DocumentDetail({
  document: doc,
  allCompanies,
}: DocumentDetailProps) {
  const router = useRouter();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [propagateDialogOpen, setPropagateDialogOpen] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const outdatedCompanies = doc.companyDocuments.filter((cd) => !cd.isCurrent);
  const currentCompanies = doc.companyDocuments.filter((cd) => cd.isCurrent);
  const assignedCompanyIds = doc.companyDocuments.map((cd) => cd.company.id);
  const unassignedCompanies = allCompanies.filter(
    (c) => !assignedCompanyIds.includes(c.id)
  );

  const handleAssign = async () => {
    if (selectedCompanyIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: selectedCompanyIds }),
      });
      if (res.ok) {
        setAssignDialogOpen(false);
        setSelectedCompanyIds([]);
        router.refresh();
      }
    } catch (error) {
      console.error("Error assigning:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePropagate = async () => {
    if (selectedCompanyIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/propagate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: selectedCompanyIds }),
      });
      if (res.ok) {
        setPropagateDialogOpen(false);
        setSelectedCompanyIds([]);
        router.refresh();
      }
    } catch (error) {
      console.error("Error propagating:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasBaLinks =
    (doc.gbaSubstances && doc.gbaSubstances.length > 0) ||
    (doc.baMachines && doc.baMachines.length > 0);

  const handlePropagateBA = async () => {
    if (!confirm("Betriebsanweisung an alle verknüpften Betriebe propagieren?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/propagate-ba`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Erfolgreich an ${data.companiesUpdated} Betriebe propagiert.`);
        router.refresh();
      } else {
        throw new Error("Fehler");
      }
    } catch {
      alert("Fehler bei der Propagierung");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTemplate = async () => {
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTemplate: !doc.isTemplate }),
      });
      if (res.ok) router.refresh();
    } catch (error) {
      console.error("Error toggling template:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dokumente">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline">{doc.category.code}</Badge>
            <span>{doc.category.fullName}</span>
            <span>v{doc.version}</span>
            {doc.isTemplate && <Badge>Vorlage</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {doc.filePath && (
            <Button variant="outline" asChild>
              <a
                href={`/api/documents/${doc.id}/download`}
                target="_blank"
                rel="noopener"
              >
                <Download className="mr-2 h-4 w-4" />
                Herunterladen
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={handleToggleTemplate}>
            {doc.isTemplate ? "Vorlage entfernen" : "Als Vorlage markieren"}
          </Button>
        </div>
      </div>

      {/* Outdated Warning Banner */}
      {outdatedCompanies.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="flex items-center justify-between pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {outdatedCompanies.length}{" "}
                  {outdatedCompanies.length === 1
                    ? "Betrieb hat"
                    : "Betriebe haben"}{" "}
                  nicht die aktuelle Version
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Aktuelle Version: v{doc.version}
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                setSelectedCompanyIds(
                  outdatedCompanies.map((cd) => cd.company.id)
                );
                setPropagateDialogOpen(true);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {doc.description && (
              <div>
                <p className="text-sm font-medium">Beschreibung</p>
                <p className="text-sm text-muted-foreground">
                  {doc.description}
                </p>
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Kategorie</p>
                <p className="text-muted-foreground">
                  {doc.category.code} - {doc.category.name}
                </p>
              </div>
              <div>
                <p className="font-medium">Dateityp</p>
                <p className="text-muted-foreground uppercase">
                  {doc.fileType || "-"}
                </p>
              </div>
              <div>
                <p className="font-medium">Version</p>
                <p className="text-muted-foreground">v{doc.version}</p>
              </div>
              <div>
                <p className="font-medium">Dateigröße</p>
                <p className="text-muted-foreground">
                  {doc.fileSize
                    ? `${(doc.fileSize / 1024).toFixed(1)} KB`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="font-medium">Erstellt am</p>
                <p className="text-muted-foreground">
                  {new Date(doc.createdAt).toLocaleDateString("de-DE")}
                </p>
              </div>
              <div>
                <p className="font-medium">Erstellt von</p>
                <p className="text-muted-foreground">
                  {doc.createdBy
                    ? `${doc.createdBy.firstName} ${doc.createdBy.lastName}`
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linked Companies */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Zugewiesene Betriebe
              </CardTitle>
              {doc.isTemplate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedCompanyIds([]);
                    setAssignDialogOpen(true);
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Zuweisen
                </Button>
              )}
            </div>
            <CardDescription>
              {doc.companyDocuments.length}{" "}
              {doc.companyDocuments.length === 1 ? "Betrieb" : "Betriebe"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {doc.companyDocuments.length > 0 ? (
              <div className="space-y-2">
                {currentCompanies.map((cd) => (
                  <div
                    key={cd.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">
                        {cd.company.name}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      v{cd.syncedVersion}
                    </Badge>
                  </div>
                ))}
                {outdatedCompanies.map((cd) => (
                  <div
                    key={cd.id}
                    className="flex items-center justify-between rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">
                        {cd.company.name}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs text-yellow-700"
                    >
                      v{cd.syncedVersion} (veraltet)
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {doc.isTemplate
                  ? "Noch keinem Betrieb zugewiesen."
                  : "Markieren Sie dieses Dokument als Vorlage, um es Betrieben zuzuweisen."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BA Usage Section */}
      {hasBaLinks && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Verknüpfte Betriebsanweisungen
              </CardTitle>
              <Button size="sm" onClick={handlePropagateBA} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                An alle Betriebe propagieren
              </Button>
            </div>
            <CardDescription>
              Diese Vorlage ist als Betriebsanweisung mit folgenden
              Gefahrstoffen/Maschinen verknüpft. Beim Download wird sie mit den
              jeweiligen Firmendaten personalisiert.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {doc.gbaSubstances?.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Gefahrstoff
                    </Badge>
                    <Link
                      href={`/gefahrstoffe/${s.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {s.tradeName}
                    </Link>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {s.company.name}
                  </span>
                </div>
              ))}
              {doc.baMachines?.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Maschine
                    </Badge>
                    <Link
                      href={`/maschinen/${m.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {m.name}
                    </Link>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {m.company.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Propagation History */}
      {doc.propagations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Aktualisierungsverlauf
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {doc.propagations.map((prop) => (
                <div key={prop.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p>
                      v{prop.fromVersion} → v{prop.toVersion} an{" "}
                      {prop.companyIds.length}{" "}
                      {prop.companyIds.length === 1 ? "Betrieb" : "Betriebe"}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(prop.propagatedAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {prop.propagatedBy &&
                        ` von ${prop.propagatedBy.firstName} ${prop.propagatedBy.lastName}`}
                    </p>
                    {prop.notes && (
                      <p className="text-muted-foreground italic">
                        {prop.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Betrieben zuweisen</DialogTitle>
            <DialogDescription>
              Wählen Sie die Betriebe aus, denen dieses Dokument zugewiesen
              werden soll.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2 py-4">
            {unassignedCompanies.length > 0 ? (
              unassignedCompanies.map((company) => (
                <div key={company.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`assign-${company.id}`}
                    checked={selectedCompanyIds.includes(company.id)}
                    onCheckedChange={(checked) => {
                      setSelectedCompanyIds((prev) =>
                        checked
                          ? [...prev, company.id]
                          : prev.filter((id) => id !== company.id)
                      );
                    }}
                  />
                  <label
                    htmlFor={`assign-${company.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {company.name}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Alle Betriebe haben dieses Dokument bereits.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedCompanyIds.length === 0 || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedCompanyIds.length} Betriebe zuweisen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Propagate Dialog */}
      <Dialog
        open={propagateDialogOpen}
        onOpenChange={setPropagateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Version aktualisieren</DialogTitle>
            <DialogDescription>
              Wählen Sie die Betriebe aus, die auf Version v{doc.version}{" "}
              aktualisiert werden sollen.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2 py-4">
            {outdatedCompanies.map((cd) => (
              <div
                key={cd.company.id}
                className="flex items-center space-x-2"
              >
                <Checkbox
                  id={`prop-${cd.company.id}`}
                  checked={selectedCompanyIds.includes(cd.company.id)}
                  onCheckedChange={(checked) => {
                    setSelectedCompanyIds((prev) =>
                      checked
                        ? [...prev, cd.company.id]
                        : prev.filter((id) => id !== cd.company.id)
                    );
                  }}
                />
                <label
                  htmlFor={`prop-${cd.company.id}`}
                  className="text-sm cursor-pointer"
                >
                  {cd.company.name}{" "}
                  <span className="text-muted-foreground">
                    (aktuell v{cd.syncedVersion})
                  </span>
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPropagateDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handlePropagate}
              disabled={selectedCompanyIds.length === 0 || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedCompanyIds.length} Betriebe aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
