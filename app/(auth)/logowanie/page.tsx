"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  Heart,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  ChevronLeft,
  Users,
  Building2,
  Stethoscope,
  HeartHandshake,
  HelpingHand,
  ClipboardList,
  UserCog,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Step = "context" | "entity-type" | "sub-role" | "credentials";
type Context = "senior" | "jst" | "surveyor" | "manager";
type EntityType = "POZ" | "CUS" | "CARE_COMPANY" | "NGO" | "HOSPICE" | "OTHER";

const loginSchema = z.object({
  email: z.string().email("Podaj prawidłowy adres email"),
  password: z.string().min(1, "Hasło jest wymagane"),
});
type LoginFormData = z.infer<typeof loginSchema>;

const ENTITY_TYPES: { code: EntityType; label: string; icon: typeof Briefcase }[] = [
  { code: "POZ", label: "POZ / przychodnia", icon: Stethoscope },
  { code: "CUS", label: "Centrum Usług Środowiskowych", icon: HelpingHand },
  { code: "CARE_COMPANY", label: "Firma opieki domowej", icon: Briefcase },
  { code: "NGO", label: "NGO / Wolontariat", icon: HeartHandshake },
  { code: "HOSPICE", label: "Hospicjum", icon: Heart },
  { code: "OTHER", label: "Inny podmiot", icon: Building2 },
];

