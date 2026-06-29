"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

// ─── Pola docelowe ────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: "firstName", label: "Imię", required: true, aliases: ["imie", "imię", "firstname", "first_name"] },
  { key: "lastName", label: "Nazwisko", required: true, aliases: ["nazwisko", "lastname", "last_name", "surname"] },
  { key: "dateOfBirth", label: "Data urodzenia", required: true, aliases: ["dataurodzenia", "data_urodzenia", "data urodzenia", "dateofbirth", "date_of_birth", "dob"] },
  { key: "gender", label: "Płeć", required: false, aliases: ["plec", "płeć", "gender", "sex"] },
  { key: "address", label: "Adres", required: false, aliases: ["adres", "ulica", "address", "street"] },
  { key: "postalCode", label: "Kod pocztowy", required: false, aliases: ["kodpocztowy", "kod_pocztowy", "kod pocztowy", "postalcode", "postal_code", "zip"] },
  { key: "city", label: "Miasto", required: false, aliases: ["miasto", "city"] },
  { key: "phone", label: "Telefon", required: false, aliases: ["telefon", "tel", "phone"] },
  { key: "email", label: "Email", required: false, aliases: ["email", "e-mail", "mail"] },
  { key: "pesel", label: "PESEL", required: false, aliases: ["pesel"] },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

// ─── Parser CSV / TSV ─────────────────────────────────────────────────────────

function parseCsv(text: string): string[][] {
  // Auto-detekcja separatora (najpopularniejszy znak w pierwszej linii)
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts = {
    ",": (firstLine.match(/,/g) ?? []).length,
    ";": (firstLine.match(/;/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
  };
  const sep = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ",") as "," | ";" | "\t";

  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        current.push(cell);
        cell = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        current.push(cell);
        if (current.some((c) => c.trim() !== "")) rows.push(current);
        current = [];
        cell = "";
      } else {
        cell += ch;
      }
    }
  }
  if (cell !== "" || current.length > 0) {
    current.push(cell);
    if (current.some((c) => c.trim() !== "")) rows.push(current);
  }
  return rows;
}

// Mapuj nagłówki na klucze kolumn (case-insensitive, ignoruje białe znaki)
function detectMapping(headers: string[]): Record<number, ColumnKey | null> {
  const map: Record<number, ColumnKey | null> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim().replace(/[_\s-]+/g, "");
    let matched: ColumnKey | null = null;
    for (const col of COLUMNS) {
      if (col.key.toLowerCase() === h || col.aliases.some((a) => a.replace(/[_\s-]+/g, "") === h)) {
        matched = col.key;
        break;
      }
    }
    map[i] = matched;
  }
  return map;
}

