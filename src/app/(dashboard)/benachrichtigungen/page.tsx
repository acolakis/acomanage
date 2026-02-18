"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  document_updated: "Dokument aktualisiert",
  inspection_completed: "Begehung abgeschlossen",
  measure_deadline: "Frist für Maßnahme",
  risk_assessment_updated: "GBU aktualisiert",
  document_propagated: "Dokument propagiert",
};

export default function BenachrichtigungenPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=100");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch {
      // ignore
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [id] }),
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Benachrichtigungen
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} ungelesene Benachrichtigungen`
              : "Keine ungelesenen Benachrichtigungen"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Alle als gelesen markieren
          </Button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={n.isRead ? "opacity-60" : "border-primary/20"}
            >
              <CardContent className="flex items-start gap-3 py-4">
                <Bell
                  className={`h-4 w-4 mt-0.5 shrink-0 ${
                    n.isRead ? "text-muted-foreground" : "text-primary"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.message && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {n.message}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {typeLabels[n.type] || n.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs shrink-0"
                        onClick={() => handleMarkRead(n.id)}
                      >
                        Gelesen
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Keine Benachrichtigungen vorhanden.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
