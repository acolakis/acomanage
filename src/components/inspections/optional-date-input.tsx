"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Date field that may be empty. Safari on iPad/iPhone renders an empty <input type="date">
 * with today's date, which looks like a real value – so an empty field is shown as "–"
 * and only turns into a date input when tapped.
 */
export function OptionalDateInput({
  value,
  onChange,
  onCommit,
  className,
  invalid,
  disabled,
  title,
}: {
  /** YYYY-MM-DD or "" */
  value: string;
  onChange: (value: string) => void;
  /** Called when editing ends (blur or clear) with the final value. */
  onCommit?: (value: string) => void;
  className?: string;
  invalid?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!value && !editing) {
    return (
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={() => setEditing(true)}
        className={cn(
          "flex w-full items-center rounded-md border border-input bg-background px-3 text-left text-sm text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        –
      </button>
    );
  }

  return (
    <div className="relative">
      <Input
        type="date"
        title={title}
        autoFocus={editing && !value}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          setEditing(false);
          onCommit?.(e.target.value);
        }}
        className={cn("pr-8", invalid && "border-red-500 text-red-700", className)}
      />
      {value && !disabled && (
        <button
          type="button"
          aria-label="Datum löschen"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange("");
            setEditing(false);
            onCommit?.("");
          }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
