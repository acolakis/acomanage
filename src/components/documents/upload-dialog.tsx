"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  code: string;
  name: string;
  parentGroup: string;
}

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  categories,
}: UploadDocumentDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [uploading, setUploading] = useState(false);

  const categoryGroups = categories.reduce<Record<string, Category[]>>(
    (acc, cat) => {
      if (!acc[cat.parentGroup]) acc[cat.parentGroup] = [];
      acc[cat.parentGroup].push(cat);
      return acc;
    },
    {}
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) {
        // Auto-fill title from filename
        const name = selected.name.replace(/\.[^/.]+$/, "");
        setTitle(name);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      if (!title) {
        setTitle(dropped.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async () => {
    if (!title || !categoryId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      formData.append("title", title);
      formData.append("categoryId", categoryId);
      formData.append("description", description);
      formData.append("isTemplate", String(isTemplate));

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Upload fehlgeschlagen");
      }

      // Reset form
      setFile(null);
      setTitle("");
      setCategoryId("");
      setDescription("");
      setIsTemplate(false);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Upload error:", error);
      alert(
        error instanceof Error ? error.message : "Upload fehlgeschlagen"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dokument hochladen</DialogTitle>
          <DialogDescription>
            Laden Sie eine Datei hoch und ordnen Sie sie einer Kategorie zu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Drop Zone */}
          <div
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Datei hierher ziehen oder klicken zum Auswählen
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, Word, Excel, Bilder
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Titel <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Dokumenttitel"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>
              Kategorie <span className="text-destructive">*</span>
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryGroups).map(([group, cats]) => (
                  <div key={group}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {group}
                    </div>
                    {cats.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.code} - {cat.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung..."
              rows={2}
            />
          </div>

          {/* Template Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isTemplate"
              checked={isTemplate}
              onCheckedChange={(checked) => setIsTemplate(checked === true)}
            />
            <Label htmlFor="isTemplate" className="text-sm font-normal">
              Als Vorlage markieren (kann mehreren Betrieben zugewiesen werden)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title || !categoryId || uploading}
          >
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Hochladen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
