"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  ArrowUpDown,
} from "lucide-react";
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

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "EMPLOYEE" | "CLIENT";
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  companyUsers: {
    company: { id: string; name: string };
    role: string;
  }[];
}

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator",
  EMPLOYEE: "Mitarbeiter",
  CLIENT: "Kunde",
};

const roleColors: Record<string, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  EMPLOYEE: "secondary",
  CLIENT: "outline",
};

export function UserTable({ data }: { data: UserData[] }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Benutzer "${name}" wirklich deaktivieren?`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const columns: ColumnDef<UserData>[] = [
    {
      accessorKey: "lastName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.firstName} {row.original.lastName}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.email}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Rolle",
      cell: ({ row }) => (
        <Badge variant={roleColors[row.original.role]}>
          {roleLabels[row.original.role]}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue) => {
        if (filterValue === "all") return true;
        return row.original.role === filterValue;
      },
    },
    {
      id: "companies",
      header: "Betriebe",
      cell: ({ row }) =>
        row.original.companyUsers.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.original.companyUsers.map((cu) => (
              <Badge key={cu.company.id} variant="outline" className="text-xs">
                {cu.company.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Aktiv" : "Inaktiv"}
        </Badge>
      ),
    },
    {
      accessorKey: "lastLoginAt",
      header: "Letzter Login",
      cell: ({ row }) =>
        row.original.lastLoginAt ? (
          <span className="text-sm">
            {new Date(row.original.lastLoginAt).toLocaleDateString("de-DE")}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">Noch nie</span>
        ),
    },
    {
      id: "actions",
      header: "Aktionen",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">Aktionen</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/benutzer/${row.original.id}`);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Bearbeiten
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(
                  row.original.id,
                  `${row.original.firstName} ${row.original.lastName}`
                );
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Deaktivieren
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

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    table
      .getColumn("role")
      ?.setFilterValue(value === "all" ? undefined : value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Benutzer suchen..."
            value={
              (table.getColumn("lastName")?.getFilterValue() as string) ?? ""
            }
            onChange={(e) =>
              table.getColumn("lastName")?.setFilterValue(e.target.value)
            }
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={handleRoleFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Rolle filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Rollen</SelectItem>
            <SelectItem value="ADMIN">Administrator</SelectItem>
            <SelectItem value="EMPLOYEE">Mitarbeiter</SelectItem>
            <SelectItem value="CLIENT">Kunde</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                  onClick={() => router.push(`/benutzer/${row.original.id}`)}
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
                  Keine Benutzer gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} von {data.length} Benutzern
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
    </div>
  );
}
