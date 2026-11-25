"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download } from "lucide-react";
import { CATEGORY_META } from "@/types/digital-documents";

interface DigitalDocument {
  id: string;
  categoryCode: string;
  title: string;
  status: string;
  createdAt: string;
  company: { id: string; name: string };
  createdBy: { firstName: string; lastName: string } | null;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Aktiv", variant: "default" },
  draft: { label: "Entwurf", variant: "secondary" },
  archived: { label: "Archiviert", variant: "destructive" },
};

export function DigitalDocumentList({ documents }: { documents: DigitalDocument[] }) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Keine digitalen Dokumente</h3>
        <p className="text-muted-foreground mt-1">
          Erstellen Sie Ihr erstes digitales Dokument über den Button oben.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kategorie</TableHead>
            <TableHead>Betrieb</TableHead>
            <TableHead>Erstellt</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const meta = CATEGORY_META[doc.categoryCode];
            const statusInfo = STATUS_MAP[doc.status] || { label: doc.status, variant: "outline" as const };
            return (
              <TableRow key={doc.id}>
                <TableCell>
                  <Link href={`/dokumente/digital/${doc.id}`} className="hover:underline">
                    <div>
                      <span className="font-medium">{meta?.label || doc.categoryCode}</span>
                      <span className="text-muted-foreground text-xs ml-2">({doc.categoryCode})</span>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>{doc.company.name}</TableCell>
                <TableCell>
                  <div>
                    <span>{formatDate(doc.createdAt)}</span>
                    {doc.createdBy && (
                      <span className="text-muted-foreground text-xs block">
                        {doc.createdBy.firstName} {doc.createdBy.lastName}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Link href={`/dokumente/digital/${doc.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </Link>
                    <a href={`/api/digital-documents/${doc.id}/pdf`} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
