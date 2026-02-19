"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralSettings } from "@/components/settings/general-settings";
import { SmtpSettings } from "@/components/settings/smtp-settings";
import { AiSettings } from "@/components/settings/ai-settings";
import { BackupSettings } from "@/components/settings/backup-settings";
import { TemplateSettings } from "@/components/settings/template-settings";

export default function EinstellungenPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground">
          Systemkonfiguration und Einstellungen
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Allgemein</TabsTrigger>
          <TabsTrigger value="smtp">E-Mail</TabsTrigger>
          <TabsTrigger value="ai">KI-Integration</TabsTrigger>
          <TabsTrigger value="templates">Vorlagen</TabsTrigger>
          <TabsTrigger value="backup">Datensicherung</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="smtp" className="mt-4">
          <SmtpSettings />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AiSettings />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <TemplateSettings />
        </TabsContent>

        <TabsContent value="backup" className="mt-4">
          <BackupSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
