import { PortalSidebar } from "@/components/layout/portal-sidebar";
import { Header } from "@/components/layout/header";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <PortalSidebar />
      <div className="md:pl-64 flex flex-col h-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
