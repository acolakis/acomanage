"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UsageData {
  monthUsd: number;
  totalUsd: number;
  trackedSince: string | null;
  last30Days: { feature: string; calls: number; costUsd: number }[];
  recentWordExports: { label: string; costUsd: number; at: string | null }[];
}

const usd = (v: number) => `${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString("de-DE") : "–");

/** Claude API costs as recorded by the app (src/lib/ai/usage.ts). */
export function AiUsageCard() {
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai-usage")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || `Fehler ${r.status}`);
        setData(d);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>KI-Kosten</CardTitle>
        <CardDescription>
          Von der App gemessen (Listenpreise der Claude API). Die Abrechnung von Anthropic unter
          console.anthropic.com ist maßgeblich.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error && <p className="text-destructive">{error}</p>}
        {!data && !error && <p className="text-muted-foreground">Wird geladen …</p>}
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-2xl font-bold">{usd(data.monthUsd)}</p>
                <p className="text-xs text-muted-foreground">dieser Monat</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{usd(data.totalUsd)}</p>
                <p className="text-xs text-muted-foreground">gesamt seit {day(data.trackedSince)}</p>
              </div>
            </div>
            {data.last30Days.length > 0 && (
              <div>
                <p className="mb-1 font-medium">Letzte 30 Tage nach Funktion</p>
                <table className="w-full">
                  <tbody>
                    {data.last30Days.map((f) => (
                      <tr key={f.feature} className="border-t">
                        <td className="py-1">{f.feature}</td>
                        <td className="py-1 text-right text-muted-foreground">{f.calls} Aufrufe</td>
                        <td className="py-1 text-right font-medium tabular-nums">{usd(f.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.recentWordExports.length > 0 && (
              <div>
                <p className="mb-1 font-medium">Letzte Word-Berichte</p>
                <table className="w-full">
                  <tbody>
                    {data.recentWordExports.map((e, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-1">{e.label}</td>
                        <td className="py-1 text-right text-muted-foreground">{day(e.at)}</td>
                        <td className="py-1 text-right font-medium tabular-nums">{usd(e.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.totalUsd === 0 && (
              <p className="text-muted-foreground">Noch keine KI-Aufrufe seit Beginn der Messung.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
