"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentList } from "@/components/documents/document-list";
import { DigitalDocumentList } from "@/components/documents/digital/digital-document-list";
import { DIGITAL_CATEGORIES, CATEGORY_META } from "@/types/digital-documents";

interface Category {
  id: string;
  code: string;
  name: string;
  fullName: string;
  parentGroup: string;
}

interface DocumentData {
  id: string;
  title: string;
  description: string | null;
  fileType: string | null;
  fileSize: number | null;
  isTemplate: boolean;
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  category: Category;
  createdBy: { firstName: string; lastName: string } | null;
  _count: { companyDocuments: number };
}

interface DigitalDocument {
  id: string;
  categoryCode: string;
  title: string;
  status: string;
  createdAt: string;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
}

// Group categories by their group name
function getCategoryGroups() {
  const groups: Record<string, Array<{ code: string; label: string }>> = {};
  for (const code of DIGITAL_CATEGORIES) {
    const meta = CATEGORY_META[code];
    if (!meta) continue;
    if (!groups[meta.group]) groups[meta.group] = [];
    groups[meta.group].push({ code, label: meta.label });
  }
  return groups;
}

export function DokumentePageContent({
  documents,
  categories,
  digitalDocuments,
}: {
  documents: DocumentData[];
  categories: Category[];
  digitalDocuments: DigitalDocument[];
}) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const categoryGroups = getCategoryGroups();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="vorlagen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dokumente</h1>
            <p className="text-muted-foreground">
              Vorlagen und digital erstellte Dokumente
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="vorlagen">
              Vorlagen ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="digital">
              Digital ({digitalDocuments.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="vorlagen">
          <div className="space-y-6">
            <DocumentList data={documents} categories={categories} hideHeader />
          </div>
        </TabsContent>

        <TabsContent value="digital">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {digitalDocuments.length}{" "}
                {digitalDocuments.length === 1
                  ? "digitales Dokument"
                  : "digitale Dokumente"}
              </p>
              <Button onClick={() => setSelectorOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Dokument erstellen
              </Button>
            </div>
            <DigitalDocumentList documents={digitalDocuments} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Category Selector Dialog */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dokumenttyp auswählen</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            {Object.entries(categoryGroups).map(([group, cats]) => (
              <div key={group}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  {group}
                </h3>
                <div className="grid gap-2">
                  {cats.map((cat) => (
                    <Link
                      key={cat.code}
                      href={`/dokumente/erstellen/${cat.code}`}
                      onClick={() => setSelectorOpen(false)}
                    >
                      <div className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                        <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">
                          {cat.code}
                        </span>
                        <span className="text-sm">{cat.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
