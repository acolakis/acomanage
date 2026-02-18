"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  Bell,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

const portalNavItems = [
  {
    label: "Übersicht",
    href: "/portal",
    icon: LayoutDashboard,
  },
  {
    label: "Dokumente",
    href: "/portal/dokumente",
    icon: FileText,
  },
  {
    label: "Begehungen",
    href: "/portal/begehungen",
    icon: ClipboardCheck,
  },
  {
    label: "Gefährdungsbeurteilungen",
    href: "/portal/gefaehrdungsbeurteilungen",
    icon: ShieldAlert,
  },
  {
    label: "Benachrichtigungen",
    href: "/portal/benachrichtigungen",
    icon: Bell,
  },
];

export function PortalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
      <div className="flex flex-col flex-grow bg-card border-r overflow-y-auto">
        <div className="flex items-center h-16 px-6 border-b shrink-0">
          <Link href="/portal" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">A</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">AcoManage</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Kundenportal
          </p>
          {portalNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/portal" && pathname.startsWith(item.href + "/"));
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
        </nav>

        <div className="px-3 py-4 border-t">
          <p className="px-3 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} AcoManage
          </p>
        </div>
      </div>
    </aside>
  );
}
