"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  ExternalLink,
  Scale,
  ClipboardCheck,
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

const statusLabels: Record<string, string> = {
  OFFEN: "Offen",
  KONFORM: "Konform",
  TEILWEISE: "Teilweise",
  NICHT_KONFORM: "Nicht konform",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  OFFEN: "secondary",
  KONFORM: "outline",
  TEILWEISE: "default",
  NICHT_KONFORM: "destructive",
};

const statusExtraClass: Record<string, string> = {
  KONFORM: "border-green-500 text-green-700",
  TEILWEISE: "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100/80",
};

const complianceStatuses = [
  { value: "OFFEN", label: "Offen" },
  { value: "KONFORM", label: "Konform" },
  { value: "TEILWEISE", label: "Teilweise" },
  { value: "NICHT_KONFORM", label: "Nicht konform" },
];

interface LegalRequirementData {
  id: string;
  title: string;
  shortTitle: string | null;
  category: string;
  section: string | null;
  description: string | null;
  relevance: string | null;
  complianceStatus: string;
  complianceNotes: string | null;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
}

interface LegalDetailProps {
  requirement: LegalRequirementData;
}

export function LegalDetail({ requirement: initialData }: LegalDetailProps) {
  const router = useRouter();
  const [requirement, setRequirement] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Compliance form
  const [complianceForm, setComplianceForm] = useState({
    complianceStatus: requirement.complianceStatus,
    complianceNotes: requirement.complianceNotes || "",
    lastReviewDate: requirement.lastReviewDate
      ? requirement.lastReviewDate.split("T")[0]
      : "",
    nextReviewDate: requirement.nextReviewDate
      ? requirement.nextReviewDate.split("T")[0]
      : "",
  });

  const formatDate = (d: string | null) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const handleSaveCompliance = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/legal-requirements/${requirement.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complianceStatus: complianceForm.complianceStatus,
          complianceNotes: complianceForm.complianceNotes || null,
          lastReviewDate: complianceForm.lastReviewDate || null,
          nextReviewDate: complianceForm.nextReviewDate || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRequirement(updated);
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving compliance:", error);
      alert("Fehler beim Speichern der Bewertung");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Rechtsanforderung wirklich löschen?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/legal-requirements/${requirement.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/rechtskataster");
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Löschen");
      }
    } catch (error) {
      console.error("Error deleting requirement:", error);
      alert("Fehler beim Löschen");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/rechtskataster">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {requirement.title}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{requirement.company.name}</span>
            <Badge variant="outline">{requirement.category}</Badge>
            <Badge
              variant={statusVariants[requirement.complianceStatus] || "secondary"}
              className={statusExtraClass[requirement.complianceStatus] || ""}
            >
              {statusLabels[requirement.complianceStatus] || requirement.complianceStatus}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-destructive hover:text-destructive"
        >
          {deleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Löschen
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card 1: Basisdaten */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Basisdaten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Titel</p>
                <p className="text-muted-foreground">{requirement.title}</p>
              </div>
              <div>
                <p className="font-medium">Kurzbezeichnung</p>
                <p className="text-muted-foreground">
                  {requirement.shortTitle || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Kategorie</p>
                <p className="text-muted-foreground">{requirement.category}</p>
              </div>
              <div>
                <p className="font-medium">Betrieb</p>
                <p className="text-muted-foreground">
                  {requirement.company.name}
                </p>
              </div>
              <div>
                <p className="font-medium">Abschnitt</p>
                <p className="text-muted-foreground">
                  {requirement.section || "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Erstellt von</p>
                <p className="text-muted-foreground">
                  {requirement.createdBy
                    ? `${requirement.createdBy.firstName} ${requirement.createdBy.lastName}`
                    : "\u2014"}
                </p>
              </div>
              <div>
                <p className="font-medium">Erstellt am</p>
                <p className="text-muted-foreground">
                  {formatDate(requirement.createdAt)}
                </p>
              </div>
              <div>
                <p className="font-medium">Zuletzt aktualisiert</p>
                <p className="text-muted-foreground">
                  {formatDate(requirement.updatedAt)}
                </p>
              </div>
            </div>
            {requirement.description && (
              <div className="mt-4">
                <p className="text-sm font-medium">Beschreibung</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                  {requirement.description}
                </p>
              </div>
            )}
            {requirement.relevance && (
              <div className="mt-4">
                <p className="text-sm font-medium">Relevanz / Bedeutung</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                  {requirement.relevance}
                </p>
              </div>
            )}
            {requirement.sourceUrl && (
              <div className="mt-4">
                <p className="text-sm font-medium">Quelle</p>
                <a
                  href={requirement.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {requirement.sourceUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Compliance-Bewertung */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Compliance-Bewertung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Konformitätsstatus</Label>
              <Select
                value={complianceForm.complianceStatus}
                onValueChange={(v) =>
                  setComplianceForm({ ...complianceForm, complianceStatus: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {complianceStatuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Anmerkungen</Label>
              <Textarea
                value={complianceForm.complianceNotes}
                onChange={(e) =>
                  setComplianceForm({
                    ...complianceForm,
                    complianceNotes: e.target.value,
                  })
                }
                placeholder="Anmerkungen zur Konformitätsbewertung..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Letzte Prüfung</Label>
                <Input
                  type="date"
                  value={complianceForm.lastReviewDate}
                  onChange={(e) =>
                    setComplianceForm({
                      ...complianceForm,
                      lastReviewDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Nächste Prüfung</Label>
                <Input
                  type="date"
                  value={complianceForm.nextReviewDate}
                  onChange={(e) =>
                    setComplianceForm({
                      ...complianceForm,
                      nextReviewDate: e.target.value,
                    })
                  }
                />
                {complianceForm.nextReviewDate &&
                  isOverdue(complianceForm.nextReviewDate) && (
                    <p className="text-xs text-destructive">
                      Prüftermin ist überfällig!
                    </p>
                  )}
              </div>
            </div>

            <Button onClick={handleSaveCompliance} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Bewertung speichern
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
