export const SECTION_MAX = { K1: 24, K2A: 30, K2BC: 21, K3: 30, K4: 30 };

export function calcScores(answers: Record<string, number>, sections: { code: string; questions: { code: string }[] }[]) {
  const sum = (codes: string[]) => codes.reduce((acc, code) => acc + (answers[code] ?? 0), 0);

  const k1q = sections.find((s) => s.code === "K1")?.questions.map((q) => q.code) ?? [];
  const k2aq = sections.find((s) => s.code === "K2A")?.questions.map((q) => q.code) ?? [];
  const k2bcq = sections.find((s) => s.code === "K2BC")?.questions.map((q) => q.code) ?? [];
  const k3q = sections.find((s) => s.code === "K3")?.questions.map((q) => q.code) ?? [];
  const k4q = sections.find((s) => s.code === "K4")?.questions.map((q) => q.code) ?? [];

  const p = (v: number, max: number) => Math.round((v / max) * 100);
  return {
    k1: p(sum(k1q), 24),
    k2: p(sum([...k2aq, ...k2bcq]), 51),
    k3: p(sum(k3q), 30),
    k4: p(sum(k4q), 30),
  };
}

export function getCareLevel({ k1, k2, k3, k4 }: Record<string, number>): number {
  if (k2 < 25) return 7;
  if (k2 <= 40 && k1 <= 40) return 7;
  if (k2 >= 80 && k1 >= 40 && k4 >= 60) return 1;
  if (k2 >= 60 && k1 >= 40 && k4 >= 40) return 2;
  if (k2 >= 40 && k1 >= 60 && k4 >= 40) return 3;
  if (k2 >= 20 && k1 >= 60 && k4 >= 40) return 4;
  if (k2 >= 20 && k2 <= 50 && k1 <= 50 && k4 < 50) return 6;
  if (k2 >= 20 && k1 <= 59) return 5;
  return 3;
}

export const CARE_LEVELS = {
  1: { label: "Samodzielny/a", color: "#16a34a", bg: "#dcfce7" },
  2: { label: "Samodzielny/a + wsparcie cyfrowe", color: "#65a30d", bg: "#ecfccb" },
  3: { label: "Niewielka pomoc rodziny", color: "#ca8a04", bg: "#fef9c3" },
  4: { label: "Duza pomoc rodziny", color: "#d97706", bg: "#fef3c7" },
  5: { label: "Profesjonalna opieka domowa", color: "#ea580c", bg: "#ffedd5" },
  6: { label: "Lokal serwisowany ze stala opieka", color: "#dc2626", bg: "#fee2e2" },
  7: { label: "Calodobowa opieka instytucjonalna", color: "#b91c1c", bg: "#fee2e2" },
} as const;

export const LEVEL_PROVIDER_TYPES: Record<number, string[]> = {
  1: ["Teleopieka / monitoring", "Swietlica / Klub seniora", "Wolontariat / NGO"],
  2: ["Teleopieka / monitoring", "Centrum Uslug Srodowiskowych (CUS)", "Swietlica / Klub seniora"],
  3: ["Centrum Uslug Srodowiskowych (CUS)", "Firma opieki domowej", "Wolontariat / NGO"],
  4: ["Firma opieki domowej", "Dom Dziennego Wsparcia (DDS)", "Centrum Uslug Srodowiskowych (CUS)"],
  5: ["Firma opieki domowej", "Dom Dziennego Wsparcia (DDS)"],
  6: ["Prywatny dom seniora", "Dom Pomocy Spolecznej (DPS)"],
  7: ["Dom Pomocy Spolecznej (DPS)", "Prywatny dom seniora", "Hospicjum domowe"],
};
