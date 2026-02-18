"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AiSettings {
  apiKey: string;
  model: string;
}

export function AiSettings() {
  const [settings, setSettings] = useState<AiSettings>({
    apiKey: "",
    model: "claude-sonnet-4-6",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.ai) {
          setSettings(data.ai as AiSettings);
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
        body: JSON.stringify({ key: "ai", value: settings }),
      });
      if (!res.ok) throw new Error("Fehler");
      alert("KI-Einstellungen gespeichert");
    } catch {
      alert("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const maskedKey = settings.apiKey
    ? `${"•".repeat(Math.max(0, settings.apiKey.length - 4))}${settings.apiKey.slice(-4)}`
    : "";

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
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          KI-Integration
        </CardTitle>
        <CardDescription>
          Claude API-Konfiguration für automatische SDB- und Handbuch-Extraktion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Claude API-Key</Label>
          <Input
            type="password"
            value={settings.apiKey}
            onChange={(e) =>
              setSettings({ ...settings, apiKey: e.target.value })
            }
            placeholder="sk-ant-..."
          />
          {maskedKey && (
            <p className="text-xs text-muted-foreground">
              Aktuell: {maskedKey}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Modell</Label>
          <Select
            value={settings.model}
            onValueChange={(v) => setSettings({ ...settings, model: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude-sonnet-4-6">Claude Sonnet 4.6</SelectItem>
              <SelectItem value="claude-haiku-4-5-20251001">Claude Haiku 4.5</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end">
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
