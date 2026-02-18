import { Settings } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EinstellungenPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground">
          Systemkonfiguration und Einstellungen
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allgemein</CardTitle>
            <CardDescription>Grundlegende Systemeinstellungen</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Firmenname, Logo und Kontaktdaten für PDF-Berichte.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">E-Mail-Benachrichtigungen</CardTitle>
            <CardDescription>SMTP-Konfiguration</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>E-Mail-Server für automatische Benachrichtigungen konfigurieren.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">KI-Integration</CardTitle>
            <CardDescription>Claude API Einstellungen</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>API-Schlüssel und Modellauswahl für die KI-Extraktion.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datensicherung</CardTitle>
            <CardDescription>Backup und Export</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Datenbank-Backup und Export-Funktionen.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 py-8 justify-center">
          <Settings className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            Detaillierte Einstellungen werden in einer zukünftigen Version verfügbar sein.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
