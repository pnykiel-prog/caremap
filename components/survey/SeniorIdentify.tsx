"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search, UserPlus, Check, ChevronRight } from "lucide-react";

interface SeniorMatch {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  city: string | null;
  phone: string | null;
  identificationConfidence: string;
  similarity: number;
}

interface SeniorData {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  isNew: boolean;
}

interface Props {
  onSelect: (senior: SeniorData) => void;
}

const searchSchema = z.object({
  firstName: z.string().min(1, "Podaj imię"),
  lastName: z.string().min(1, "Podaj nazwisko"),
  dateOfBirth: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

const newSeniorSchema = z.object({
  firstName: z.string().min(1, "Podaj imię"),
  lastName: z.string().min(1, "Podaj nazwisko"),
  dateOfBirth: z.string().min(1, "Podaj datę urodzenia"),
  gender: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

type SearchForm = z.infer<typeof searchSchema>;
type NewSeniorForm = z.infer<typeof newSeniorSchema>;

export function SeniorIdentify({ onSelect }: Props) {
  const [step, setStep] = useState<"search" | "results" | "new">("search");
  const [matches, setMatches] = useState<SeniorMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchForm = useForm<SearchForm>({ resolver: zodResolver(searchSchema) });
  const newForm = useForm<NewSeniorForm>({ resolver: zodResolver(newSeniorSchema) });

  async function onSearch(data: SearchForm) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seniors/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setMatches(json.data.matches);
      setStep("results");
    } catch {
      setError("Błąd wyszukiwania. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateNew(data: NewSeniorForm) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seniors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      onSelect({
        id: json.data.id,
        firstName: json.data.firstName,
        lastName: json.data.lastName,
        dateOfBirth: json.data.dateOfBirth,
        isNew: true,
      });
    } catch {
      setError("Błąd tworzenia rekordu. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  const confidenceLabel: Record<string, string> = {
    NEW_RECORD: "Nowy rekord",
    NAME_DOB: "Potwierdzone",
    NAME_DOB_EXTRA: "Potwierdzone+",
    STAFF_CONFIRMED: "Potwierdzone przez pracownika",
  };

  if (step === "search") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a5f]">Identyfikacja seniora</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Wyszukaj seniora w systemie. Jeśli nie istnieje, zostanie utworzony nowy rekord.
          </p>
        </div>
        <form onSubmit={searchForm.handleSubmit(onSearch)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Imię *</Label>
              <Input id="firstName" {...searchForm.register("firstName")} placeholder="np. Janina" />
              {searchForm.formState.errors.firstName && (
                <p className="text-xs text-red-500">{searchForm.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Nazwisko *</Label>
              <Input id="lastName" {...searchForm.register("lastName")} placeholder="np. Kowalska" />
              {searchForm.formState.errors.lastName && (
                <p className="text-xs text-red-500">{searchForm.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Data urodzenia (opcjonalnie)</Label>
              <Input id="dateOfBirth" type="date" {...searchForm.register("dateOfBirth")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Miejscowość (opcjonalnie)</Label>
              <Input id="city" {...searchForm.register("city")} placeholder="np. Solaris" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="bg-[#1e3a5f] hover:bg-[#152b47] text-white w-full">
            <Search size={16} className="mr-2" />
            {loading ? "Wyszukiwanie..." : "Wyszukaj seniora"}
          </Button>
        </form>
      </div>
    );
  }

  if (step === "results") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a5f]">Wyniki wyszukiwania</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {matches.length > 0
              ? `Znaleziono ${matches.length} pasujących rekordów. Wybierz właściwy lub utwórz nowy.`
              : "Nie znaleziono pasujących rekordów w systemie."}
          </p>
        </div>

        {matches.length > 0 && (
          <div className="space-y-2">
            {matches.map((m) => (
              <Card
                key={m.id}
                className="border border-gray-200 hover:border-[#1e3a5f] cursor-pointer transition-colors"
                onClick={() =>
                  onSelect({
                    id: m.id,
                    firstName: m.firstName,
                    lastName: m.lastName,
                    dateOfBirth: m.dateOfBirth ?? "",
                    isNew: false,
                  })
                }
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-[#1e3a5f]">
                        {m.firstName[0]}{m.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.dateOfBirth ? new Date(m.dateOfBirth).toLocaleDateString("pl-PL") : "—"}
                        {m.city ? ` · ${m.city}` : ""}
                        {m.phone ? ` · ${m.phone}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{confidenceLabel[m.identificationConfidence] ?? m.identificationConfidence}</span>
                    <span className="text-xs font-semibold text-[#1e3a5f]">{m.similarity}%</span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => setStep("search")} className="flex-1">
            Szukaj ponownie
          </Button>
          <Button
            onClick={() => {
              const firstName = searchForm.getValues("firstName");
              const lastName = searchForm.getValues("lastName");
              newForm.setValue("firstName", firstName);
              newForm.setValue("lastName", lastName);
              const dob = searchForm.getValues("dateOfBirth");
              if (dob) newForm.setValue("dateOfBirth", dob);
              setStep("new");
            }}
            className="flex-1 bg-[#1e3a5f] hover:bg-[#152b47] text-white"
          >
            <UserPlus size={16} className="mr-2" />
            Nowy rekord
          </Button>
        </div>
      </div>
    );
  }

  // step === "new"
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#1e3a5f]">Nowy senior</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Uzupełnij dane seniora. Zostanie utworzony nowy rekord w systemie.
        </p>
      </div>
      <form onSubmit={newForm.handleSubmit(onCreateNew)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Imię *</Label>
            <Input {...newForm.register("firstName")} />
            {newForm.formState.errors.firstName && (
              <p className="text-xs text-red-500">{newForm.formState.errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Nazwisko *</Label>
            <Input {...newForm.register("lastName")} />
            {newForm.formState.errors.lastName && (
              <p className="text-xs text-red-500">{newForm.formState.errors.lastName.message}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Data urodzenia *</Label>
            <Input type="date" {...newForm.register("dateOfBirth")} />
            {newForm.formState.errors.dateOfBirth && (
              <p className="text-xs text-red-500">{newForm.formState.errors.dateOfBirth.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Płeć</Label>
            <select
              {...newForm.register("gender")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— wybierz —</option>
              <option value="K">Kobieta</option>
              <option value="M">Mężczyzna</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Adres</Label>
          <Input {...newForm.register("address")} placeholder="ul. Różana 12" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Miejscowość</Label>
            <Input {...newForm.register("city")} placeholder="Solaris" />
          </div>
          <div className="space-y-1.5">
            <Label>Telefon</Label>
            <Input {...newForm.register("phone")} placeholder="501 234 567" />
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" type="button" onClick={() => setStep("results")} className="flex-1">
            Wróć
          </Button>
          <Button type="submit" disabled={loading} className="flex-1 bg-[#1e3a5f] hover:bg-[#152b47] text-white">
            <Check size={16} className="mr-2" />
            {loading ? "Tworzenie..." : "Utwórz i kontynuuj"}
          </Button>
        </div>
      </form>
    </div>
  );
}
