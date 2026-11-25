"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface StringListInputProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}

export function StringListInput({
  items,
  onChange,
  placeholder = "Eintrag eingeben",
  addLabel = "Eintrag hinzufügen",
}: StringListInputProps) {
  const addItem = () => {
    onChange([...items, ""]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const updated = items.map((item, i) => (i === index ? value : item));
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="w-6 text-center text-sm text-muted-foreground">{idx + 1}.</span>
          <Input
            value={item}
            onChange={(e) => updateItem(idx, e.target.value)}
            placeholder={placeholder}
            className="h-8 flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => removeItem(idx)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}
