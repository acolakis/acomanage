"use client";

import { useState } from "react";
import { TrainingSection } from "@/types/training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";

interface SectionEditorProps {
  sections: TrainingSection[];
  onChange: (sections: TrainingSection[]) => void;
  readOnly?: boolean;
}

export function SectionEditor({
  sections,
  onChange,
  readOnly = false,
}: SectionEditorProps) {
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(
    new Set()
  );

  const toggleExpanded = (index: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const addSection = () => {
    const newSection: TrainingSection = {
      title: "",
      content: "",
      order: sections.length + 1,
    };
    const updated = [...sections, newSection];
    onChange(updated);
    setExpandedIndices((prev) => new Set(prev).add(updated.length - 1));
  };

  const updateSection = (
    index: number,
    field: keyof TrainingSection,
    value: string | number
  ) => {
    const updated = sections.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    onChange(updated);
  };

  const deleteSection = (index: number) => {
    const updated = sections
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, order: i + 1 }));
    setExpandedIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
    onChange(updated);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...sections];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    const renumbered = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setExpandedIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i === index) next.add(index - 1);
        else if (i === index - 1) next.add(index);
        else next.add(i);
      });
      return next;
    });
    onChange(renumbered);
  };

  const moveDown = (index: number) => {
    if (index >= sections.length - 1) return;
    const updated = [...sections];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    const renumbered = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setExpandedIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i === index) next.add(index + 1);
        else if (i === index + 1) next.add(index);
        else next.add(i);
      });
      return next;
    });
    onChange(renumbered);
  };

  // ReadOnly mode: all sections expanded, no edit controls
  if (readOnly) {
    if (sections.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          Keine Abschnitte vorhanden.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {sections.map((section, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {section.order}. {section.title || "Ohne Titel"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {section.content || "Kein Inhalt"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section, index) => {
        const isExpanded = expandedIndices.has(index);

        return (
          <Card key={index} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer py-3 px-4"
              onClick={() => toggleExpanded(index)}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <CardTitle className="text-sm font-medium flex-1">
                  {section.order}. {section.title || "Neuer Abschnitt"}
                </CardTitle>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 px-4 pb-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Titel</label>
                  <Input
                    value={section.title}
                    onChange={(e) =>
                      updateSection(index, "title", e.target.value)
                    }
                    placeholder="Abschnittstitel eingeben..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Inhalt</label>
                  <Textarea
                    value={section.content}
                    onChange={(e) =>
                      updateSection(index, "content", e.target.value)
                    }
                    placeholder="Abschnittsinhalt eingeben..."
                    rows={10}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveUp(index);
                    }}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Nach oben
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveDown(index);
                    }}
                    disabled={index >= sections.length - 1}
                  >
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Nach unten
                  </Button>
                  <div className="flex-1" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSection(index);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Entfernen
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      <Button type="button" variant="outline" onClick={addSection}>
        <Plus className="h-4 w-4 mr-2" />
        Abschnitt hinzufügen
      </Button>
    </div>
  );
}
