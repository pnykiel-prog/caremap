"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Settings {
  channelPush: boolean;
  channelEmail: boolean;
  channelSms: boolean;
  autoSendPdfToSenior: boolean;
  sendPdfOnlyIfConsent: boolean;
  fallbackMopsName: string | null;
  fallbackMopsPhone: string | null;
  fallbackMopsEmail: string | null;
  reSurveyMonthsHigh: number;
  reSurveyMonthsMid: number;
  reSurveyMonthsLow: number;
}

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(initial);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(s),
      });
      const json = await res.json();
      if (!json.success) toast.error(json.error ?? "Błąd zapisu");
      else {
        toast.success("Ustawienia zapisane");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold text-[#1e3a5f] mb-3">Kanały powiadomień (P-10)</p>
        <p className="text-xs text-muted-foreground mb-3">
          MVP: tylko push w aplikacji. Email/SMS dostępne po podpięciu Resend (email) i Twilio/SMSAPI (SMS).
        </p>
        <div className="space-y-2">
          {[
            { key: "channelPush" as const, label: "Push (w przeglądarce / PWA)" },
            { key: "channelEmail" as const, label: "Email (Resend)", disabled: false },
            { key: "channelSms" as const, label: "SMS (wymaga klucza API + akceptacji kosztów)" },
          ].map((c) => (
            <label key={c.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s[c.key]}
                onChange={(e) => setS({ ...s, [c.key]: e.target.checked })}
                className="accent-[#1e3a5f] w-4 h-4"
              />
              <span className="text-sm">{c.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <p className="text-sm font-semibold text-[#1e3a5f] mb-3">Automatyczny PDF do seniora (P-09)</p>
        <p className="text-xs text-muted-foreground mb-3">
          Czy po wypełnieniu ankiety przez podmiot profesjonalny system ma wysyłać kopię raportu na
          email seniora.
        </p>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={s.autoSendPdfToSenior}
              onChange={(e) => setS({ ...s, autoSendPdfToSenior: e.target.checked })}
              className="accent-[#1e3a5f] w-4 h-4"
            />
            <span className="text-sm">Wysyłaj automatycznie</span>
          </label>
          <label className="flex items-center gap-2 ml-6">
            <input
              type="checkbox"
              checked={s.sendPdfOnlyIfConsent}
              onChange={(e) => setS({ ...s, sendPdfOnlyIfConsent: e.target.checked })}
              disabled={!s.autoSendPdfToSenior}
              className="accent-[#1e3a5f] w-4 h-4"
            />
            <span className={`text-sm ${!s.autoSendPdfToSenior ? "text-muted-foreground" : ""}`}>
              Tylko gdy senior wyraził zgodę na komunikację email
            </span>
          </label>
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <p className="text-sm font-semibold text-[#1e3a5f] mb-3">
          Interwały re-ankietowania (miesiące, GM-01/GM-07)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Poziom 6-7 (krytyczny)</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={s.reSurveyMonthsHigh}
              onChange={(e) => setS({ ...s, reSurveyMonthsHigh: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">Poziom 4-5</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={s.reSurveyMonthsMid}
              onChange={(e) => setS({ ...s, reSurveyMonthsMid: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">Poziom 1-3</Label>
            <Input
              type="number"
              min={1}
              max={36}
              value={s.reSurveyMonthsLow}
              onChange={(e) => setS({ ...s, reSurveyMonthsLow: Number(e.target.value) })}
            />
          </div>
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <p className="text-sm font-semibold text-[#1e3a5f] mb-3">
          Fallback MOPS/GOPS (GM-04 — pokazywany w raporcie gdy brak dopasowanych podmiotów)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Nazwa</Label>
            <Input
              value={s.fallbackMopsName ?? ""}
              onChange={(e) => setS({ ...s, fallbackMopsName: e.target.value || null })}
              placeholder="MOPS Solaris"
            />
          </div>
          <div>
            <Label className="text-xs">Telefon</Label>
            <Input
              value={s.fallbackMopsPhone ?? ""}
              onChange={(e) => setS({ ...s, fallbackMopsPhone: e.target.value || null })}
            />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={s.fallbackMopsEmail ?? ""}
              onChange={(e) => setS({ ...s, fallbackMopsEmail: e.target.value || null })}
            />
          </div>
        </div>
      </section>

      <div className="border-t border-border pt-5 flex justify-end">
        <Button
          onClick={save}
          disabled={busy}
          className="bg-[#1e3a5f] hover:bg-[#152b47] text-white"
        >
          {busy ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
          Zapisz ustawienia
        </Button>
      </div>
    </div>
  );
}
