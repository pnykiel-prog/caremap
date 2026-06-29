"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Loader2,
  PauseCircle,
  PlayCircle,
  ArrowRightLeft,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface Surveyor {
  membershipId: string;
  user: { id: string; name: string; email: string };
  role: "ENTITY_MANAGER" | "ENTITY_SURVEYOR";
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  patients: number;
  surveys: number;
}

export function SurveyorsClient({
  entityId,
  surveyors,
}: {
  entityId: string;
  surveyors: Surveyor[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [transferFor, setTransferFor] = useState<Surveyor | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const invite = async () => {
    setBusy("invite");
    try {
      const res = await fetch(`/api/surveyor-entities/${entityId}/invitations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: "ENTITY_SURVEYOR" }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Błąd");
        return;
      }
      setLastInviteUrl(window.location.origin + json.data.inviteUrl);
      setInviteEmail("");
      toast.success("Zaproszenie wygenerowane");
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async (s: Surveyor) => {
    setBusy(s.membershipId);
    const next = s.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(`/api/surveyor-entities/${entityId}/memberships`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ membershipId: s.membershipId, status: next }),
      });
      const json = await res.json();
      if (!json.success) toast.error(json.error ?? "Błąd");
      else {
        toast.success(next === "ACTIVE" ? "Aktywowano" : "Zawieszono");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  };

  const doTransfer = async () => {
    if (!transferFor || !transferTo) return;
    setBusy("transfer");
    try {
      const res = await fetch(`/api/surveyor-entities/${entityId}/memberships`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "transfer-patients",
          fromUserId: transferFor.user.id,
          toUserId: transferTo,
        }),
      });
      const json = await res.json();
      if (!json.success) toast.error(json.error ?? "Błąd transferu");
      else {
        toast.success(`Przeniesiono ${json.data.transferred} pacjentów`);
        setTransferFor(null);
        setTransferTo("");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  };

  const activeSurveyors = surveyors.filter(
    (s) => s.status === "ACTIVE" && s.role === "ENTITY_SURVEYOR",
  );

  return (
    <div>
      {/* Form zaproszenia */}
      <div className="p-4 bg-[#1e3a5f]/5 border-b border-border">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <Mail size={16} className="text-[#1e3a5f] hidden sm:block" />
          <input
            type="email"
            placeholder="email@pracownika.pl"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 h-10 px-3 rounded-md border border-border bg-white text-sm"
          />
          <Button
            onClick={invite}
            disabled={busy === "invite" || !/\S+@\S+\.\S+/.test(inviteEmail)}
            className="bg-[#1e3a5f] hover:bg-[#152b47] text-white"
          >
            {busy === "invite" ? <Loader2 size={14} className="animate-spin" /> : "Wyślij zaproszenie"}
          </Button>
        </div>
        {lastInviteUrl && (
          <div className="mt-3 p-3 bg-white border border-green-200 rounded-md flex items-start gap-2">
            <CheckCircle2 size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="text-muted-foreground">Link aktywacyjny (ważny 48h):</p>
              <p className="font-mono text-[#1e3a5f] break-all">{lastInviteUrl}</p>
            </div>
          </div>
        )}
      </div>

      {/* Lista ankieterów */}
      {surveyors.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          Brak ankieterów. Zaproś pierwszego pracownika powyżej.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {surveyors.map((s) => (
            <div key={s.membershipId} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-[#1e3a5f]">
                    {s.user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1e3a5f] truncate">{s.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.user.email} · {s.role === "ENTITY_MANAGER" ? "Manager" : "Ankieter"} · {s.patients} pacjentów · {s.surveys} ankiet
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                    s.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {s.status === "ACTIVE" ? "Aktywny" : "Zawieszony"}
                </span>
                {s.role === "ENTITY_SURVEYOR" && s.patients > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTransferFor(s)}
                    disabled={activeSurveyors.length <= 1}
                  >
                    <ArrowRightLeft size={12} className="mr-1" /> Transfer
                  </Button>
                )}
                {s.role === "ENTITY_SURVEYOR" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleStatus(s)}
                    disabled={busy === s.membershipId}
                  >
                    {busy === s.membershipId ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : s.status === "ACTIVE" ? (
                      <>
                        <PauseCircle size={12} className="mr-1" /> Zawieś
                      </>
                    ) : (
                      <>
                        <PlayCircle size={12} className="mr-1" /> Aktywuj
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal transferu */}
      {transferFor && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setTransferFor(null)}
        >
          <div
            className="bg-white rounded-2xl border border-border shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-[#1e3a5f]">Transfer pacjentów</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Przenieś {transferFor.patients} pacjentów ankietera{" "}
              <span className="font-medium text-[#1e3a5f]">{transferFor.user.name}</span> do:
            </p>
            <select
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm mb-4"
            >
              <option value="">— wybierz ankietera —</option>
              {activeSurveyors
                .filter((a) => a.user.id !== transferFor.user.id)
                .map((a) => (
                  <option key={a.user.id} value={a.user.id}>
                    {a.user.name} ({a.patients} pacjentów)
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTransferFor(null)}>
                Anuluj
              </Button>
              <Button
                onClick={doTransfer}
                disabled={!transferTo || busy === "transfer"}
                className="bg-[#1e3a5f] hover:bg-[#152b47] text-white"
              >
                {busy === "transfer" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Przenieś pacjentów"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
