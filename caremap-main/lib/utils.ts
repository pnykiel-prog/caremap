import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance } from "date-fns";
import { pl } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined, fmt = "dd.MM.yyyy"): string {
  if (!date) return "—";
  return format(new Date(date), fmt, { locale: pl });
}

export function formatRelative(date: Date | string): string {
  return formatDistance(new Date(date), new Date(), { addSuffix: true, locale: pl });
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .trim();
}

export const riskLevelLabel: Record<string, string> = {
  LOW: "Niskie",
  MEDIUM: "Średnie",
  HIGH: "Wysokie",
  CRITICAL: "Krytyczne",
};

export const riskLevelColor: Record<string, string> = {
  LOW: "text-green-700 bg-green-100",
  MEDIUM: "text-yellow-700 bg-yellow-100",
  HIGH: "text-orange-700 bg-orange-100",
  CRITICAL: "text-red-700 bg-red-100",
};
