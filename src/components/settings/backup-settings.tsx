"use client";

import { useState } from "react";
import { Loader2, Download, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BackupSettings() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/settings/export");
      if (!res.ok) throw new Error("Fehler");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `acomanage-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Fehler beim Exportieren");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Datensicherung & Export
        </CardTitle>
        <CardDescription>
          Exportieren Sie alle Daten zur Sicherung oder Weiterverarbeitung
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-medium text-sm mb-1">Datenbank-Export (JSON)</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Exportiert alle Betriebe, Begehungen, Gefahrstoffe, Maschinen,
            Gefährdungsbeurteilungen und Benutzer als JSON-Datei.
          </p>
          <Button onClick={handleExport} disabled={exporting} variant="outline">
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            JSON exportieren
          </Button>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-medium text-sm mb-1">CSV-Export</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Einzelne Datenbereiche als CSV für Excel exportieren.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Betriebe", path: "/api/export/companies" },
              { label: "Begehungen", path: "/api/export/inspections" },
              { label: "Gefahrstoffe", path: "/api/export/substances" },
              { label: "Maschinen", path: "/api/export/machines" },
              { label: "GBU", path: "/api/export/risk-assessments" },
            ].map((item) => (
              <Button
                key={item.path}
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const res = await fetch(item.path);
                    if (!res.ok) throw new Error("Fehler");
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    const disposition = res.headers.get("Content-Disposition") || "";
                    const match = disposition.match(/filename="(.+)"/);
                    a.download = match?.[1] || `${item.label.toLowerCase()}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    alert("Fehler beim Exportieren");
                  }
                }}
              >
                <Download className="mr-2 h-3 w-3" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
