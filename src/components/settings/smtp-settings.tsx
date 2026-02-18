"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SmtpSettings {
  host: string;
  port: string;
  user: string;
  pass: string;
  from: string;
  tls: boolean;
}

export function SmtpSettings() {
  const [settings, setSettings] = useState<SmtpSettings>({
    host: "",
    port: "587",
    user: "",
    pass: "",
    from: "",
    tls: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.smtp) {
          setSettings(data.smtp as SmtpSettings);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "smtp", value: settings }),
      });
      if (!res.ok) throw new Error("Fehler");
      alert("SMTP-Einstellungen gespeichert");
    } catch {
      alert("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>E-Mail-Konfiguration (SMTP)</CardTitle>
        <CardDescription>
          SMTP-Zugangsdaten für den E-Mail-Versand von Benachrichtigungen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>SMTP-Server</Label>
            <Input
              value={settings.host}
              onChange={(e) =>
                setSettings({ ...settings, host: e.target.value })
              }
              placeholder="smtp.example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Port</Label>
            <Input
              value={settings.port}
              onChange={(e) =>
                setSettings({ ...settings, port: e.target.value })
              }
              placeholder="587"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Benutzername</Label>
            <Input
              value={settings.user}
              onChange={(e) =>
                setSettings({ ...settings, user: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Passwort</Label>
            <Input
              type="password"
              value={settings.pass}
              onChange={(e) =>
                setSettings({ ...settings, pass: e.target.value })
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Absender-E-Mail</Label>
          <Input
            type="email"
            value={settings.from}
            onChange={(e) =>
              setSettings({ ...settings, from: e.target.value })
            }
            placeholder="noreply@firma.de"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="tls"
            checked={settings.tls}
            onCheckedChange={(c) =>
              setSettings({ ...settings, tls: c === true })
            }
          />
          <Label htmlFor="tls">TLS/STARTTLS verwenden</Label>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!settings.host || !settings.from || testing}
            onClick={async () => {
              const to = prompt("E-Mail-Adresse für den Test:");
              if (!to) return;
              setTesting(true);
              try {
                const res = await fetch("/api/settings/test-email", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ to }),
                });
                if (res.ok) {
                  alert("Test-E-Mail wurde gesendet");
                } else {
                  const data = await res.json().catch(() => null);
                  alert(data?.error || "Fehler beim Senden");
                }
              } catch {
                alert("Fehler beim Senden");
              } finally {
                setTesting(false);
              }
            }}
          >
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Test-E-Mail senden
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
