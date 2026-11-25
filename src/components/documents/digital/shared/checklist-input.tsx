"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

interface ChecklistItem {
  label: string;
  checked: boolean;
}

interface ChecklistInputProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  addLabel?: string;
}

export function ChecklistInput({
  items,
  onChange,
  addLabel = "Punkt hinzufügen",
}: ChecklistInputProps) {
  const addItem = () => {
    onChange([...items, { label: "", checked: false }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateLabel = (index: number, label: string) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, label } : item
    );
    onChange(updated);
  };

  const toggleChecked = (index: number) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    );
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Checkbox
            checked={item.checked}
            onCheckedChange={() => toggleChecked(idx)}
          />
          <Input
            value={item.label}
            onChange={(e) => updateLabel(idx, e.target.value)}
            placeholder="Thema eingeben"
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
