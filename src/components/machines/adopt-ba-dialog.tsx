"use client";

import { useState, useEffect } from "react";
import { Loader2, FileText, Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BaTemplate {
  id: string;
  title: string;
  fileType: string | null;
  usedBy: { entityName: string; companyName: string; companyId: string }[];
}

interface AdoptBaDialogProps {
  machineId: string;
  machineName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function AdoptBaDialog({
  machineId,
  machineName,
  open,
  onOpenChange,
  onComplete,
}: AdoptBaDialogProps) {
  const [templates, setTemplates] = useState<BaTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [adopting, setAdopting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/ba-templates?type=machine")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleAdopt = async (documentId: string) => {
    setAdopting(documentId);
    try {
      const res = await fetch(`/api/machines/${machineId}/adopt-ba`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (!res.ok) throw new Error("Fehler");
      onComplete();
      onOpenChange(false);
    } catch {
      alert("Fehler beim Übernehmen der Betriebsanweisung");
    } finally {
      setAdopting(null);
    }
  };

  const filtered = templates.filter(
    (t) =>
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Betriebsanweisung übernehmen</DialogTitle>
          <DialogDescription>
            Wählen Sie eine vorhandene Betriebsanweisung für &quot;{machineName}&quot;.
            Beim Download wird diese automatisch mit den Firmendaten personalisiert.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Vorlage suchen..."
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Keine Vorlagen gefunden.
            </p>
          ) : (
            filtered.map((template) => (
              <div
                key={template.id}
                className="flex items-start gap-3 p-3 rounded-md border hover:bg-muted/50 transition-colors"
              >
                <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {template.title}
                  </p>
                  {template.fileType && (
                    <Badge variant="outline" className="text-xs mt-0.5">
                      .{template.fileType}
                    </Badge>
                  )}
                  {template.usedBy.length > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span>
                        Verwendet bei:{" "}
                        {template.usedBy
                          .map((u) => u.companyName)
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAdopt(template.id)}
                  disabled={adopting !== null}
                >
                  {adopting === template.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Übernehmen"
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
