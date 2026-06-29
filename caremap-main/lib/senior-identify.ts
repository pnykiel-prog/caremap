import bcrypt from "bcryptjs";

export interface SeniorMatchInput {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  city?: string;
  phone?: string;
  email?: string;
  pesel?: string;
}

export interface SeniorMatch {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  city: string | null;
  phone: string | null;
  identificationConfidence: string;
  similarity: number;
}

function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function nameSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().trim();
  const dist = levenshtein(norm(a), norm(b));
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

export function scoreSeniorMatch(
  candidate: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
    city: string | null;
    phone: string | null;
    email: string | null;
  },
  input: SeniorMatchInput,
): number {
  const firstSim = nameSimilarity(candidate.firstName, input.firstName);
  const lastSim = nameSimilarity(candidate.lastName, input.lastName);
  if (firstSim < 0.6 || lastSim < 0.6) return 0;

  let score = (firstSim + lastSim) / 2;

  if (input.dateOfBirth && candidate.dateOfBirth) {
    const inputDob = new Date(input.dateOfBirth).toISOString().slice(0, 10);
    const candidateDob = candidate.dateOfBirth.toISOString().slice(0, 10);
    if (inputDob === candidateDob) score += 0.4;
  }

  if (input.city && candidate.city) {
    if (input.city.toLowerCase().trim() === candidate.city.toLowerCase().trim()) score += 0.1;
  }

  if (input.phone && candidate.phone) {
    const normPhone = (p: string) => p.replace(/\D/g, "");
    if (normPhone(input.phone) === normPhone(candidate.phone)) score += 0.2;
  }

  if (input.email && candidate.email) {
    if (input.email.toLowerCase() === candidate.email.toLowerCase()) score += 0.2;
  }

  return Math.min(score, 1);
}

// ─── GM-05 — bcrypt hash PESEL ────────────────────────────────────────────────

/**
 * Czy ciąg cyfr ma poprawną sumę kontrolną PESEL (11 cyfr).
 * Walidujemy zanim policzymy hash — żeby uniknąć śmieci w bazie.
 */
export function isValidPesel(pesel: string): boolean {
  const clean = pesel.replace(/\D/g, "");
  if (!/^\d{11}$/.test(clean)) return false;
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(clean[i]), 0);
  const check = (10 - (sum % 10)) % 10;
  return check === Number(clean[10]);
}

export async function hashPesel(pesel: string): Promise<string> {
  return bcrypt.hash(pesel.replace(/\D/g, ""), 10);
}

export async function comparePesel(pesel: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pesel.replace(/\D/g, ""), hash);
}

// ─── ANK-07 — trzy kręgi wyszukiwania ─────────────────────────────────────────

export type SearchCircle = "MINE" | "ENTITY" | "SYSTEM";

export interface PatientSearchHit {
  seniorId: string;
  pseudonimId: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  city: string | null;
  similarity: number;
  circle: SearchCircle;
  // ANK-12 / P-02 — nie zwracamy nazwiska ankietera, tylko typ podmiotu + datę
  lastSurvey?: {
    date: string;
    careLevel: number | null;
    entityType: string | null;
  } | null;
}