// Normalizuj datę z różnych formatów do YYYY-MM-DD
function normalizeDate(input: string): string | null {
  if (!input) return null;
  const v = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // DD.MM.YYYY | DD-MM-YYYY | DD/MM/YYYY
  const m = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function normalizeGender(input: string | undefined): "K" | "M" | "" {
  if (!input) return "";
  const v = input.trim().toUpperCase();
  if (v === "K" || v === "F" || v === "KOBIETA" || v === "FEMALE") return "K";
  if (v === "M" || v === "MEZCZYZNA" || v === "MĘŻCZYZNA" || v === "MALE") return "M";
  return "";
}

// ─── Komponent ────────────────────────────────────────────────────────────────

interface ParsedRow {
  rowIndex: number;
  data: Record<ColumnKey, string>;
  errors: string[];
}

interface ImportResultRow {
  rowIndex: number;
  status: "CREATED" | "SKIPPED_DUPLICATE" | "ERROR";
  seniorId?: string;
  error?: string;
  matchedName?: string;
}

export function ImportForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<number, ColumnKey | null>>({});
  const [filename, setFilename] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResultRow[] | null>(null);
  const [forceCreate, setForceCreate] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setParseError(null);
    setResults(null);
    setFilename(file.name);

    // Tylko proste tekstowe formaty — xlsx nie wspierane bez bibioteki
    if (/\.xlsx?$/i.test(file.name)) {
      setParseError(
        "Pliki .xlsx nie są bezpośrednio wspierane. Otwórz plik w Excelu → Plik → Zapisz jako → CSV UTF-8 (rozdzielany przecinkami), a następnie wgraj go tutaj.",
      );
      return;
    }

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setParseError("Plik musi zawierać nagłówek + przynajmniej 1 wiersz danych.");
      return;
    }

    const hdr = rows[0];
    setHeaders(hdr);
    const map = detectMapping(hdr);
    setMapping(map);

    // Sprawdź czy wymagane kolumny zostały rozpoznane
    const mappedKeys = new Set(Object.values(map).filter(Boolean));
    const missing = COLUMNS.filter((c) => c.required && !mappedKeys.has(c.key));
    if (missing.length > 0) {
      setParseError(
        `Nie rozpoznano wymaganych kolumn: ${missing.map((m) => m.label).join(", ")}. Sprawdź pierwszy wiersz pliku.`,
      );
      // Wciąż pokażemy preview, użytkownik zobaczy które kolumny są puste
    }

    const dataRows: ParsedRow[] = [];
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const data: Record<ColumnKey, string> = {
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
      const errors: string[] = [];

      for (let c = 0; c < cells.length; c++) {
        const key = map[c];
        if (!key) continue;
        const value = (cells[c] ?? "").trim();
        if (key === "dateOfBirth") {
          const norm = normalizeDate(value);
          if (!norm) {
            errors.push(`Niepoprawna data: "${value}"`);
            data.dateOfBirth = value;
          } else {
            data.dateOfBirth = norm;
          }
        } else if (key === "gender") {
          data.gender = normalizeGender(value);
        } else {
          data[key] = value;
        }
      }

      if (!data.firstName) errors.push("Brak imienia");
      if (!data.lastName) errors.push("Brak nazwiska");
      if (!data.dateOfBirth) errors.push("Brak daty urodzenia");

      dataRows.push({ rowIndex: r - 1, data, errors });
    }
    setParsed(dataRows);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setParsed(null);
    setHeaders([]);
    setMapping({});
    setFilename("");
    setResults(null);
    setParseError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = async () => {
    if (!parsed) return;
    const valid = parsed.filter((r) => r.errors.length === 0);
    if (valid.length === 0) {
      toast.error("Brak poprawnych wierszy do importu");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/seniors/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rows: valid.map((r) => ({
            firstName: r.data.firstName,
            lastName: r.data.lastName,
            dateOfBirth: r.data.dateOfBirth,
            gender: r.data.gender || null,
            address: r.data.address || null,
            postalCode: r.data.postalCode || null,
            city: r.data.city || null,
            phone: r.data.phone || null,
            email: r.data.email || null,
            pesel: r.data.pesel || null,
          })),
          forceCreate,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Błąd importu");
        return;
      }
      setResults(json.data.results);
      const s = json.data.summary;
      toast.success(
        `Import zakończony: ${s.created} dodano, ${s.skipped} pominięto, ${s.errors} błędów`,
      );
      if (s.created > 0) {
        setTimeout(() => router.refresh(), 1200);
      }
    } catch {
      toast.error("Błąd sieci");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const tpl =
      "firstName,lastName,dateOfBirth,gender,address,postalCode,city,phone,email,pesel\n" +
      "Janina,Kowalska,1945-03-15,K,ul. Lipowa 5,35-001,Solaris,501234567,jk@example.pl,\n" +
      "Stanisław,Nowak,1938-07-22,M,ul. Słowackiego 5,35-060,Solaris,502234502,,\n";
    const blob = new Blob(["﻿" + tpl], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "caremap-seniorzy-szablon.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!parsed) {
    return (
      <div className="space-y-4">
        <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/10 rounded-lg p-4 text-sm text-muted-foreground">
          <p className="font-medium text-[#1e3a5f] mb-2">Format pliku</p>
          <p>
            Plik <strong>CSV</strong> (UTF-8) z nagłówkami w pierwszym wierszu. Wymagane kolumny:{" "}
            <code>firstName</code>, <code>lastName</code>, <code>dateOfBirth</code> (format YYYY-MM-DD
            lub DD.MM.YYYY).
          </p>
          <p className="mt-2">
            Opcjonalne: <code>gender</code> (K/M), <code>address</code>, <code>postalCode</code>,{" "}
            <code>city</code>, <code>phone</code>, <code>email</code>, <code>pesel</code>.
          </p>
          <p className="mt-2 text-xs">
            <strong>Excel:</strong> otwórz plik w Excelu → <em>Plik → Zapisz jako → CSV UTF-8</em>{" "}
            (rozdzielany przecinkami).
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="mt-3 inline-flex items-center gap-1 text-[#1e3a5f] font-medium hover:underline text-xs"
          >
            <Download size={12} /> Pobierz szablon CSV
          </button>
        </div>

        {parseError && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertDescription className="text-sm text-red-700">{parseError}</AlertDescription>
          </Alert>
        )}

        <label
          htmlFor="file-input"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="block border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-[#1e3a5f]/40 hover:bg-[#F8FAFC] transition-colors"
        >
          <Upload size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-[#1e3a5f]">
            Przeciągnij i upuść plik CSV
          </p>
          <p className="text-xs text-muted-foreground mt-1">lub kliknij żeby wybrać</p>
          <input
            ref={inputRef}
            id="file-input"
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      </div>
    );
  }

  // ─── Preview / Results ───────────────────────────────────────────────────

  const validCount = parsed.filter((r) => r.errors.length === 0).length;
  const errorCount = parsed.filter((r) => r.errors.length > 0).length;
  const resultByRow: Record<number, ImportResultRow> = {};
  if (results) {
    for (const r of results) resultByRow[r.rowIndex] = r;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#1e3a5f]">
            Plik: <span className="font-mono text-xs">{filename}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Wczytano {parsed.length} wierszy: {validCount} poprawnych, {errorCount} z błędami
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset} disabled={importing}>
          <RotateCcw size={12} className="mr-1" /> Wybierz inny plik
        </Button>
      </div>

      {parseError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertDescription className="text-sm text-red-700">{parseError}</AlertDescription>
        </Alert>
      )}

      {/* Mapping summary */}
      <div className="bg-[#F8FAFC] border border-border rounded-lg p-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Rozpoznane kolumny</p>
        <div className="flex flex-wrap gap-1.5">
          {headers.map((h, i) => {
            const key = mapping[i];
            const col = key ? COLUMNS.find((c) => c.key === key) : null;
            return (
              <span
                key={i}
                className={`text-[10px] px-2 py-1 rounded-full ${
                  col
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <code>{h}</code>
                {col && <span className="ml-1 font-semibold">→ {col.label}</span>}
              </span>
            );
          })}
        </div>
      </div>

      {/* Preview table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="bg-[#F8FAFC] sticky top-0">
              <tr>
                <th className="text-left p-2 font-semibold text-[#1e3a5f]">#</th>
                <th className="text-left p-2 font-semibold text-[#1e3a5f]">Imię</th>
                <th className="text-left p-2 font-semibold text-[#1e3a5f]">Nazwisko</th>
                <th className="text-left p-2 font-semibold text-[#1e3a5f]">Data ur.</th>
                <th className="text-left p-2 font-semibold text-[#1e3a5f]">Miasto</th>
                <th className="text-left p-2 font-semibold text-[#1e3a5f]">Telefon</th>
                <th className="text-left p-2 font-semibold text-[#1e3a5f]">PESEL</th>
                <th className="text-left p-2 font-semibold text-[#1e3a5f]">Status</th>
              </tr>
            </thead>
            <tbody>
              {parsed.map((row) => {
                const result = resultByRow[row.rowIndex];
                let status: React.ReactNode;
                if (result) {
                  if (result.status === "CREATED") {
                    status = (
                      <span className="text-green-700 inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> dodano
                      </span>
                    );
                  } else if (result.status === "SKIPPED_DUPLICATE") {
                    status = (
                      <span className="text-orange-700 inline-flex items-center gap-1" title={result.matchedName}>
                        <AlertTriangle size={12} /> duplikat
                      </span>
                    );
                  } else {
                    status = (
                      <span className="text-red-700 inline-flex items-center gap-1" title={result.error}>
                        <XCircle size={12} /> błąd
                      </span>
                    );
                  }
                } else if (row.errors.length > 0) {
                  status = (
                    <span className="text-red-600 inline-flex items-center gap-1" title={row.errors.join("; ")}>
                      <XCircle size={12} /> {row.errors.length} {row.errors.length === 1 ? "błąd" : "błędów"}
                    </span>
                  );
                } else {
                  status = <span className="text-muted-foreground">gotowy</span>;
                }

                return (
                  <tr
                    key={row.rowIndex}
                    className={`border-t border-border ${row.errors.length > 0 ? "bg-red-50/50" : ""}`}
                  >
                    <td className="p-2 text-muted-foreground">{row.rowIndex + 1}</td>
                    <td className="p-2">{row.data.firstName}</td>
                    <td className="p-2">{row.data.lastName}</td>
                    <td className="p-2 font-mono text-[10px]">{row.data.dateOfBirth}</td>
                    <td className="p-2 text-muted-foreground">{row.data.city}</td>
                    <td className="p-2 text-muted-foreground">{row.data.phone}</td>
                    <td className="p-2 text-muted-foreground">
                      {row.data.pesel ? "•••••" + row.data.pesel.slice(-3) : ""}
                    </td>
                    <td className="p-2">{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!results && (
        <div className="space-y-3">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={forceCreate}
              onChange={(e) => setForceCreate(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#1e3a5f]"
            />
            <div>
              <p className="text-sm font-medium text-[#1e3a5f]">
                Wymuś utworzenie nawet jeśli wykryto duplikaty
              </p>
              <p className="text-xs text-muted-foreground">
                Domyślnie system pomija wiersze podobne do już istniejących seniorów (próg dopasowania ≥85%).
              </p>
            </div>
          </label>

          <div className="flex flex-col sm:flex-row gap-2 justify-end pt-3 border-t border-border">
            <Button variant="outline" onClick={reset} disabled={importing}>
              Anuluj
            </Button>
            <Button
              onClick={submit}
              disabled={validCount === 0 || importing}
              className="bg-[#1e3a5f] hover:bg-[#152b47] text-white"
            >
              {importing ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" /> Importowanie {validCount} seniorów…
                </>
              ) : (
                <>
                  <Upload size={14} className="mr-2" />
                  Importuj {validCount} seniorów
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {results && (
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" onClick={reset}>
            Zaimportuj kolejny plik
          </Button>
          <Button
            onClick={() => router.push("/seniorzy")}
            className="bg-[#1e3a5f] hover:bg-[#152b47] text-white"
          >
            Przejdź do listy seniorów
          </Button>
        </div>
      )}
    </div>
  );
}