function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl");

  const [step, setStep] = useState<Step>("context");
  const [context, setContext] = useState<Context | null>(null);
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const ctxLabel: Record<Context, string> = {
    senior: "Senior / Rodzina / Opiekun",
    jst: "Pracownik gminy (JST)",
    surveyor: "Ankieter podmiotu",
    manager: "Manager podmiotu",
  };

  const onContextChoice = (ctx: Context) => {
    setContext(ctx);
    if (ctx === "senior" || ctx === "jst") {
      setStep("credentials");
    } else {
      setStep("entity-type");
    }
  };

  const goBack = () => {
    if (step === "credentials") {
      if (context === "manager" || context === "surveyor") setStep("sub-role");
      else setStep("context");
    } else if (step === "sub-role") setStep("entity-type");
    else if (step === "entity-type") setStep("context");
  };

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (result?.error) {
      setError("Nieprawidłowy email lub hasło. Sprawdź dane i spróbuj ponownie.");
      return;
    }
    const target = `/auth/redirect?ctx=${context ?? "jst"}${
      callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
    }`;
    router.push(target);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-[#1e3a5f] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#C9A84C]/5" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#C9A84C] flex items-center justify-center shadow-lg">
            <Heart className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-white font-bold text-2xl tracking-tight">
              Care<span className="text-[#C9A84C]">Map</span>
            </span>
          </div>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Platforma koordynacji
            <br />
            opieki seniorów
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-md">
            Wybierz rolę odpowiednią dla Ciebie. System dopasuje portal do Twoich uprawnień.
          </p>
        </div>

        <div className="relative">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} CareMap · Wszelkie prawa zastrzeżone
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-6 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl text-[#1e3a5f]">
              Care<span className="text-[#C9A84C]">Map</span>
            </span>
          </div>

          {/* Stepper indicator */}
          <div className="flex items-center gap-2 mb-6">
            {["context", "entity-type", "sub-role", "credentials"].map((s, i) => {
              const stepsLinear: Step[] =
                context === "senior" || context === "jst"
                  ? ["context", "credentials"]
                  : ["context", "entity-type", "sub-role", "credentials"];
              const active = stepsLinear.indexOf(step) >= stepsLinear.indexOf(s as Step);
              if (!stepsLinear.includes(s as Step)) return null;
              return (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    active ? "bg-[#1e3a5f]" : "bg-gray-200"
                  }`}
                />
              );
            })}
          </div>

          {step !== "context" && (
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[#1e3a5f] mb-4 transition-colors"
            >
              <ChevronLeft size={14} /> wstecz
            </button>
          )}

          {/* STEP 1 — wybór kontekstu */}
          {step === "context" && (
            <div>
              <div className="space-y-2 mb-6">
                <h1 className="text-2xl font-bold text-[#1e3a5f]">Jak chcesz się zalogować?</h1>
                <p className="text-muted-foreground text-sm">
                  Wybierz rolę, w jakiej korzystasz z systemu CareMap.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  {
                    code: "senior" as Context,
                    label: "Senior / Rodzina / Opiekun",
                    desc: "Mój własny senior — historia badań, mapa opieki, kontakt z opiekunem",
                    icon: Users,
                  },
                  {
                    code: "jst" as Context,
                    label: "Pracownik gminy (JST)",
                    desc: "Panel JST, alerty, raporty, zarządzanie podmiotami opieki",
                    icon: ClipboardList,
                  },
                  {
                    code: "surveyor" as Context,
                    label: "Podmiot profesjonalny",
                    desc: "POZ, CUS, firma opieki — wypełnianie ankiet pacjentów",
                    icon: Stethoscope,
                  },
                ].map(({ code, label, desc, icon: Icon }) => (
                  <button
                    key={code}
                    onClick={() => onContextChoice(code)}
                    className="w-full text-left p-4 rounded-xl border border-border bg-white hover:border-[#1e3a5f] hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/10 group-hover:bg-[#1e3a5f] flex items-center justify-center flex-shrink-0 transition-colors">
                        <Icon size={18} className="text-[#1e3a5f] group-hover:text-white transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1e3a5f]">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 — typ podmiotu */}
          {step === "entity-type" && (
            <div>
              <div className="space-y-2 mb-6">
                <h1 className="text-2xl font-bold text-[#1e3a5f]">Typ podmiotu</h1>
                <p className="text-muted-foreground text-sm">
                  Wybierz typ Twojego podmiotu profesjonalnego.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {ENTITY_TYPES.map(({ code, label, icon: Icon }) => (
                  <button
                    key={code}
                    onClick={() => {
                      setEntityType(code);
                      setStep("sub-role");
                    }}
                    className="p-4 rounded-xl border border-border bg-white hover:border-[#1e3a5f] hover:shadow-md transition-all text-left"
                  >
                    <Icon size={20} className="text-[#1e3a5f] mb-2" />
                    <p className="text-sm font-medium text-[#1e3a5f] leading-tight">{label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 — podrolę */}
          {step === "sub-role" && (
            <div>
              <div className="space-y-2 mb-6">
                <h1 className="text-2xl font-bold text-[#1e3a5f]">Twoja rola w podmiocie</h1>
                <p className="text-muted-foreground text-sm">
                  Loguję się jako:
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setContext("manager");
                    setStep("credentials");
                  }}
                  className="w-full text-left p-4 rounded-xl border border-border bg-white hover:border-[#1e3a5f] hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/10 group-hover:bg-[#1e3a5f] flex items-center justify-center flex-shrink-0 transition-colors">
                      <UserCog size={18} className="text-[#1e3a5f] group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#1e3a5f]">Manager podmiotu</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Zarządzanie pracownikami, transferem pacjentów, raporty całego podmiotu
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setContext("surveyor");
                    setStep("credentials");
                  }}
                  className="w-full text-left p-4 rounded-xl border border-border bg-white hover:border-[#1e3a5f] hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/10 group-hover:bg-[#1e3a5f] flex items-center justify-center flex-shrink-0 transition-colors">
                      <ClipboardList size={18} className="text-[#1e3a5f] group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#1e3a5f]">Ankieter / Pracownik</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Wypełnianie ankiet pacjentów, lista przypisanych podopiecznych
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 — credentials */}
          {step === "credentials" && (
            <div>
              <div className="space-y-2 mb-6">
                <h1 className="text-2xl font-bold text-[#1e3a5f]">Zaloguj się</h1>
                <p className="text-muted-foreground text-sm">
                  {context ? `Kontekst: ${ctxLabel[context]}` : "Podaj swoje dane dostępu"}
                  {entityType && context !== "senior" && context !== "jst"
                    ? ` · ${ENTITY_TYPES.find((e) => e.code === entityType)?.label}`
                    : ""}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Adres email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jan.kowalski@example.pl"
                    autoComplete="email"
                    className={`h-11 ${errors.email ? "border-red-400" : ""}`}
                    {...register("email")}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Hasło
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={`h-11 pr-10 ${errors.password ? "border-red-400" : ""}`}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500">{errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-[#1e3a5f] hover:bg-[#152b47] text-white font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Logowanie…
                    </>
                  ) : (
                    "Zaloguj się"
                  )}
                </Button>
              </form>

              {/* Linki rejestracji zależnie od kontekstu */}
              <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
                {context === "senior" && (
                  <p>
                    Nie masz konta?{" "}
                    <Link href="/rejestracja?ctx=senior" className="text-[#1e3a5f] font-medium hover:underline">
                      Zarejestruj się
                    </Link>
                  </p>
                )}
                {(context === "surveyor" || context === "manager") && (
                  <p>
                    Podmiot nie jest jeszcze w systemie?{" "}
                    <Link
                      href={`/rejestracja-podmiotu${entityType ? `?type=${entityType}` : ""}`}
                      className="text-[#1e3a5f] font-medium hover:underline"
                    >
                      Zarejestruj podmiot
                    </Link>
                  </p>
                )}
                {context === "jst" && (
                  <p>
                    Nie masz konta?{" "}
                    <Link href="/rejestracja" className="text-[#1e3a5f] font-medium hover:underline">
                      Zarejestruj się
                    </Link>
                  </p>
                )}
              </div>

              <div className="mt-5 flex items-start gap-2.5 p-3.5 bg-[#1e3a5f]/5 rounded-lg border border-[#1e3a5f]/10">
                <ShieldCheck size={15} className="text-[#1e3a5f] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Połączenie jest szyfrowane. Dane seniorów chronione są zgodnie z RODO.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPageWrapper() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
