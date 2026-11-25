"use client";

import { useState } from "react";
import Link from "next/link";
import { FileDown, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Unterweisung {
  id: string;
  datum: string;
  abteilung: string | null;
  ort: string | null;
  anlass: string[];
  inhalt: string;
  status: string;
  company: { id: string; name: string };
}

const statusLabels: Record<string, string> = {
  entwurf: "Entwurf",
  abgeschlossen: "Abgeschlossen",
};

const statusColors: Record<string, string> = {
  entwurf: "bg-yellow-100 text-yellow-800 border-yellow-300",
  abgeschlossen: "bg-green-100 text-green-800 border-green-300",
};

export function UnterweisungList({
  unterweisungen,
}: {
  unterweisungen: Unterweisung[];
}) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState(unterweisungen);

  const filtered = items.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.company.name.toLowerCase().includes(term) ||
      (u.abteilung && u.abteilung.toLowerCase().includes(term)) ||
      (u.ort && u.ort.toLowerCase().includes(term)) ||
      u.inhalt.toLowerCase().includes(term)
    );
  });

  async function handleDelete(id: string) {
    const res = await fetch(`/api/unterweisungen/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((u) => u.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Suche nach Betrieb, Abteilung, Ort..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Betrieb</TableHead>
              <TableHead className="hidden sm:table-cell">Abteilung</TableHead>
              <TableHead className="hidden md:table-cell">Anlass</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Keine Unterweisungen gefunden
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link
                      href={`/unterweisungsnachweise/${u.id}`}
                      className="font-medium hover:underline"
                    >
                      {new Date(u.datum).toLocaleDateString("de-DE")}
                    </Link>
                  </TableCell>
                  <TableCell>{u.company.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {u.abteilung || "–"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs">
                      {u.anlass.slice(0, 2).join(", ")}
                      {u.anlass.length > 2 ? ` +${u.anlass.length - 2}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[u.status] || ""}
                    >
                      {statusLabels[u.status] || u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="PDF herunterladen"
                      >
                        <a
                          href={`/api/unterweisungen/${u.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileDown className="h-4 w-4" />
                        </a>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Unterweisung löschen?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Diese Unterweisung wird archiviert und kann nicht
                              wiederhergestellt werden.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(u.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Löschen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
