"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ChevronRight, ChevronDown, ChevronUp, Loader2, RotateCcw, ArrowRight } from "lucide-react";

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

interface Props {
  previousSurveyId: string;
  templateId: string;
  senior: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
  };
  sections: Section[];
  previousAnswers: Record<string, number>;
}

export default function ReFillForm({
  previousSurveyId,
  templateId,
  senior,
  sections,
  previousAnswers,
}: Props) {
  const router = useRouter();

  // Current answers start as copies of previous answers
  const [answers, setAnswers] = useState<Record<string, number>>({ ...previousAnswers });
  // Which questions have their option list expanded for editing
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const allQuestions = sections.flatMap((s) => s.questions);
  const totalQuestions = allQuestions.length;
  const changedCount = allQuestions.filter(
    (q) => answers[q.code] !== undefined && answers[q.code] !== previousAnswers[q.code]
  ).length;

  function toggleExpand(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleAnswer(code: string, value: number) {
    setAnswers((prev) => ({ ...prev, [code]: value }));
    // Auto-collapse after picking
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seniorId: senior.id,
          templateId,
          answers,
          previousSurveyId,
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold text-[#1e3a5f]">Wypełnij ponownie ankietę</h1>
        <p className="text-sm text-muted-foreground">
          Senior:{" "}
          <span className="font-semibold text-[#1e3a5f]">
            {senior.firstName} {senior.lastName}
          </span>
          {senior.dateOfBirth && (
            <> · ur. {new Date(senior.dateOfBirth).toLocaleDateString("pl-PL")}</>
          )}
        </p>
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
          Przy każdym pytaniu widoczna jest <strong>poprzednia odpowiedź</strong>. Jeśli chcesz ją zmienić — kliknij przycisk <strong>Zmień</strong> i wybierz nową odpowiedź. Jeśli odpowiedź pozostaje taka sama — po prostu przejdź dalej.
        </p>
      </div>

      {/* Change summary */}
      <div className="flex items-center gap-3 p-3 rounded-lg border text-sm
        bg-[#1e3a5f]/5 border-[#1e3a5f]/15">
        <span className="text-[#1e3a5f] font-semibold">{totalQuestions} pytań</span>
        <span className="text-gray-300">·</span>
        {changedCount > 0 ? (
          <span className="text-amber-700 font-semibold flex items-center gap-1.5">
            <RotateCcw size={13} />
            {changedCount}{" "}
            {changedCount === 1
              ? "odpowiedź zmieniona"
              : changedCount <= 4
              ? "odpowiedzi zmienione"
              : "odpowiedzi zmienionych"}
          </span>
        ) : (
          <span className="text-gray-400">Brak zmian w stosunku do poprzedniej ankiety</span>
        )}
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <Card key={section.id} className="bg-white shadow-sm">
          <CardContent className="p-0">
            {/* Section header */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#1e3a5f] text-white">
                {section.code}
              </span>
              <h2 className="text-sm font-semibold text-[#1e3a5f]">{section.title}</h2>
            </div>

            <div className="divide-y divide-gray-100">
              {section.questions.map((q, qi) => {
                const currentVal  = answers[q.code];
                const prevVal     = previousAnswers[q.code];
                const isExpanded  = expanded.has(q.code);
                const changed     = currentVal !== undefined && currentVal !== prevVal;

                const prevOption    = q.options.find((o) => o.value === prevVal);
                const currentOption = q.options.find((o) => o.value === currentVal);

                return (
                  <div
                    key={q.id}
                    className={`px-5 py-4 transition-colors ${
                      changed ? "bg-amber-50" : ""
                    }`}
                  >
                    {/* Question text + Zmień button */}
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm leading-relaxed flex-1">
                        <span className="text-[#1e3a5f] font-semibold mr-1.5">{qi + 1}.</span>
                        {q.text}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleExpand(q.code)}
                        className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                          isExpanded
                            ? "bg-[#1e3a5f] border-[#1e3a5f] text-white"
                            : changed
                            ? "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
                            : "bg-white border-gray-300 text-gray-600 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
                        }`}
                      >
                        {isExpanded
                          ? <><ChevronUp size={12} /> Zwiń</>
                          : <><ChevronDown size={12} /> Zmień</>
                        }
                      </button>
                    </div>

                    {/* Always-visible: previous answer */}
                    <div className="mt-3 space-y-2">
                      {/* Previous answer row */}
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs text-gray-400 w-32 flex-shrink-0">
                          Poprzednia odpowiedź:
                        </span>
                        {prevOption ? (
                          <span className="flex items-center gap-2 text-sm">
                            <span className="inline-flex w-5 h-5 rounded-full bg-gray-300 text-white items-center justify-center text-xs font-bold flex-shrink-0">
                              {prevOption.value}
                            </span>
                            <span className="text-gray-600">{prevOption.label}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">brak odpowiedzi</span>
                        )}
                      </div>

                      {/* New answer row — shown only when changed */}
                      {changed && currentOption && (
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-amber-700 font-semibold w-32 flex-shrink-0">
                            Nowa odpowiedź:
                          </span>
                          <span className="flex items-center gap-2 text-sm">
                            <span className="inline-flex w-5 h-5 rounded-full bg-amber-500 text-white items-center justify-center text-xs font-bold flex-shrink-0">
                              {currentOption.value}
                            </span>
                            <span className="text-amber-800 font-semibold">{currentOption.label}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAnswers((prev) => ({ ...prev, [q.code]: prevVal }));
                              setExpanded((prev) => {
                                const next = new Set(prev);
                                next.delete(q.code);
                                return next;
                              });
                            }}
                            className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline"
                          >
                            Cofnij zmianę
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expandable options list */}
                    {isExpanded && (
                      <div className="mt-3 grid grid-cols-1 gap-1.5 pl-1">
                        {q.options.map((opt) => {
                          const isCurrent  = currentVal === opt.value;
                          const isPrevious = prevVal === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleAnswer(q.code, opt.value)}
                              className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${
                                isCurrent && !isPrevious
                                  ? "border-amber-400 bg-amber-50 text-amber-900 font-medium"
                                  : isCurrent && isPrevious
                                  ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f] font-medium"
                                  : isPrevious && !isCurrent
                                  ? "border-gray-300 bg-gray-50 text-gray-600"
                                  : "border-gray-200 bg-white hover:border-[#1e3a5f]/40 hover:bg-gray-50 text-gray-700"
                              }`}
                            >
                              <span
                                className={`inline-flex w-5 h-5 rounded-full mr-2 items-center justify-center text-xs font-bold border ${
                                  isCurrent && !isPrevious
                                    ? "bg-amber-500 border-amber-500 text-white"
                                    : isCurrent
                                    ? "bg-[#1e3a5f] border-[#1e3a5f] text-white"
                                    : "border-gray-300 text-gray-400"
                                }`}
                              >
                                {opt.value}
                              </span>
                              {opt.label}
                              {isPrevious && !isCurrent && (
                                <span className="ml-2 text-xs text-gray-400 font-normal">← poprzednia</span>
                              )}
                              {isPrevious && isCurrent && (
                                <span className="ml-2 text-xs text-[#1e3a5f]/60 font-normal">← poprzednia (wybrana)</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Error */}
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {/* Submit button */}
      <div className="pb-8">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-[#1e3a5f] hover:bg-[#152b47] text-white h-12 text-base font-semibold"
        >
          {submitting ? (
            <><Loader2 size={16} className="mr-2 animate-spin" /> Zapisywanie...</>
          ) : (
            <>
              <Check size={16} className="mr-2" />
              Zapisz ankietę i pokaż wyniki
              <ChevronRight size={16} className="ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
