"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, Upload, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ExtractionResult {
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
}

interface ManualExtractionDialogProps {
  machineId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function ManualExtractionDialog({
  machineId,
  open,
  onOpenChange,
  onComplete,
}: ManualExtractionDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("machineId", machineId);

      const res = await fetch("/api/ai/extract-manual", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Extraktion fehlgeschlagen");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setExtracting(false);
    }
  };

  const handleClose = () => {
    if (result && onComplete) onComplete();
    setFile(null);
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Handbuch-KI-Extraktion</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-4">
            <div
              {...getRootProps()}
              className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-6 w-6 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <Badge variant="outline">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </Badge>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Maschinenhandbuch (PDF) hierher ziehen oder klicken
                  </p>
                </>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {extracting && (
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  KI analysiert das Handbuch... Dies kann einige Sekunden dauern.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Extraktion erfolgreich</span>
              {result.confidenceScore && (
                <Badge variant="outline">
                  {Math.round(result.confidenceScore * 100)}% Konfidenz
                </Badge>
              )}
            </div>

            {result.scope && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Anwendungsbereich</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p><span className="font-medium">Verwendung:</span> {result.scope.intendedUse || "—"}</p>
                  {result.scope.limitations && (
                    <p className="mt-1"><span className="font-medium">Einschränkungen:</span> {result.scope.limitations}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {result.hazards && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Gefährdungen</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {result.hazards.mechanicalHazards?.length > 0 && (
                    <p><span className="font-medium">Mechanisch:</span> {result.hazards.mechanicalHazards.join(", ")}</p>
                  )}
                  {result.hazards.electricalHazards?.length > 0 && (
                    <p><span className="font-medium">Elektrisch:</span> {result.hazards.electricalHazards.join(", ")}</p>
                  )}
                  {result.hazards.thermalHazards?.length > 0 && (
                    <p><span className="font-medium">Thermisch:</span> {result.hazards.thermalHazards.join(", ")}</p>
                  )}
                  {result.hazards.noiseHazards?.length > 0 && (
                    <p><span className="font-medium">Lärm:</span> {result.hazards.noiseHazards.join(", ")}</p>
                  )}
                  {result.hazards.otherHazards?.length > 0 && (
                    <p><span className="font-medium">Sonstige:</span> {result.hazards.otherHazards.join(", ")}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {result.protectiveMeasures && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Schutzmaßnahmen & PSA</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {result.protectiveMeasures.ppe?.length > 0 && (
                    <p><span className="font-medium">PSA:</span> {result.protectiveMeasures.ppe.join(", ")}</p>
                  )}
                  {result.protectiveMeasures.safetyDevices && (
                    <p><span className="font-medium">Schutzeinrichtungen:</span> {result.protectiveMeasures.safetyDevices}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {result.firstAid && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Erste Hilfe</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>{result.firstAid.generalMeasures || "—"}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Abbrechen
              </Button>
              <Button onClick={handleExtract} disabled={!file || extracting}>
                {extracting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Extraktion starten
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Schließen</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
