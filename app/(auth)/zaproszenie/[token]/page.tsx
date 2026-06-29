"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Heart, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Invitation {
  email: string;
  role: "ENTITY_MANAGER" | "ENTITY_SURVEYOR";
  entity: { id: string; name: string; type: string };
  expiresAt: string;
}

export default function InvitationAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/invitations/${params.token}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setInvitation(j.data);
        else setError(j.error ?? "Nie można wczytać zaproszenia");
      })
      .finally(() => setLoading(false));
  }, [params.token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: params.token, name, password }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Nie udało się aktywować konta");
        return;
      }
      const ctx = invitation.role === "ENTITY_MANAGER" ? "manager" : "surveyor";
      const sign = await signIn("credentials", {
        email: invitation.email,
        password,
        redirect: false,
      });
      if (sign?.error) {
        setError("Konto utworzone, ale nie udało się zalogować. Zaloguj się ręcznie.");
        router.push("/logowanie");
        return;
      }
      router.push(`/auth/redirect?ctx=${ctx}`);
    } catch {
      setError("Błąd sieci");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }
  if (!invitation) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-border p-8 shadow-sm text-center">
          <h1 className="text-lg font-bold text-[#1e3a5f]">Zaproszenie nieaktywne</h1>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border shadow-sm p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1e3a5f]">Aktywacja konta</h1>
            <p className="text-xs text-muted-foreground">
              Zaproszenie od: <span className="font-medium">{invitation.entity.name}</span>
            </p>
          </div>
        </div>

        <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/10 rounded-lg p-3 mb-5 flex items-start gap-2.5">
          <CheckCircle2 size={16} className="text-[#1e3a5f] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            Email: <span className="font-medium text-[#1e3a5f]">{invitation.email}</span>
            <br />
            Rola: <span className="font-medium text-[#1e3a5f]">{invitation.role === "ENTITY_MANAGER" ? "Manager" : "Ankieter"}</span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 mb-4">
            <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm">Imię i nazwisko</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div>
            <Label htmlFor="password" className="text-sm">Ustaw hasło (min. 8 znaków)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1e3a5f] hover:bg-[#152b47] text-white"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" /> Aktywacja…
              </>
            ) : (
              "Aktywuj konto i zaloguj się"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
