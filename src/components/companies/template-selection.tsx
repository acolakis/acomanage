"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TemplateCategory {
  id: string;
  code: string;
  name: string;
  fullName: string;
  parentGroup: string;
  sortOrder: number;
}

interface TemplateDoc {
  id: string;
  title: string;
  description: string | null;
  fileType: string | null;
  fileSize: number | null;
  category: TemplateCategory;
}

interface TemplateSelectionProps {
  company: {
    id: string;
    name: string;
    industry?: { name: string } | null;
  };
  templates: TemplateDoc[];
  defaultCategoryIds: string[];
  existingDocumentIds: string[];
}

interface CategoryGroup {
  categoryId: string;
  code: string;
  name: string;
  fullName: string;
  parentGroup: string;
  templates: TemplateDoc[];
}

const COLLAPSED_LIMIT = 5;

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  doc: "DOC",
  docx: "DOCX",
  xlsx: "XLSX",
  png: "PNG",
  jpg: "JPG",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TemplateSelection({
  company,
  templates,
  defaultCategoryIds,
  existingDocumentIds,
}: TemplateSelectionProps) {
  const router = useRouter();

  // Initialize selected IDs: pre-select templates whose category matches industry defaults
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const t of templates) {
      if (
        defaultCategoryIds.includes(t.category.id) &&
        !existingDocumentIds.includes(t.id)
      ) {
        initial.add(t.id);
      }
    }
    return initial;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [submitting, setSubmitting] = useState(false);

  // Group templates by category
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, CategoryGroup>();
    for (const t of templates) {
      if (existingDocumentIds.includes(t.id)) continue;
      const key = t.category.id;
      if (!groups.has(key)) {
        groups.set(key, {
          categoryId: t.category.id,
          code: t.category.code,
          name: t.category.name,
          fullName: t.category.fullName,
          parentGroup: t.category.parentGroup,
          templates: [],
        });
      }
      groups.get(key)!.templates.push(t);
    }
    return Array.from(groups.values());
  }, [templates, existingDocumentIds]);

  // Group categories by parentGroup for display
  const parentGroups = useMemo(() => {
    const grouped = new Map<string, CategoryGroup[]>();
    for (const cg of categoryGroups) {
      if (!grouped.has(cg.parentGroup)) {
        grouped.set(cg.parentGroup, []);
      }
      grouped.get(cg.parentGroup)!.push(cg);
    }
    return Array.from(grouped.entries());
  }, [categoryGroups]);

  // Filter by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return parentGroups;
    const query = searchQuery.toLowerCase();
    return parentGroups
      .map(([pg, cats]) => {
        const filteredCats = cats
          .map((cg) => ({
            ...cg,
            templates: cg.templates.filter(
              (t) =>
                t.title.toLowerCase().includes(query) ||
                cg.code.toLowerCase().includes(query) ||
                cg.name.toLowerCase().includes(query)
            ),
          }))
          .filter((cg) => cg.templates.length > 0);
        return [pg, filteredCats] as [string, CategoryGroup[]];
      })
      .filter(([, cats]) => cats.length > 0);
  }, [parentGroups, searchQuery]);

  // Count available (non-assigned) templates
  const availableTemplates = templates.filter(
    (t) => !existingDocumentIds.includes(t.id)
  );
  const selectedCount = selectedIds.size;
  const totalAvailable = availableTemplates.length;

  function toggleDocument(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCategory(categoryId: string) {
    const group = categoryGroups.find((g) => g.categoryId === categoryId);
    if (!group) return;
    const allSelected = group.templates.every((t) => selectedIds.has(t.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const t of group.templates) {
        if (allSelected) next.delete(t.id);
        else next.add(t.id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(availableTemplates.map((t) => t.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function toggleExpanded(categoryId: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  async function handleSubmit() {
    if (selectedIds.size === 0) {
      router.push(`/betriebe/${company.id}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/companies/${company.id}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Fehler beim Zuweisen der Vorlagen");
        return;
      }

      router.push(`/betriebe/${company.id}`);
      router.refresh();
    } catch {
      alert("Fehler beim Zuweisen der Vorlagen");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Dokumentvorlagen zuweisen
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Betrieb: <span className="font-medium">{company.name}</span>
          {company.industry && (
            <Badge variant="outline" className="ml-2">
              {company.industry.name}
            </Badge>
          )}
        </p>
      </div>

      {/* Info banner */}
      {defaultCategoryIds.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/20">
          <Info className="h-5 w-5 mt-0.5 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Basierend auf der Branche{" "}
            <span className="font-medium">
              &quot;{company.industry?.name}&quot;
            </span>{" "}
            wurden passende Kategorien vorausgewählt. Sie können die Auswahl
            anpassen.
          </p>
        </div>
      )}

      {existingDocumentIds.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border bg-green-50 p-4 dark:bg-green-950/20">
          <CheckSquare className="h-5 w-5 mt-0.5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 dark:text-green-200">
            {existingDocumentIds.length} Vorlagen sind diesem Betrieb bereits
            zugewiesen und werden hier nicht erneut angezeigt.
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Vorlagen durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedCount} von {totalAvailable} ausgewählt
          </span>
          <Button variant="outline" size="sm" onClick={selectAll}>
            <CheckSquare className="mr-1 h-3.5 w-3.5" />
            Alle
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            <Square className="mr-1 h-3.5 w-3.5" />
            Keine
          </Button>
        </div>
      </div>

      {/* Template groups */}
      <div className="space-y-4">
        {filteredGroups.map(([parentGroup, categories]) => (
          <Card key={parentGroup}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Gruppe {parentGroup}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.map((cg) => {
                const allSelected = cg.templates.every((t) =>
                  selectedIds.has(t.id)
                );
                const someSelected =
                  !allSelected &&
                  cg.templates.some((t) => selectedIds.has(t.id));
                const isExpanded = expandedCategories.has(cg.categoryId);
                const needsExpander = cg.templates.length > COLLAPSED_LIMIT;
                const visibleTemplates =
                  needsExpander && !isExpanded
                    ? cg.templates.slice(0, COLLAPSED_LIMIT)
                    : cg.templates;
                const selectedInCategory = cg.templates.filter((t) =>
                  selectedIds.has(t.id)
                ).length;

                return (
                  <div
                    key={cg.categoryId}
                    className="rounded-lg border bg-muted/30 p-3"
                  >
                    {/* Category header */}
                    <div className="flex items-center gap-3 mb-2">
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el) {
                            (
                              el as unknown as HTMLButtonElement
                            ).dataset.indeterminate = String(someSelected);
                          }
                        }}
                        className={someSelected ? "opacity-70" : ""}
                        onCheckedChange={() => toggleCategory(cg.categoryId)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="font-mono">
                            {cg.code}
                          </Badge>
                          <span className="text-sm font-medium">
                            {cg.fullName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({selectedInCategory}/{cg.templates.length})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Template list */}
                    <div className="ml-7 space-y-1">
                      {visibleTemplates.map((t) => (
                        <label
                          key={t.id}
                          className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedIds.has(t.id)}
                            onCheckedChange={() => toggleDocument(t.id)}
                          />
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm flex-1 min-w-0 truncate">
                            {t.title}
                          </span>
                          {t.description && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {t.description}
                            </span>
                          )}
                          {t.fileType && (
                            <Badge
                              variant="outline"
                              className="text-xs shrink-0"
                            >
                              {FILE_TYPE_LABELS[t.fileType] ||
                                t.fileType.toUpperCase()}
                            </Badge>
                          )}
                          {t.fileSize && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatFileSize(t.fileSize)}
                            </span>
                          )}
                        </label>
                      ))}

                      {needsExpander && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 text-xs"
                          onClick={() => toggleExpanded(cg.categoryId)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronDown className="mr-1 h-3.5 w-3.5" />
                              Weniger anzeigen
                            </>
                          ) : (
                            <>
                              <ChevronRight className="mr-1 h-3.5 w-3.5" />
                              {cg.templates.length - COLLAPSED_LIMIT} weitere
                              anzeigen
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p>
            {searchQuery
              ? "Keine Vorlagen gefunden."
              : "Keine Vorlagen verfügbar."}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="sticky bottom-0 flex items-center justify-between border-t bg-background py-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/betriebe/${company.id}`)}
        >
          Überspringen
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {selectedCount} Vorlagen ausgewählt
          </span>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? "Wird zugewiesen..."
              : selectedCount > 0
                ? `${selectedCount} Vorlagen zuweisen`
                : "Ohne Vorlagen fortfahren"}
          </Button>
        </div>
      </div>
    </div>
  );
}
