"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Check, Loader2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PROVIDER_TYPES = [
  "Dom Pomocy Spolecznej (DPS)",
  "Prywatny dom seniora",
  "Centrum Uslug Srodowiskowych (CUS)",
  "Dom Dziennego Wsparcia (DDS)",
  "Firma opieki domowej",
  "Teleopieka / monitoring",
  "Swietlica / Klub seniora",
  "Wolontariat / NGO",
  "Hospicjum domowe",
  "Inne",
];

const step1Schema = z.object({
  name: z.string().min(2, "Podaj nazwę podmiotu"),
  type: z.string().min(1, "Wybierz typ podmiotu"),
  city: z.string().min(1, "Podaj miejscowość"),
  address: z.string().optional(),
  postalCode: z.string().optional(),
});

const step2Schema = z.object({
  phone: z.string().optional(),
  email: z.string().email("Nieprawidłowy adres email").optional().or(z.literal("")),
  website: z.string().url("Nieprawidłowy adres URL").optional().or(z.literal("")),
  description: z.string().optional(),
});

const step3Schema = z.object({
  coverageType: z.enum(["ADDRESS_ONLY", "RADIUS", "CITY_LIST"]),
  coverageRadius: z.number().int().min(0).optional(),
  coverageCitiesStr: z.string().optional(),
  capacity: z.number().int().min(0),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;

const STEPS = ["Podstawowe dane", "Kontakt", "Zasięg i pojemność", "Potwierdzenie"];

export default function RejestracjaPodmiotuPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<Step1 | null>(null);
  const [step2Data, setStep2Data] = useState<Step2 | null>(null);
  const [step3Data, setStep3Data] = useState<Step3 | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema) });
  const form3 = useForm<Step3>({
    resolver: zodResolver(step3Schema),
    defaultValues: { coverageType: "ADDRESS_ONLY", capacity: 0 },
  });

  const coverageType = form3.watch("coverageType");

  async function handleSubmit() {
    if (!step1Data || !step2Data || !step3Data) return;
    setSubmitting(true);
    setError("");
    try {
      const coverageCities = step3Data.coverageCitiesStr
        ? step3Data.coverageCitiesStr.split(",").map((c) => c.trim()).filter(Boolean)
        : undefined;

      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...step1Data,
          ...step2Data,
          coverageType: step3Data.coverageType,
          coverageRadius: step3Data.coverageRadius || undefined,
          coverageCities,
          capacity: step3Data.capacity,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      router.push(`/podmioty/${json.data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/podmioty"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f] transition-colors"
        >
          <ChevronLeft size={16} />
          Podmioty
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-[#1e3a5f]">Rejestracja podmiotu</span>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
              i < step ? "bg-[#1e3a5f] text-white" : i === step ? "bg-[#C9A84C] text-white" : "bg-gray-200 text-gray-500"
            )}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span className={cn("hidden sm:block", i === step ? "font-semibold text-[#1e3a5f]" : "text-muted-foreground text-xs")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-4 h-px bg-gray-300 flex-shrink-0" />}
          </div>
        ))}
      </div>

      <Card className="bg-white shadow-sm">
        <CardContent className="p-6">
          {/* Step 1 — Basic info */}
          {step === 0 && (
            <form onSubmit={form1.handleSubmit((data) => { setStep1Data(data); setStep(1); })} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#1e3a5f]">Podstawowe dane</h2>
                <p className="text-sm text-muted-foreground mt-1">Nazwa, typ i lokalizacja podmiotu</p>
              </div>
              <div className="space-y-1.5">
                <Label>Nazwa podmiotu *</Label>
                <Input {...form1.register("name")} placeholder="np. Dom Seniora Słoneczny" />
                {form1.formState.errors.name && <p className="text-xs text-red-500">{form1.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Typ podmiotu *</Label>
                <select {...form1.register("type")} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">— wybierz —</option>
                  {PROVIDER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {form1.formState.errors.type && <p className="text-xs text-red-500">{form1.formState.errors.type.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Adres</Label>
                <Input {...form1.register("address")} placeholder="ul. Słoneczna 5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Kod pocztowy</Label>
                  <Input {...form1.register("postalCode")} placeholder="00-001" />
                </div>
                <div className="space-y-1.5">
                  <Label>Miejscowość *</Label>
                  <Input {...form1.register("city")} placeholder="Solaris" />
                  {form1.formState.errors.city && <p className="text-xs text-red-500">{form1.formState.errors.city.message}</p>}
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#152b47] text-white">
                Dalej <ChevronRight size={16} className="ml-1" />
              </Button>
            </form>
          )}

          {/* Step 2 — Contact */}
          {step === 1 && (
            <form onSubmit={form2.handleSubmit((data) => { setStep2Data(data); setStep(2); })} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#1e3a5f]">Dane kontaktowe</h2>
                <p className="text-sm text-muted-foreground mt-1">Opcjonalne — do wyświetlenia na profilu</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Telefon</Label>
                  <Input {...form2.register("phone")} placeholder="12 345 67 89" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" {...form2.register("email")} placeholder="info@podmiot.pl" />
                  {form2.formState.errors.email && <p className="text-xs text-red-500">{form2.formState.errors.email.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Strona WWW</Label>
                <Input {...form2.register("website")} placeholder="https://www.podmiot.pl" />
                {form2.formState.errors.website && <p className="text-xs text-red-500">{form2.formState.errors.website.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Opis (opcjonalnie)</Label>
                <textarea
                  {...form2.register("description")}
                  rows={3}
                  placeholder="Krótki opis działalności..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(0)} className="flex-1">
                  <ChevronLeft size={16} className="mr-1" /> Wróć
                </Button>
                <Button type="submit" className="flex-1 bg-[#1e3a5f] hover:bg-[#152b47] text-white">
                  Dalej <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </form>
          )}

          {/* Step 3 — Coverage */}
          {step === 2 && (
            <form onSubmit={form3.handleSubmit((data: Step3) => { setStep3Data(data); setStep(3); })} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#1e3a5f]">Zasięg i pojemność</h2>
                <p className="text-sm text-muted-foreground mt-1">Gdzie świadczone są usługi?</p>
              </div>
              <div className="space-y-2">
                <Label>Typ zasięgu *</Label>
                {[
                  { value: "ADDRESS_ONLY", label: "Placówka stacjonarna", desc: "Osoby przyjeżdżają do placówki" },
                  { value: "RADIUS", label: "Usługa mobilna — promień", desc: "Obsługa w określonym promieniu od siedziby" },
                  { value: "CITY_LIST", label: "Usługa mobilna — gminy", desc: "Obsługa wybranych miejscowości" },
                ].map((opt) => (
                  <label key={opt.value} className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    coverageType === opt.value ? "border-[#1e3a5f] bg-[#1e3a5f]/5" : "border-gray-200 hover:border-gray-300"
                  )}>
                    <input type="radio" {...form3.register("coverageType")} value={opt.value} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {coverageType === "RADIUS" && (
                <div className="space-y-1.5">
                  <Label>Promień obsługi (km)</Label>
                  <Input type="number" min={1} {...form3.register("coverageRadius", { valueAsNumber: true })} placeholder="np. 30" />
                </div>
              )}
              {coverageType === "CITY_LIST" && (
                <div className="space-y-1.5">
                  <Label>Obsługiwane miejscowości</Label>
                  <Input {...form3.register("coverageCitiesStr")} placeholder="np. Solaris, Lemowo, Pirxów" />
                  <p className="text-xs text-muted-foreground">Oddziel miejscowości przecinkami</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Pojemność (liczba miejsc, 0 = nieograniczona)</Label>
                <Input type="number" min={0} {...form3.register("capacity", { valueAsNumber: true })} placeholder="np. 24" />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ChevronLeft size={16} className="mr-1" /> Wróć
                </Button>
                <Button type="submit" className="flex-1 bg-[#1e3a5f] hover:bg-[#152b47] text-white">
                  Dalej <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </form>
          )}

          {/* Step 4 — Confirmation */}
          {step === 3 && step1Data && step2Data && step3Data && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#1e3a5f]">Potwierdzenie</h2>
                <p className="text-sm text-muted-foreground mt-1">Sprawdź dane przed rejestracją</p>
              </div>

              <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} className="text-[#1e3a5f]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1e3a5f]">{step1Data.name}</p>
                    <p className="text-muted-foreground">{step1Data.type}</p>
                  </div>
                </div>
                {[
                  { label: "Adres", value: [step1Data.address, step1Data.city, step1Data.postalCode].filter(Boolean).join(", ") },
                  step2Data.phone ? { label: "Telefon", value: step2Data.phone } : null,
                  step2Data.email ? { label: "Email", value: step2Data.email } : null,
                  { label: "Zasięg", value: { ADDRESS_ONLY: "Placówka stacjonarna", RADIUS: `Promień ${step3Data.coverageRadius ?? "?"} km`, CITY_LIST: step3Data.coverageCitiesStr || "Lista gmin" }[step3Data.coverageType] },
                  step3Data.capacity > 0 ? { label: "Pojemność", value: `${step3Data.capacity} miejsc` } : null,
                ].filter(Boolean).map((row) => row && (
                  <div key={row.label} className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium text-right max-w-48 truncate">{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Status po rejestracji</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Oczekujący</span>
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                  <ChevronLeft size={16} className="mr-1" /> Wróć
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-[#1e3a5f] hover:bg-[#152b47] text-white">
                  {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" />Rejestrowanie...</> : <><Check size={16} className="mr-2" />Zarejestruj podmiot</>}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
