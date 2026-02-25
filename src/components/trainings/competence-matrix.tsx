"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Save,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CompetenceRequirement {
  id: string;
  companyId: string;
  role: string;
  qualification: string;
  legalBasis: string | null;
  recurrenceMonths: number | null;
  isRequired: boolean;
  company: { id: string; name: string };
}

interface Company {
  id: string;
  name: string;
}

interface CompetenceMatrixProps {
  requirements: CompetenceRequirement[];
  companies: Company[];
}

export function CompetenceMatrix({
  requirements: initialRequirements,
  companies,
}: CompetenceMatrixProps) {
  const [requirements, setRequirements] =
    useState<CompetenceRequirement[]>(initialRequirements);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    companyId: "",
    role: "",
    qualification: "",
    legalBasis: "",
    recurrenceMonths: "",
    isRequired: true,
  });

  const resetForm = () => {
    setFormData({
      companyId: "",
      role: "",
      qualification: "",
      legalBasis: "",
      recurrenceMonths: "",
      isRequired: true,
    });
  };

  const refreshRequirements = useCallback(async () => {
    try {
      const res = await fetch("/api/competence-requirements");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRequirements(data);
        }
      }
    } catch (error) {
      console.error("Error refreshing requirements:", error);
    }
  }, []);

  // Group by role
  const grouped = useMemo(() => {
    const map = new Map<string, CompetenceRequirement[]>();
    for (const req of requirements) {
      const key = req.role;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(req);
    }
    return map;
  }, [requirements]);

  const handleAdd = async () => {
    if (!formData.companyId || !formData.role || !formData.qualification) return;
    setSaving(true);
    try {
      const res = await fetch("/api/competence-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: formData.companyId,
          role: formData.role,
          qualification: formData.qualification,
          legalBasis: formData.legalBasis || null,
          recurrenceMonths: formData.recurrenceMonths
            ? parseInt(formData.recurrenceMonths)
            : null,
          isRequired: formData.isRequired,
        }),
      });
      if (res.ok) {
        resetForm();
        setShowAddForm(false);
        await refreshRequirements();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Erstellen");
      }
    } catch (error) {
      console.error("Error creating requirement:", error);
      alert("Fehler beim Erstellen der Anforderung");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (req: CompetenceRequirement) => {
    setEditingId(req.id);
    setFormData({
      companyId: req.companyId,
      role: req.role,
      qualification: req.qualification,
      legalBasis: req.legalBasis || "",
      recurrenceMonths: req.recurrenceMonths
        ? String(req.recurrenceMonths)
        : "",
      isRequired: req.isRequired,
    });
    setShowAddForm(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.role || !formData.qualification) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/competence-requirements/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: formData.role,
          qualification: formData.qualification,
          legalBasis: formData.legalBasis || null,
          recurrenceMonths: formData.recurrenceMonths
            ? parseInt(formData.recurrenceMonths)
            : null,
          isRequired: formData.isRequired,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        resetForm();
        await refreshRequirements();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error updating requirement:", error);
      alert("Fehler beim Speichern der Anforderung");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Anforderung wirklich löschen?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/competence-requirements/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await refreshRequirements();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Fehler beim Löschen");
      }
    } catch (error) {
      console.error("Error deleting requirement:", error);
      alert("Fehler beim Löschen der Anforderung");
    } finally {
      setDeletingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/schulungen">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Qualifikationsmatrix
          </h1>
          <p className="text-muted-foreground">
            {requirements.length} Anforderungen definiert
          </p>
        </div>
        <Button onClick={() => { setShowAddForm(true); setEditingId(null); resetForm(); }}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Anforderung
        </Button>
      </div>

      {/* Add / Edit Form */}
      {(showAddForm || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Anforderung bearbeiten" : "Neue Anforderung"}
            </CardTitle>
            <CardDescription>
              {editingId
                ? "Ändern Sie die Qualifikationsanforderung"
                : "Definieren Sie eine neue Qualifikationsanforderung"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!editingId && (
              <div className="space-y-2">
                <Label>
                  Betrieb <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, companyId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Betrieb auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Rolle / Position <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  placeholder="z.B. Staplerfahrer, Schweißer..."
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Qualifikation <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.qualification}
                  onChange={(e) =>
                    setFormData({ ...formData, qualification: e.target.value })
                  }
                  placeholder="z.B. Staplerschein, Schweißpass..."
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Rechtsgrundlage</Label>
                <Input
                  value={formData.legalBasis}
                  onChange={(e) =>
                    setFormData({ ...formData, legalBasis: e.target.value })
                  }
                  placeholder="z.B. DGUV Vorschrift 68"
                />
              </div>
              <div className="space-y-2">
                <Label>Turnus (Monate)</Label>
                <Input
                  type="number"
                  value={formData.recurrenceMonths}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurrenceMonths: e.target.value,
                    })
                  }
                  placeholder="z.B. 12"
                  min={1}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="isRequired"
                checked={formData.isRequired}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isRequired: !!checked })
                }
              />
              <Label htmlFor="isRequired" className="text-sm font-medium">
                Pflichtqualifikation
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={editingId ? handleUpdate : handleAdd}
                disabled={
                  saving ||
                  !formData.role ||
                  !formData.qualification ||
                  (!editingId && !formData.companyId)
                }
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {editingId ? "Speichern" : "Erstellen"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (editingId) cancelEdit();
                  else {
                    setShowAddForm(false);
                    resetForm();
                  }
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matrix Table grouped by role */}
      {requirements.length > 0 ? (
        Array.from(grouped.entries()).map(([role, reqs]) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="text-base">{role}</CardTitle>
              <CardDescription>
                {reqs.length} Qualifikation{reqs.length !== 1 ? "en" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Qualifikation</TableHead>
                      <TableHead>Betrieb</TableHead>
                      <TableHead>Rechtsgrundlage</TableHead>
                      <TableHead>Turnus (Monate)</TableHead>
                      <TableHead>Pflicht</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reqs.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {req.qualification}
                        </TableCell>
                        <TableCell>{req.company.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {req.legalBasis || "\u2014"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {req.recurrenceMonths || "\u2014"}
                        </TableCell>
                        <TableCell>
                          {req.isRequired ? (
                            <Badge variant="default">Pflicht</Badge>
                          ) : (
                            <Badge variant="outline">Optional</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(req)}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(req.id)}
                              disabled={deletingId === req.id}
                            >
                              {deletingId === req.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Noch keine Qualifikationsanforderungen definiert.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
