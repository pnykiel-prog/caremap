"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Search,
  UserCheck,
  ShieldAlert,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SearchHit {
  seniorId: string;
  pseudonimId: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  city: string | null;
  similarity: number;
  circle: "MINE" | "ENTITY" | "SYSTEM";
  lastSurvey: { date: string; careLevel: number | null; entityType: string | null } | null;
}

const CIRCLE_LABEL: Record<SearchHit["circle"], { label: string; cls: string }> = {
  MINE: { label: "Mój pacjent", cls: "bg-green-100 text-green-700" },
  ENTITY: { label: "W podmiocie", cls: "bg-blue-100 text-blue-700" },
  SYSTEM: { label: "W systemie", cls: "bg-gray-100 text-gray-700" },
};

export default function NowyPacjentPage() {
  const router = useRouter();

  // Pola wyszukiwania / formularza
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [pesel, setPesel] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [gender, setGender] = useState<"K" | "M" | "">("");

  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedExisting, setSelectedExisting] = useState<SearchHit | null>(null);
  const [showCollision, setShowCollision] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = firstName.length >= 2 && lastName.length >= 2;

  // Debounced live search (ANK-07)
  useEffect(() => {
    if (!canSearch) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch("/api/patients/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            dateOfBirth: dateOfBirth || undefined,
            pesel: pesel || undefined,
          }),
        });
        const json = await res.json();
        if (json.success) setHits(json.data);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [firstName, lastName, dateOfBirth, pesel, canSearch]);

  const pickExisting = (h: SearchHit) => {
    setSelectedExisting(h);
    setShowCollision(true);
  };

  const confirmExisting = () => {
    setShowCollision(false);
    // Pre-wypełnij minimalne dane
    if (selectedExisting?.dateOfBirth) setDateOfBirth(selectedExisting.dateOfBirth);
    if (selectedExisting?.city) setCity(selectedExisting.city);
  };

  const rejectExisting = () => {
    setShowCollision(false);
    setSelectedExisting(null);
  };

  const canSubmit = useMemo(() => {
    if (!consent) return false;
    if (selectedExisting) return true;
    return firstName.length >= 2 && lastName.length >= 2 && dateOfBirth.length === 10;
  }, [consent, selectedExisting, firstName, lastName, dateOfBirth]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const body = selectedExisting
        ? {
            seniorId: selectedExisting.seniorId,
            consentGiven: true,
            pesel: pesel || undefined,
          }
        : {
            firstName,
            lastName,
            dateOfBirth,
            gender: gender || undefined,
            address: address || undefined,
            postalCode: postalCode || undefined,
            city: city || undefined,
            phone: phone || undefined,
            email: email || undefined,
            pesel: pesel || undefined,
            consentGiven: true,
          };
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Nie udało się zapisać pacjenta");
        return;
      }
      router.push(`/portal/ankieter/pacjent/${json.data.seniorId}`);
    } catch {
      setError("Błąd sieci");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <Link
        href="/portal/ankieter"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f]"
      >
        <ChevronLeft size={14} /> Moi pacjenci
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Dodaj pacjenta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System sprawdzi w bazie, czy ta osoba nie jest już zarejestrowana — w razie dopasowania
          podpowie istniejący wpis (model koncentrycznych kręgów — ANK-12).
        </p>
      </div>

      {/* Komunikat kolizji */}
      {showCollision && selectedExisting && (
        <Card className="border-2 border-[#C9A84C] bg-[#C9A84C]/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#C9A84C] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#1e3a5f]">
                  Znaleziono pasujący wpis — {selectedExisting.firstName} {selectedExisting.lastName}
                </p>
                <p className="text-sm text-muted-foreground mt-1.5">
                  {selectedExisting.lastSurvey
                    ? `Ostatnia ankieta dla tej osoby została wypełniona ${selectedExisting.lastSurvey.date}${
                        selectedExisting.lastSurvey.entityType
                          ? ` przez podmiot typu ${selectedExisting.lastSurvey.entityType}`
                          : ""
                      }${
                        selectedExisting.lastSurvey.careLevel
                          ? `, poziom opieki ${selectedExisting.lastSurvey.careLevel}`
                          : ""
                      }.`
                    : "Osoba istnieje w bazie, ale nie miała jeszcze wypełnionej ankiety."}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Czy chcesz wypełnić kolejną ankietę dla tego pacjenta?
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={confirmExisting}
                    className="bg-[#1e3a5f] hover:bg-[#152b47] text-white"
                  >
                    Tak, powiąż z istniejącym
                  </Button>
                  <Button size="sm" variant="outline" onClick={rejectExisting}>
                    Nie, nowy pacjent
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wybrany istniejący */}
      {selectedExisting && !showCollision && (
        <Card className="border-2 border-green-500/40 bg-green-50">
          <CardContent className="p-4 flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1e3a5f]">
                Powiązano z: {selectedExisting.firstName} {selectedExisting.lastName}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Po zapisie pacjent zostanie przypisany do Ciebie. Historia ankiet zostanie zachowana.
              </p>
            </div>
            <button
              onClick={() => setSelectedExisting(null)}
              className="text-xs text-muted-foreground hover:text-[#1e3a5f]"
            >
              Zmień
            </button>
          </CardContent>
        </Card>
      )}

      {/* Pola identyfikacji */}
      <Card className="bg-white">
        <CardContent className="p-5 space-y-4">
          <p className="text-sm font-semibold text-[#1e3a5f] flex items-center gap-2">
            <Search size={14} /> Identyfikacja pacjenta
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fn" className="text-sm">Imię *</Label>
              <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ln" className="text-sm">Nazwisko *</Label>
              <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dob" className="text-sm">Data urodzenia *</Label>
              <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pesel" className="text-sm">PESEL (opcjonalnie)</Label>
              <Input
                id="pesel"
                value={pesel}
                onChange={(e) => setPesel(e.target.value.replace(/\D/g, "").slice(0, 11))}
                maxLength={11}
                placeholder="11 cyfr — weryfikator tożsamości"
              />
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <ShieldAlert size={10} />
                PESEL zapisywany jako bcrypt hash — nie da się go odczytać (RODO art. 9 ust. 2 lit. h).
              </p>
            </div>
          </div>

          {/* Live wyniki wyszukiwania */}
          {canSearch && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                {searching ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Wyszukiwanie w trzech kręgach (moi / podmiot / system)…
                  </>
                ) : hits.length === 0 ? (
                  <>Brak dopasowań — możesz utworzyć nowego pacjenta.</>
                ) : (
                  <>Znaleziono {hits.length} możliwych dopasowań:</>
                )}
              </div>
              {hits.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {hits.map((h) => (
                    <button
                      key={h.seniorId}
                      type="button"
                      onClick={() => pickExisting(h)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedExisting?.seniorId === h.seniorId
                          ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                          : "border-border bg-white hover:border-[#1e3a5f]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[#1e3a5f]">
                          {h.firstName} {h.lastName}
                        </p>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CIRCLE_LABEL[h.circle].cls}`}
                        >
                          {CIRCLE_LABEL[h.circle].label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {h.dateOfBirth && <span>ur. {h.dateOfBirth}</span>}
                        {h.city && <span>· {h.city}</span>}
                        <span>· dopasowanie {Math.round(h.similarity * 100)}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pełne dane (tylko gdy nie powiązano z istniejącym) */}
      {!selectedExisting && canSearch && (
        <Card className="bg-white">
          <CardContent className="p-5 space-y-4">
            <p className="text-sm font-semibold text-[#1e3a5f]">Pełne dane pacjenta</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender" className="text-sm">Płeć</Label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "K" | "M" | "")}
                  className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm"
                >
                  <option value="">—</option>
                  <option value="K">Kobieta</option>
                  <option value="M">Mężczyzna</option>
                </select>
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
                <Label htmlFor="city" className="text-sm">Miasto</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zgoda RODO (ANK-08) */}
      {canSearch && (
        <Card className="bg-white border-2 border-[#1e3a5f]/20">
          <CardContent className="p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#1e3a5f]"
              />
              <div>
                <p className="text-sm font-medium text-[#1e3a5f] flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#1e3a5f]" />
                  Pacjent wyraził zgodę na przetwarzanie danych
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Zgoda obejmuje przetwarzanie danych identyfikacyjnych, kontaktowych oraz wyników
                  ankiety K1-K4 w ramach systemu CareMap (art. 9 ust. 2 lit. h RODO). Data, godzina
                  i Twój identyfikator zostaną zapisane w rejestrze zgód.
                </p>
              </div>
            </label>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/portal/ankieter">
          <Button variant="outline">Anuluj</Button>
        </Link>
        <Button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="bg-[#1e3a5f] hover:bg-[#152b47] text-white"
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" /> Zapisywanie…
            </>
          ) : selectedExisting ? (
            "Powiąż z istniejącym i przejdź do ankiety"
          ) : (
            "Utwórz pacjenta"
          )}
        </Button>
      </div>
    </div>
  );
}
