"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  Loader2,
  Stethoscope,
  HelpingHand,
  Briefcase,
  HeartHandshake,
  Building2,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

type EntityType = "POZ" | "CUS" | "CARE_COMPANY" | "NGO" | "HOSPICE" | "OTHER";

const TYPE_OPTIONS: { code: EntityType; label: string; icon: typeof Briefcase }[] = [
  { code: "POZ", label: "POZ / przychodnia", icon: Stethoscope },
  { code: "CUS", label: "CUS", icon: HelpingHand },
  { code: "CARE_COMPANY", label: "Firma opieki domowej", icon: Briefcase },
  { code: "NGO", label: "NGO / Wolontariat", icon: HeartHandshake },
  { code: "HOSPICE", label: "Hospicjum", icon: Heart },
  { code: "OTHER", label: "Inny", icon: Building2 },
];

interface Gmina {
  id: string;
  name: string;
  city: string | null;
  slug: string;
}

function EntityRegistrationForm() {
  const sp = useSearchParams();
  const initialType = (sp.get("type") as EntityType) || "POZ";

  const [type, setType] = useState<EntityType>(initialType);
  const [name, setName] = useState("");
  const [nip, setNip] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [contactManagerName, setContactManagerName] = useState("");
  const [contactManagerEmail, setContactManagerEmail] = useState("");
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());

  const [orgs, setOrgs] = useState<Gmina[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/surveyor-entities/public")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setOrgs(j.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const canSubmit = useMemo(
    () =>
      name.length >= 2 &&
      city.length >= 2 &&
      contactManagerName.length >= 2 &&
      /\S+@\S+\.\S+/.test(contactManagerEmail) &&
      selectedOrgs.size >= 1,
    [name, city, contactManagerName, contactManagerEmail, selectedOrgs],
  );

  const toggleOrg = (id: string) => {
    setSelectedOrgs((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/surveyor-entities/public", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          nip: nip || null,
          address: address || null,
          postalCode: postalCode || null,
          city,
          phone: phone || null,
          email: email || null,
          description: description || null,
          organizationIds: Array.from(selectedOrgs),
          contactManagerName,
          contactManagerEmail,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Nie udało się zapisać wniosku");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Błąd sieci. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-border p-8 shadow-sm text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-[#1e3a5f]">Wniosek został złożony</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Administrator gminy zweryfikuje dane i wyśle dostęp do panelu na adres{" "}
            <span className="font-medium text-[#1e3a5f]">{contactManagerEmail}</span>. Sprawdź
            pocztę za 1–2 dni robocze.
          </p>
          <Link
            href="/logowanie"
            className="inline-block mt-6 text-sm text-[#1e3a5f] font-medium hover:underline"
          >
            Wróć do logowania
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/logowanie"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f] mb-4"
        >
          <ChevronLeft size={14} /> wstecz do logowania
        </Link>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1e3a5f]">Rejestracja podmiotu profesjonalnego</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Wypełnij wniosek — administrator gminy zweryfikuje dane i przyzna dostęp do panelu
            ankietera. Możesz aplikować równolegle do kilku gmin (P-12).
          </p>

          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 mb-4">
              <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={submit} className="space-y-6">
            {/* Typ podmiotu */}
            <section>
              <Label className="text-sm font-medium text-[#1e3a5f] mb-2 block">Typ podmiotu</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TYPE_OPTIONS.map((t) => {
                  const Icon = t.icon;
                  const active = type === t.code;
                  return (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => setType(t.code)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                        active
                          ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]"
                          : "border-border text-muted-foreground hover:border-[#1e3a5f]/40"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Dane podmiotu */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="name" className="text-sm">Nazwa podmiotu *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="nip" className="text-sm">NIP</Label>
                <Input id="nip" value={nip} onChange={(e) => setNip(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm">Telefon</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address" className="text-sm">Adres</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="postalCode" className="text-sm">Kod pocztowy</Label>
                <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="city" className="text-sm">Miasto *</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email" className="text-sm">Email podmiotu</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="description" className="text-sm">Opis działalności</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Krótko opisz oferowane usługi i obszar działania"
                />
              </div>
            </section>

            {/* Manager kontaktowy */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium text-[#1e3a5f]">Manager kontaktowy</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Osoba która otrzyma dostęp do panelu managera po zatwierdzeniu wniosku.
                </p>
              </div>
              <div>
                <Label htmlFor="cm-name" className="text-sm">Imię i nazwisko *</Label>
                <Input
                  id="cm-name"
                  value={contactManagerName}
                  onChange={(e) => setContactManagerName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cm-email" className="text-sm">Email służbowy *</Label>
                <Input
                  id="cm-email"
                  type="email"
                  value={contactManagerEmail}
                  onChange={(e) => setContactManagerEmail(e.target.value)}
                  required
                />
              </div>
            </section>

            {/* Wybór gmin */}
            <section>
              <Label className="text-sm font-medium text-[#1e3a5f] mb-2 block">
                Gminy w których podmiot ma działać *
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                Każda gmina zatwierdza wniosek osobno. Możesz później dodać kolejne gminy z panelu managera.
              </p>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> Wczytywanie listy gmin…
                </div>
              ) : orgs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Brak dostępnych gmin w systemie.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {orgs.map((o) => {
                    const checked = selectedOrgs.has(o.id);
                    return (
                      <label
                        key={o.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer text-sm transition-colors ${
                          checked
                            ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                            : "border-border hover:border-[#1e3a5f]/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOrg(o.id)}
                          className="accent-[#1e3a5f]"
                        />
                        <span className="font-medium text-[#1e3a5f]">{o.name}</span>
                        {o.city && <span className="text-muted-foreground">· {o.city}</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Link
                href="/logowanie"
                className="text-sm text-muted-foreground hover:text-[#1e3a5f]"
              >
                Anuluj
              </Link>
              <Button
                type="submit"
                disabled={!canSubmit || submitting}
                className="bg-[#1e3a5f] hover:bg-[#152b47] text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="mr-2 animate-spin" /> Wysyłanie…
                  </>
                ) : (
                  "Wyślij wniosek"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EntityRegistrationPage() {
  return (
    <Suspense>
      <EntityRegistrationForm />
    </Suspense>
  );
}
