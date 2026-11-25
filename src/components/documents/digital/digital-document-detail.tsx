"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Download,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import { CATEGORY_META } from "@/types/digital-documents";

interface DocumentData {
  id: string;
  categoryCode: string;
  title: string;
  formData: Record<string, unknown>;
  status: string;
  companyId: string;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Aktiv", variant: "default" },
  draft: { label: "Entwurf", variant: "secondary" },
  archived: { label: "Archiviert", variant: "destructive" },
};

export function DigitalDocumentDetail({ document }: { document: DocumentData }) {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const meta = CATEGORY_META[document.categoryCode];
  const statusInfo = STATUS_MAP[document.status] || { label: document.status, variant: "outline" as const };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/digital-documents/${document.id}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Fehler beim PDF-Download");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${meta?.label || document.categoryCode} - ${document.company.name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim PDF-Download");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Dokument wirklich archivieren?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/digital-documents/${document.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Fehler beim Archivieren");
      router.push("/dokumente");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dokumente">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{meta?.label || document.title}</h1>
            <p className="text-muted-foreground">
              {document.company.name} — {meta?.group || document.categoryCode}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload} disabled={isDownloading} className="gap-2">
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF
          </Button>
          <Link href={`/dokumente/erstellen/${document.categoryCode}`}>
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" /> Bearbeiten
            </Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="gap-2">
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Archivieren
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
          <CardContent><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Erstellt am</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{formatDate(document.createdAt)}</p>
            {document.createdBy && (
              <p className="text-sm text-muted-foreground">
                von {document.createdBy.firstName} {document.createdBy.lastName}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Gültigkeit</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">
              {document.validFrom ? `Ab ${formatDate(document.validFrom)}` : "Unbefristet"}
              {document.validUntil ? ` bis ${formatDate(document.validUntil)}` : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Form Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Dokumentdaten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(document.formData).map(([key, value]) => {
              if (typeof value === "object" && value !== null) return null;
              return (
                <div key={key} className="flex gap-4">
                  <span className="text-sm text-muted-foreground w-48 shrink-0">{key}:</span>
                  <span className="text-sm font-medium">{String(value) || "—"}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
