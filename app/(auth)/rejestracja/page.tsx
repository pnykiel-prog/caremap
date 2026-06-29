"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, User, Lock, Briefcase, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ROLES = [
  { value: "SOCIAL_WORKER", label: "Pracownik socjalny", description: "Przeprowadza wywiady środowiskowe i ankiety K1-K4" },
  { value: "NURSE", label: "Pielęgniarka", description: "Ocenia stan zdrowia i potrzeby pielęgnacyjne seniorów" },
  { value: "GP_DOCTOR", label: "Lekarz rodzinny", description: "Dokumentuje stan zdrowia i zalecenia medyczne" },
  { value: "MUNICIPALITY_WORKER", label: "Pracownik gminy", description: "Koordynuje działania opieki w gminie" },
  { value: "VOLUNTEER", label: "Wolontariusz", description: "Wspiera seniorów w codziennych czynnościach" },
  { value: "NGO_COORDINATOR", label: "Koordynator NGO", description: "Zarządza projektami organizacji pozarządowej" },
  { value: "PROVIDER_MANAGER", label: "Zarządca podmiotu", description: "Zarządza ofertą i dostępnością podmiotu opiekuńczego" },
  { value: "FAMILY_CAREGIVER", label: "Opiekun rodzinny", description: "Sprawuje opiekę nad seniorem jako członek rodziny" },
] as const;

type Step = 1 | 2 | 3;

interface FormData {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  role: string;
  organizationSlug: string;
}

const STEPS = [
  { icon: User, label: "Dane osobowe" },
  { icon: Briefcase, label: "Rola" },
  { icon: Lock, label: "Hasło" },
];

export default function RejestracjaPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    role: "",
    organizationSlug: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (key: keyof FormData, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const validateStep1 = () => {
    if (!form.name.trim() || form.name.trim().length < 2) return "Podaj imię i nazwisko (min. 2 znaki)";
    if (!form.email.match(/^[^@]+@[^@]+\.[^@]+$/)) return "Podaj prawidłowy adres email";
    if (!form.organizationSlug.trim()) return "Podaj identyfikator organizacji";
    return null;
  };

  const validateStep2 = () => {
    if (!form.role) return "Wybierz rolę";
    return null;
  };

  const validateStep3 = () => {
    if (form.password.length < 8) return "Hasło musi mieć co najmniej 8 znaków";
    if (form.password !== form.passwordConfirm) return "Hasła nie są zgodne";
    return null;
  };

  const handleNext = () => {
    setError(null);
    let err: string | null = null;
    if (step === 1) err = validateStep1();
    if (step === 2) err = validateStep2();
    if (err) { setError(err); return; }
    if (step < 3) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleSubmit = async () => {
    setError(null);
    const err = validateStep3();
    if (err) { setError(err); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
          organizationSlug: form.organizationSlug.trim().toLowerCase(),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Wystąpił błąd. Spróbuj ponownie.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Błąd połączenia. Sprawdź internet i spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Konto zostało zarejestrowane</h1>
          <p className="text-muted-foreground">
            Twoje konto oczekuje na akceptację przez administratora. Zostaniesz powiadomiony/-a, gdy dostęp zostanie przyznany.
          </p>
          <Link
            href="/logowanie"
            className="inline-block mt-2 px-6 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#16304f] transition-colors"
          >
            Przejdź do logowania
          </Link>
        </div>
      </div>
    );
  }

  const selectedRole = ROLES.find((r) => r.value === form.role);

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">CM</span>
            </div>
            <span className="text-xl font-bold text-[#1e3a5f]">CareMap</span>
          </div>
          <p className="text-sm text-muted-foreground">Zarejestruj konto w systemie opieki senioralnej</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, idx) => {
            const stepNum = (idx + 1) as Step;
            const isActive = stepNum === step;
            const isDone = stepNum < step;
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                      isDone ? "bg-green-500" : isActive ? "bg-[#1e3a5f]" : "bg-gray-200"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle size={14} className="text-white" />
                    ) : (
                      <Icon size={13} className={isActive ? "text-white" : "text-gray-400"} />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-[#1e3a5f]" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6 space-y-5">
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Step 1: Personal data */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#1e3a5f]">Dane osobowe i organizacja</h2>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Imię i nazwisko *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="np. Anna Kowalska"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Adres email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="np. a.kowalska@gmina.pl"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Identyfikator organizacji (gminy) *</label>
                  <input
                    type="text"
                    value={form.organizationSlug}
                    onChange={(e) => set("organizationSlug", e.target.value.toLowerCase().replace(/\s/g, "-"))}
                    placeholder="np. solaris"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Zapytaj administratora o identyfikator Twojej gminy</p>
                </div>
              </div>
            )}

            {/* Step 2: Role selection */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#1e3a5f]">Wybierz swoją rolę</h2>
                <div className="space-y-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => set("role", r.value)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        form.role === r.value
                          ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${form.role === r.value ? "text-[#1e3a5f]" : "text-gray-900"}`}>
                            {r.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                        </div>
                        {form.role === r.value && (
                          <div className="w-4 h-4 rounded-full bg-[#1e3a5f] flex-shrink-0 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Password */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#1e3a5f]">Utwórz hasło</h2>

                {/* Summary */}
                <div className="bg-[#f0f4f8] rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Imię i nazwisko</span>
                    <span className="font-medium">{form.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{form.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rola</span>
                    <span className="font-medium">{selectedRole?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Organizacja</span>
                    <span className="font-mono text-xs font-medium">{form.organizationSlug}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Hasło *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="Min. 8 znaków"
                      className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Powtórz hasło *</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.passwordConfirm}
                    onChange={(e) => set("passwordConfirm", e.target.value)}
                    placeholder="Powtórz hasło"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Po rejestracji konto będzie wymagało akceptacji administratora gminy.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-1">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-2.5 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Wstecz
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#16304f] transition-colors"
                >
                  Dalej
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#16304f] transition-colors disabled:opacity-60"
                >
                  {submitting ? "Rejestruję..." : "Zarejestruj się"}
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Masz już konto?{" "}
          <Link href="/logowanie" className="text-[#1e3a5f] font-medium hover:underline">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}
