"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Copy } from "lucide-react";
import { toast } from "sonner";

export function EntityActions({
  entityId,
  status,
}: {
  entityId: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const approve = async () => {
    setBusy("approve");
    try {
      const res = await fetch(`/api/surveyor-entities/${entityId}/approve`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Błąd zatwierdzania");
        return;
      }
      if (json.data?.temporaryPassword) {
        setTempPassword(json.data.temporaryPassword);
      }
      toast.success("Podmiot zatwierdzony");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    setBusy("reject");
    try {
      const res = await fetch(`/api/surveyor-entities/${entityId}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: rejectNote }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Błąd");
        return;
      }
      toast.success("Wniosek odrzucony");
      setShowReject(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {status === "PENDING" && (
          <>
            <Button
              onClick={approve}
              disabled={busy !== null}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {busy === "approve" ? (
                <Loader2 size={14} className="animate-spin mr-1" />
              ) : (
                <CheckCircle2 size={14} className="mr-1" />
              )}
              Zatwierdź
            </Button>
            <Button
              onClick={() => setShowReject(true)}
              disabled={busy !== null}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <XCircle size={14} className="mr-1" />
              Odrzuć
            </Button>
          </>
        )}
        {status === "ACTIVE" && (
          <Button
            onClick={() => setShowReject(true)}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Zawieś podmiot
          </Button>
        )}
      </div>

      {tempPassword && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md w-full max-w-md">
          <p className="text-xs text-green-700 font-semibold">Konto managera utworzone</p>
          <p className="text-xs text-muted-foreground mt-1">
            Hasło tymczasowe (przekaż managerowi bezpiecznym kanałem):
          </p>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 text-sm font-mono bg-white px-2 py-1 rounded border border-green-200">
              {tempPassword}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(tempPassword);
                toast.success("Skopiowano");
              }}
              className="p-1 text-muted-foreground hover:text-[#1e3a5f]"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}

      {showReject && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h2 className="text-base font-bold text-[#1e3a5f]">
              {status === "PENDING" ? "Odrzuć wniosek" : "Zawieś podmiot"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Podaj adnotację (zobaczy ją kontaktowy manager).
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-border bg-white text-sm mb-4"
              placeholder="Np. brakujące dane NIP, niezgodność z zakresem usług gminy…"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReject(false)}>
                Anuluj
              </Button>
              <Button
                onClick={reject}
                disabled={rejectNote.length < 2 || busy === "reject"}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {busy === "reject" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : status === "PENDING" ? (
                  "Odrzuć"
                ) : (
                  "Zawieś"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
