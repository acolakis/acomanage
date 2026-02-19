"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FileText,
  ClipboardCheck,
  FlaskConical,
  Cog,
  Users,
  ShieldAlert,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanySelector } from "@/components/layout/company-selector";

const navigationItems = [
  {
    title: "Allgemein",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Verwaltung",
    items: [
      {
        label: "Betriebe",
        href: "/betriebe",
        icon: Building2,
      },
      {
        label: "Dokumente",
        href: "/dokumente",
        icon: FileText,
      },
      {
        label: "Begehungen",
        href: "/begehungen",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    title: "Gefahren & Sicherheit",
    items: [
      {
        label: "Gefahrstoffe",
        href: "/gefahrstoffe",
        icon: FlaskConical,
      },
      {
        label: "Maschinen",
        href: "/maschinen",
        icon: Cog,
      },
      {
        label: "Gefährdungsbeurteilungen",
        href: "/gefaehrdungsbeurteilungen",
        icon: ShieldAlert,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Benutzer",
        href: "/benutzer",
        icon: Users,
      },
      {
        label: "Einstellungen",
        href: "/einstellungen",
        icon: Settings,
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
      <div className="flex flex-col flex-grow bg-card border-r overflow-y-auto">
        {/* Logo / Branding */}
        <div className="flex items-center h-16 px-6 border-b shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">A</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">AcoManage</span>
          </Link>
        </div>

        {/* Company Selector */}
        <CompanySelector />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-6">
          {navigationItems.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t">
          <p className="px-3 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} AcoManage
          </p>
        </div>
      </div>
    </aside>
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-6">
      {navigationItems.map((group) => (
        <div key={group.title}>
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
