"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Upload,
  FileText,
  ArrowUpDown,
  MoreHorizontal,
  Archive,
  Download,
  Building2,
} from "lucide-react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadDocumentDialog } from "@/components/documents/upload-dialog";

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

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({
  data,
  categories,
}: {
  data: DocumentData[];
  categories: Category[];
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  const handleArchive = async (id: string, title: string) => {
    if (!confirm(`Dokument "${title}" wirklich archivieren?`)) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } catch (error) {
      console.error("Error archiving document:", error);
    }
  };

  // Group categories by parentGroup for the filter dropdown
  const categoryGroups = categories.reduce<Record<string, Category[]>>(
    (acc, cat) => {
      if (!acc[cat.parentGroup]) acc[cat.parentGroup] = [];
      acc[cat.parentGroup].push(cat);
      return acc;
    },
    {}
  );

  const columns: ColumnDef<DocumentData>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Titel
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <div className="font-medium">{row.original.title}</div>
            {row.original.description && (
              <div className="text-xs text-muted-foreground line-clamp-1">
                {row.original.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Kategorie",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.category.code}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue) => {
        if (filterValue === "all") return true;
        return row.original.category.id === filterValue;
      },
    },
    {
      accessorKey: "isTemplate",
      header: "Typ",
      cell: ({ row }) =>
        row.original.isTemplate ? (
          <Badge>Vorlage</Badge>
        ) : (
          <Badge variant="secondary">Einzeldokument</Badge>
        ),
      filterFn: (row, _columnId, filterValue) => {
        if (filterValue === "all") return true;
        if (filterValue === "true") return row.original.isTemplate;
        return !row.original.isTemplate;
      },
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => (
        <span className="text-sm">v{row.original.version}</span>
      ),
    },
    {
      id: "companies",
      header: () => (
        <span className="flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" />
          Betriebe
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original._count.companyDocuments}
        </span>
      ),
    },
    {
      accessorKey: "fileType",
      header: "Typ",
      cell: ({ row }) =>
        row.original.fileType ? (
          <Badge variant="outline" className="uppercase text-xs">
            {row.original.fileType}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
    },
    {
      accessorKey: "fileSize",
      header: "Größe",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatFileSize(row.original.fileSize)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.original.fileType && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    `/api/documents/${row.original.id}/download`,
                    "_blank"
                  );
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Herunterladen
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleArchive(row.original.id, row.original.title);
              }}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archivieren
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize: 20 } },
  });

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    table
      .getColumn("category")
      ?.setFilterValue(value === "all" ? undefined : value);
  };

  const handleTemplateFilter = (value: string) => {
    setTemplateFilter(value);
    table
      .getColumn("isTemplate")
      ?.setFilterValue(value === "all" ? undefined : value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dokumente</h1>
          <p className="text-muted-foreground">
            {data.length} {data.length === 1 ? "Dokument" : "Dokumente"}{" "}
            insgesamt
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Dokument hochladen
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Dokument suchen..."
            value={
              (table.getColumn("title")?.getFilterValue() as string) ?? ""
            }
            onChange={(e) =>
              table.getColumn("title")?.setFilterValue(e.target.value)
            }
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
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
        <Select value={templateFilter} onValueChange={handleTemplateFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Dokumenttyp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            <SelectItem value="true">Nur Vorlagen</SelectItem>
            <SelectItem value="false">Nur Einzeldokumente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(`/dokumente/${row.original.id}`)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Keine Dokumente gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} von {data.length} Dokumenten
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Zurück
          </Button>
          <span className="text-sm text-muted-foreground">
            Seite {table.getState().pagination.pageIndex + 1} von{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Weiter
          </Button>
        </div>
      </div>

      {/* Upload Dialog */}
      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        categories={categories}
      />
    </div>
  );
}
