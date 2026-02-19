"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  city: string | null;
}

export function CompanySelector() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Read current cookie
    const cookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith("selectedCompanyId="));
    if (cookie) {
      setSelectedId(cookie.split("=")[1]);
    }

    // Fetch companies
    fetch("/api/companies?active=true")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
            ? data.data
            : [];
        setCompanies(list);
      })
      .catch(() => {});
  }, []);

  function selectCompany(companyId: string | null) {
    setSelectedId(companyId);
    setIsOpen(false);
    setSearch("");

    if (companyId) {
      document.cookie = `selectedCompanyId=${companyId}; path=/; max-age=${60 * 60 * 24 * 365}`;
    } else {
      document.cookie =
        "selectedCompanyId=; path=/; max-age=0";
    }

    router.refresh();
  }

  const selectedCompany = companies.find((c) => c.id === selectedId);

  const filteredCompanies = companies.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative px-3 py-3 border-b">
      <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Aktiver Betrieb
      </p>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "border bg-background hover:bg-accent text-left",
          selectedCompany && "border-primary/50"
        )}
      >
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">
          {selectedCompany ? selectedCompany.name : "Alle Betriebe"}
        </span>
        {selectedCompany ? (
          <X
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              selectCompany(null);
            }}
          />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearch("");
            }}
          />
          {/* Dropdown */}
          <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-md border bg-popover shadow-lg">
            <div className="p-2">
              <input
                type="text"
                placeholder="Betrieb suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              <button
                onClick={() => selectCompany(null)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left",
                  !selectedId && "bg-accent font-medium"
                )}
              >
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Alle Betriebe
              </button>
              {filteredCompanies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => selectCompany(company.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left",
                    selectedId === company.id && "bg-accent font-medium"
                  )}
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{company.name}</span>
                    {company.city && (
                      <span className="text-xs text-muted-foreground">
                        {company.city}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {filteredCompanies.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Kein Betrieb gefunden
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
