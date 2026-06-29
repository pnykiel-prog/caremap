"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface FormState {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "K" | "M" | "";
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  pesel: string;
}

const empty: FormState = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  postalCode: "",
  city: "",
  phone: "",
  email: "",
  pesel: "",
};

export function ManualForm() {
  const router = useRouter();
  const [s, setS] = useState<FormState>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    s.firstName.trim().length >= 2 &&
    s.lastName.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(s.dateOfBirth);

  const submit = async (startSurvey: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/seniors/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rows: [
            {
              firstName: s.firstName.trim(),
              lastName: s.lastName.trim(),
              dateOfBirth: s.dateOfBirth,
              gender: s.gender || null,
              address: s.address || null,
              postalCode: s.postalCode || null,
              city: s.city || null,
              phone: s.phone || null,
              email: s.email || null,
              pesel: s.pesel || null,
            },
          ],
          forceCreate: false,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Nie udało się zapisać");
        return;
      }
      const result = json.data.results[0];
      if (result.status === "ERROR") {
        setError(`Błąd wiersza: ${result.error}`);
        return;
      }
      if (result.status === "SKIPPED_DUPLICATE") {
        toast.warning(`Pominięto — podobny senior już istnieje: ${result.matchedName}`);
        return;
      }
      toast.success("Senior dodany");
      if (startSurvey) {
        router.push(`/ankieta/nowa?seniorId=${result.seniorId}`);
      } else {
        router.push(`/seniorzy`);
      }
    } catch {
      setError("Błąd sieci");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      className="space-y-5"
    >
      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <section>
        <p className="text-sm font-semibold text-[#1e3a5f] mb-3">Dane identyfikacyjne</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" className="text-sm">Imię *</Label>
            <Input
              id="firstName"
              value={s.firstName}
              onChange={(e) => setS({ ...s, firstName: e.target.value })}
              required
              minLength={2}
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-sm">Nazwisko *</Label>
            <Input
              id="lastName"
              value={s.lastName}
              onChange={(e) => setS({ ...s, lastName: e.target.value })}
              required
              minLength={2}
            />
          </div>
          <div>
            <Label htmlFor="dob" className="text-sm">Data urodzenia *</Label>
            <Input
              id="dob"
              type="date"
              value={s.dateOfBirth}
              onChange={(e) => setS({ ...s, dateOfBirth: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="gender" className="text-sm">Płeć</Label>
            <select
              id="gender"
              value={s.gender}
              onChange={(e) => setS({ ...s, gender: e.target.value as "K" | "M" | "" })}
              className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm"
            >
              <option value="">—</option>
              <option value="K">Kobieta</option>
              <option value="M">Mężczyzna</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="pesel" className="text-sm">PESEL (opcjonalnie)</Label>
            <Input
              id="pesel"
              value={s.pesel}
              onChange={(e) => setS({ ...s, pesel: e.target.value.replace(/\D/g, "").slice(0, 11) })}
              placeholder="11 cyfr — zwiększa pewność identyfikacji przy re-badaniu"
              maxLength={11}
            />
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <ShieldAlert size={10} />
              PESEL zapisywany jako bcrypt hash — nie da się odczytać (RODO art. 9 ust. 2 lit. h).
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <p className="text-sm font-semibold text-[#1e3a5f] mb-3">Adres zamieszkania</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="address" className="text-sm">Ulica i numer</Label>
            <Input
              id="address"
              value={s.address}
              onChange={(e) => setS({ ...s, address: e.target.value })}
              placeholder="ul. Słoneczna 12"
            />
          </div>
          <div>
            <Label htmlFor="postal" className="text-sm">Kod pocztowy</Label>
            <Input
              id="postal"
              value={s.postalCode}
              onChange={(e) => setS({ ...s, postalCode: e.target.value })}
              placeholder="35-001"
            />
          </div>
          <div>
            <Label htmlFor="city" className="text-sm">Miasto</Label>
            <Input
              id="city"
              value={s.city}
              onChange={(e) => setS({ ...s, city: e.target.value })}
              placeholder="Solaris"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <p className="text-sm font-semibold text-[#1e3a5f] mb-3">Kontakt</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone" className="text-sm">Telefon</Label>
            <Input
              id="phone"
              value={s.phone}
              onChange={(e) => setS({ ...s, phone: e.target.value })}
              placeholder="501 234 567"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              value={s.email}
              onChange={(e) => setS({ ...s, email: e.target.value })}
            />
          </div>
        </div>
      </section>

      <div className="border-t border-border pt-5 flex flex-col sm:flex-row gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => submit(true)}
          disabled={!canSubmit || busy}
        >
          Zapisz i rozpocznij ankietę
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit || busy}
          className="bg-[#1e3a5f] hover:bg-[#152b47] text-white"
        >
          {busy ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" />
              Zapisywanie…
            </>
          ) : (
            <>
              <CheckCircle2 size={14} className="mr-2" />
              Zapisz seniora
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
