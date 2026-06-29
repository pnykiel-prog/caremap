"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Loader2, PlayCircle, CheckCheck } from "lucide-react";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import { formatDate } from "@/lib/utils";

interface AlertItem {
  id: string;
  careLevel: number;
  status: string;
  surveyId: string;
  createdAt: Date;
  handledNote: string | null;
  senior: { firstName: string; lastName: string } | null;
}

interface Props {
  alerts: AlertItem[];
  openCount: number;
}

const alertStatusMap: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Otwarty", cls: "bg-red-100 text-red-700" },
  IN_PROGRESS: { label: "W toku", cls: "bg-yellow-100 text-yellow-700" },
  RESOLVED: { label: "Zamknięty", cls: "bg-green-100 text-green-700" },
};

export function AlertPanel({ alerts: initialAlerts, openCount }: Props) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const updateStatus = async (alertId: string, status: string) => {
    setLoadingId(alertId);
    try {
      const res = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, status }),
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: data.data.status } : a)));
        router.refresh();
      }
    } finally {
      setLoadingId(null);
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center px-6">
        <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
        <p className="text-sm text-muted-foreground">Brak alertów</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {alerts.map((alert) => {
        const levelCfg = CARE_LEVELS[alert.careLevel as keyof typeof CARE_LEVELS];
        const statusCfg = alertStatusMap[alert.status] ?? alertStatusMap.OPEN;
        const isLoading = loadingId === alert.id;
        return (
          <div key={alert.id} className="px-5 py-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: levelCfg?.color ?? "#94a3b8" }}
                >
                  {alert.careLevel}
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {alert.senior ? `${alert.senior.firstName} ${alert.senior.lastName}` : "Senior"}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(alert.createdAt)}</p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
            </div>

            {/* Action buttons */}
            {alert.status !== "RESOLVED" && (
              <div className="flex items-center gap-2 pl-10">
                {alert.status === "OPEN" && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => updateStatus(alert.id, "IN_PROGRESS")}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md hover:bg-yellow-100 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 size={11} className="animate-spin" /> : <PlayCircle size={11} />}
                    Przejmij
                  </button>
                )}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => updateStatus(alert.id, "RESOLVED")}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={11} className="animate-spin" /> : <CheckCheck size={11} />}
                  Zamknij
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
