"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2, Cog, Pencil, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ManualExtractionDialog } from "@/components/machines/manual-extraction-dialog";

interface MachineData {
  id: string;
  name: string;
  machineNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  location: string | null;
  yearOfManufacture: number | null;
  status: string;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
  createdAt: string;
  manualExtractions?: ManualExtractionData[];
}

interface ManualExtractionData {
  id: string;
  extractionStatus: string;
  confidenceScore: number | null;
  scope: { intendedUse: string; limitations: string } | null;
  hazards: {
    mechanicalHazards: string[];
    electricalHazards: string[];
    thermalHazards: string[];
    noiseHazards: string[];
    otherHazards: string[];
  } | null;
  protectiveMeasures: {
    ppe: string[];
    safetyDevices: string;
    warnings: string[];
    operatingInstructions: string[];
  } | null;
  malfunctions: {
    commonIssues: string[];
    emergencyProcedures: string;
    emergencyStop: string;
  } | null;
  firstAid: {
    generalMeasures: string;
    specificInstructions: string[];
  } | null;
  maintenance: {
    dailyChecks: string[];
    periodicMaintenance: string[];
    maintenanceIntervals: string;
  } | null;
  createdAt: string;
}

export default function MaschineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [machine, setMachine] = useState<MachineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [extractionOpen, setExtractionOpen] = useState(false);

  const fetchMachine = useCallback(async () => {
    try {
      const res = await fetch(`/api/machines/${params.id}`);
      if (!res.ok) throw new Error("Nicht gefunden");
      setMachine(await res.json());
    } catch {
      router.push("/maschinen");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchMachine();
  }, [fetchMachine]);

  const handleDelete = async () => {
    if (!confirm("Maschine wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/machines/${params.id}`, { method: "DELETE" });
      if (res.ok) router.push("/maschinen");
    } catch {
      alert("Fehler beim Löschen");
    }
  };

  if (loading || !machine) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/maschinen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Cog className="h-6 w-6" />
            {machine.name}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{machine.company.name}</span>
            {machine.manufacturer && <span>{machine.manufacturer}</span>}
            {machine.model && <Badge variant="outline">{machine.model}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/maschinen/${machine.id}/bearbeiten`}>
              <Pencil className="mr-2 h-4 w-4" />
              Bearbeiten
            </Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maschinendaten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Bezeichnung</p>
              <p className="text-muted-foreground">{machine.name}</p>
            </div>
            <div>
              <p className="font-medium">Betrieb</p>
              <p className="text-muted-foreground">{machine.company.name}</p>
            </div>
            <div>
              <p className="font-medium">Hersteller</p>
              <p className="text-muted-foreground">{machine.manufacturer || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Modell / Typ</p>
              <p className="text-muted-foreground">{machine.model || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Seriennummer</p>
              <p className="text-muted-foreground">{machine.serialNumber || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Baujahr</p>
              <p className="text-muted-foreground">{machine.yearOfManufacture || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Standort</p>
              <p className="text-muted-foreground">{machine.location || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Maschinennummer</p>
              <p className="text-muted-foreground">{machine.machineNumber || "—"}</p>
            </div>
            {machine.createdBy && (
              <div>
                <p className="font-medium">Erfasst von</p>
                <p className="text-muted-foreground">
                  {machine.createdBy.firstName} {machine.createdBy.lastName}
                </p>
              </div>
            )}
            <div>
              <p className="font-medium">Erfasst am</p>
              <p className="text-muted-foreground">
                {new Date(machine.createdAt).toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Betriebsanweisung / KI-Extraktion */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Betriebsanweisung
            </CardTitle>
            <Button size="sm" onClick={() => setExtractionOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Handbuch analysieren
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {machine.manualExtractions && machine.manualExtractions.length > 0 ? (
            <div className="space-y-4">
              {machine.manualExtractions.map((ext) => (
                <div key={ext.id} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">
                      {ext.confidenceScore ? `${Math.round(ext.confidenceScore * 100)}% Konfidenz` : "Extrahiert"}
                    </Badge>
                    <span>vom {new Date(ext.createdAt).toLocaleDateString("de-DE")}</span>
                  </div>

                  {ext.scope && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Anwendungsbereich</h4>
                      <p className="text-sm text-muted-foreground">{ext.scope.intendedUse || "—"}</p>
                      {ext.scope.limitations && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">Einschränkungen:</span> {ext.scope.limitations}
                        </p>
                      )}
                    </div>
                  )}

                  {ext.hazards && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Gefährdungen</h4>
                      <div className="flex flex-wrap gap-1">
                        {[
                          ...( ext.hazards.mechanicalHazards || []),
                          ...(ext.hazards.electricalHazards || []),
                          ...(ext.hazards.thermalHazards || []),
                          ...(ext.hazards.noiseHazards || []),
                          ...(ext.hazards.otherHazards || []),
                        ].map((h, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {h}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {ext.protectiveMeasures?.ppe && ext.protectiveMeasures.ppe.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">PSA (Persönliche Schutzausrüstung)</h4>
                      <div className="flex flex-wrap gap-1">
                        {ext.protectiveMeasures.ppe.map((p, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {ext.maintenance && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Wartung</h4>
                      {ext.maintenance.dailyChecks?.length > 0 && (
                        <div className="mb-1">
                          <span className="text-xs font-medium">Tägliche Prüfungen:</span>
                          <ul className="text-sm text-muted-foreground list-disc list-inside">
                            {ext.maintenance.dailyChecks.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {ext.maintenance.periodicMaintenance?.length > 0 && (
                        <div>
                          <span className="text-xs font-medium">Periodische Wartung:</span>
                          <ul className="text-sm text-muted-foreground list-disc list-inside">
                            {ext.maintenance.periodicMaintenance.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Noch keine Betriebsanweisung vorhanden. Laden Sie ein Maschinenhandbuch hoch, um automatisch relevante Informationen zu extrahieren.
            </p>
          )}
        </CardContent>
      </Card>

      <ManualExtractionDialog
        machineId={machine.id}
        open={extractionOpen}
        onOpenChange={setExtractionOpen}
        onComplete={() => fetchMachine()}
      />
    </div>
  );
}
