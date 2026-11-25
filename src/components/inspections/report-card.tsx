"use client";

import { useRef, useState } from "react";
import { FileDown, FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Word report stored with the inspection. It is the basis for next year's Word export, so the
 * final version edited in Word should be uploaded here.
 */
export function ReportCard({
  inspectionId,
  fileName,
  source,
  updatedAt,
  canEdit,
  onChanged,
}: {
  inspectionId: string;
  fileName: string | null;
  source: string | null;
  updatedAt: string | null;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/inspections/${inspectionId}/report`, { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Fehler ${res.status}`);
      onChanged();
    } catch (err) {
      alert(`Hochladen fehlgeschlagen: ${err instanceof Error ? err.message : err}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const when = updatedAt ? new Date(updatedAt).toLocaleDateString("de-DE") : "";
  const status = !fileName
    ? "Noch kein Bericht gespeichert. Er wird beim Word-Export automatisch hier abgelegt."
    : source === "uploaded"
    ? `Endgültige Fassung, hochgeladen am ${when}.`
    : `Vom Word-Export erstellt am ${when}. Hast du ihn in Word überarbeitet, lade die fertige Fassung hoch.`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
        <FileText className="hidden h-8 w-8 shrink-0 text-muted-foreground sm:block" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Begehungsbericht (Word){fileName ? `: ${fileName}` : ""}</p>
          <p className="text-xs text-muted-foreground">
            {status} Grundlage für den Bericht der nächsten Begehung.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {fileName && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/inspections/${inspectionId}/report`}>
                <FileDown className="mr-2 h-4 w-4" />
                Herunterladen
              </a>
            </Button>
          )}
          {canEdit && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                className="hidden"
                onChange={(e) => upload(e.target.files?.[0])}
              />
              <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {fileName ? "Endgültige Fassung hochladen" : "Bericht hochladen"}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
