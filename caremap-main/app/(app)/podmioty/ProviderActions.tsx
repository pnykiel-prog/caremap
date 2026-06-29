"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, PauseCircle, Loader2 } from "lucide-react";

interface Props {
  providerId: string;
  currentStatus: string;
}

export default function ProviderActions({ providerId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = async (status: string, rejectionNote?: string) => {
    setLoading(status);
    setError(null);
    try {
      const res = await fetch(`/api/providers/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionNote }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Wystąpił błąd");
      } else {
        router.refresh();
      }
    } catch {
      setError("Błąd połączenia");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Approve */}
      {currentStatus !== "ACTIVE" && (
        <button
          onClick={() => update("ACTIVE")}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading === "ACTIVE" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <CheckCircle size={12} />
          )}
          Zatwierdź
        </button>
      )}

      {/* Suspend */}
      {currentStatus === "ACTIVE" && (
        <button
          onClick={() => update("SUSPENDED")}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {loading === "SUSPENDED" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <PauseCircle size={12} />
          )}
          Zawieś
        </button>
      )}

      {/* Reject */}
      {currentStatus === "PENDING" && (
        <button
          onClick={() => update("SUSPENDED", "Wniosek odrzucony przez administratora")}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loading === "SUSPENDED" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <XCircle size={12} />
          )}
          Odrzuć
        </button>
      )}

      {/* Reactivate from suspended */}
      {currentStatus === "SUSPENDED" && (
        <button
          onClick={() => update("ACTIVE")}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading === "ACTIVE" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <CheckCircle size={12} />
          )}
          Reaktywuj
        </button>
      )}

      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}
