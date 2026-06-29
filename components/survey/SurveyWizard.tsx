"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SeniorIdentify } from "./SeniorIdentify";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";

interface Question {
  id: string;
  code: string;
  text: string;
  order: number;
  options: { value: number; label: string }[];
}

interface Section {
  id: string;
  code: string;
  title: string;
  order: number;
  maxScore: number;
  questions: Question[];
}

interface Template {
  id: string;
  name: string;
  sections: Section[];
}

interface SeniorData {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  isNew: boolean;
}

interface Props {
  template: Template;
}

type WizardStep = "senior" | "reporter" | "questions" | "summary";

interface ReporterData {
  reporterName: string;
  reporterPhone: string;
  reporterEmail: string;
  reporterRole: string;
}

const STEP_LABELS: Record<WizardStep, string> = {
  senior: "Senior",
  reporter: "Dane kontaktowe",
  questions: "Kwestionariusz",
  summary: "Podsumowanie",
};

export function SurveyWizard({ template }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("senior");
  const [senior, setSenior] = useState<SeniorData | null>(null);
  const [reporter, setReporter] = useState<ReporterData>({ reporterName: "", reporterPhone: "", reporterEmail: "", reporterRole: "" });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const sections = template.sections.sort((a, b) => a.order - b.order);
  const currentSection = sections[currentSectionIdx];
  const totalQuestions = sections.flatMap((s) => s.questions).length;
  const answeredQuestions = Object.keys(answers).length;
  const progressPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const allCurrentSectionAnswered =
    currentSection?.questions.every((q) => answers[q.code] !== undefined) ?? false;

  function handleAnswer(code: string, value: number) {
    setAnswers((prev) => ({ ...prev, [code]: value }));
  }

  function nextSection() {
    if (currentSectionIdx < sections.length - 1) {
      setCurrentSectionIdx((i) => i + 1);
    } else {
      setStep("summary");
    }
  }

  function prevSection() {
    if (currentSectionIdx > 0) {
      setCurrentSectionIdx((i) => i - 1);
    } else {
      setStep("reporter");
    }
  }

  async function handleSubmit() {
    if (!senior) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seniorId: senior.id,
          templateId: template.id,
          answers,
          reporterName: reporter.reporterName || undefined,
          reporterPhone: reporter.reporterPhone || undefined,
          reporterEmail: reporter.reporterEmail || undefined,
          reporterRole: reporter.reporterRole || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      router.push(`/ankieta/${json.data.id}/wyniki`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Błąd zapisu ankiety");
      setSubmitting(false);
    }
  }

  const STEP_ORDER: WizardStep[] = ["senior", "reporter", "questions", "summary"];
  const stepIdx = STEP_ORDER.indexOf(step);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          {STEP_ORDER.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i < stepIdx
                    ? "bg-[#1e3a5f] text-white"
                    : i === stepIdx
                    ? "bg-[#C9A84C] text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i < stepIdx ? <Check size={12} /> : i + 1}
              </div>
              <span className={i === stepIdx ? "font-semibold text-[#1e3a5f]" : "text-muted-foreground"}>
                {STEP_LABELS[s]}
              </span>
              {i < STEP_ORDER.length - 1 && <div className="w-6 h-px bg-gray-300" />}
            </div>
          ))}
        </div>
        {step === "questions" && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Postęp wypełniania</span>
              <span>{answeredQuestions}/{totalQuestions} pytań</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}
      </div>

      <Card className="bg-white shadow-sm">
        <CardContent className="p-6">
          {/* STEP 1: Senior identification */}
          {step === "senior" && (
            <SeniorIdentify
              onSelect={(s) => {
                setSenior(s);
                setStep("reporter");
              }}
            />
          )}

          {/* STEP 2: Reporter contact info */}
          {step === "reporter" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-[#1e3a5f]">Dane osoby wypełniającej</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Dane kontaktowe do raportu — opcjonalne.
                </p>
                {senior && (
                  <div className="mt-3 p-3 rounded-lg bg-[#1e3a5f]/5 border border-[#1e3a5f]/10">
                    <p className="text-sm font-medium text-[#1e3a5f]">
                      Senior: {senior.firstName} {senior.lastName}
                    </p>
                    {senior.dateOfBirth && (
                      <p className="text-xs text-muted-foreground">
                        Data urodzenia: {new Date(senior.dateOfBirth).toLocaleDateString("pl-PL")}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Imię i nazwisko</Label>
                  <Input
                    value={reporter.reporterName}
                    onChange={(e) => setReporter((r) => ({ ...r, reporterName: e.target.value }))}
                    placeholder="np. Jan Kowalski"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Telefon</Label>
                    <Input
                      value={reporter.reporterPhone}
                      onChange={(e) => setReporter((r) => ({ ...r, reporterPhone: e.target.value }))}
                      placeholder="501 234 567"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={reporter.reporterEmail}
                      onChange={(e) => setReporter((r) => ({ ...r, reporterEmail: e.target.value }))}
                      placeholder="jan@gmina.pl"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Rola / stanowisko</Label>
                  <Input
                    value={reporter.reporterRole}
                    onChange={(e) => setReporter((r) => ({ ...r, reporterRole: e.target.value }))}
                    placeholder="np. Pracownik socjalny"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep("senior")} className="flex-1">
                  <ChevronLeft size={16} className="mr-1" /> Wróć
                </Button>
                <Button
                  onClick={() => setStep("questions")}
                  className="flex-1 bg-[#1e3a5f] hover:bg-[#152b47] text-white"
                >
                  Dalej <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Questions */}
          {step === "questions" && currentSection && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#1e3a5f] text-white">
                    {currentSection.code}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Sekcja {currentSectionIdx + 1} z {sections.length}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-[#1e3a5f]">{currentSection.title}</h2>
              </div>

              <div className="space-y-5">
                {currentSection.questions.sort((a, b) => a.order - b.order).map((q, qi) => (
                  <div key={q.id} className="space-y-2">
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground mr-2">{qi + 1}.</span>
                      {q.text}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {q.options.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleAnswer(q.code, opt.value)}
                          className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${
                            answers[q.code] === opt.value
                              ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f] font-medium"
                              : "border-gray-200 hover:border-[#1e3a5f]/40 hover:bg-gray-50"
                          }`}
                        >
                          <span className={`inline-flex w-5 h-5 rounded-full mr-2 items-center justify-center text-xs font-bold border ${
                            answers[q.code] === opt.value
                              ? "bg-[#1e3a5f] border-[#1e3a5f] text-white"
                              : "border-gray-300 text-gray-400"
                          }`}>
                            {opt.value}
                          </span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={prevSection} className="flex-1">
                  <ChevronLeft size={16} className="mr-1" /> Wróć
                </Button>
                <Button
                  onClick={nextSection}
                  disabled={!allCurrentSectionAnswered}
                  className="flex-1 bg-[#1e3a5f] hover:bg-[#152b47] text-white disabled:opacity-50"
                >
                  {currentSectionIdx < sections.length - 1 ? (
                    <>Dalej <ChevronRight size={16} className="ml-1" /></>
                  ) : (
                    <>Podsumowanie <ChevronRight size={16} className="ml-1" /></>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Summary */}
          {step === "summary" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-[#1e3a5f]">Podsumowanie ankiety</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Sprawdź dane i zapisz ankietę. Po zapisaniu zobaczysz wyniki i poziom opieki.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-[#1e3a5f]/5 border border-[#1e3a5f]/10 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Senior</p>
                  <p className="text-sm font-semibold text-[#1e3a5f]">
                    {senior?.firstName} {senior?.lastName}
                  </p>
                  {senior?.dateOfBirth && (
                    <p className="text-xs text-muted-foreground">
                      Data urodzenia: {new Date(senior.dateOfBirth).toLocaleDateString("pl-PL")}
                    </p>
                  )}
                </div>

                {sections.map((s) => {
                  const sectionAnswers = s.questions.map((q) => answers[q.code] ?? null);
                  const filled = sectionAnswers.filter((v) => v !== null).length;
                  const total = s.questions.length;
                  const sum = sectionAnswers.reduce<number>((acc, v) => acc + (v ?? 0), 0);
                  const pct = Math.round((sum / s.maxScore) * 100);
                  return (
                    <div key={s.id} className="p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-[#1e3a5f] mr-2">{s.code}</span>
                        <span className="text-sm">{s.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{filled}/{total} pytań</span>
                        <span className="font-semibold text-[#1e3a5f]">{sum}/{s.maxScore} pkt ({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("questions");
                    setCurrentSectionIdx(sections.length - 1);
                  }}
                  className="flex-1"
                >
                  <ChevronLeft size={16} className="mr-1" /> Wróć
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-[#1e3a5f] hover:bg-[#152b47] text-white"
                >
                  {submitting ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> Zapisywanie...</>
                  ) : (
                    <><Check size={16} className="mr-2" /> Zapisz i pokaż wyniki</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
