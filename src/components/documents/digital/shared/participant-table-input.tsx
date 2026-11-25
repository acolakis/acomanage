"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface Participant {
  name: string;
  department?: string;
}

interface ParticipantTableInputProps {
  participants: Participant[];
  onChange: (participants: Participant[]) => void;
  showDepartment?: boolean;
}

export function ParticipantTableInput({
  participants,
  onChange,
  showDepartment = true,
}: ParticipantTableInputProps) {
  const addParticipant = () => {
    onChange([...participants, { name: "", department: "" }]);
  };

  const removeParticipant = (index: number) => {
    onChange(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const updated = participants.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    );
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <div className="grid gap-2 bg-muted/50 p-2 text-sm font-medium" style={{
          gridTemplateColumns: showDepartment ? "2rem 1fr 1fr 2.5rem" : "2rem 1fr 2.5rem",
        }}>
          <span className="text-center">#</span>
          <span>Name / Vorname</span>
          {showDepartment && <span>Abteilung</span>}
          <span />
        </div>
        {participants.map((p, idx) => (
          <div
            key={idx}
            className="grid gap-2 border-t p-2 items-center"
            style={{
              gridTemplateColumns: showDepartment ? "2rem 1fr 1fr 2.5rem" : "2rem 1fr 2.5rem",
            }}
          >
            <span className="text-center text-sm text-muted-foreground">{idx + 1}</span>
            <Input
              value={p.name}
              onChange={(e) => updateParticipant(idx, "name", e.target.value)}
              placeholder="Name eingeben"
              className="h-8"
            />
            {showDepartment && (
              <Input
                value={p.department || ""}
                onChange={(e) => updateParticipant(idx, "department", e.target.value)}
                placeholder="Abteilung"
                className="h-8"
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => removeParticipant(idx)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addParticipant} className="gap-1">
        <Plus className="h-4 w-4" /> Teilnehmer hinzufügen
      </Button>
    </div>
  );
}
