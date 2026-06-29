---
name: project-caremap
description: CareMap MVP — platforma JST do opieki seniorów. Stack, konfiguracja, dane logowania, kluczowe decyzje techniczne.
metadata:
  type: project
---

## CareMap MVP

Projekt w: `C:\Users\Dell\Desktop\Caremap\caremap\`
Dev server: `npm run dev` z katalogu `caremap/`

**Why:** Platforma JST do badania potrzeb opiekuńczych seniorów dla Pawła Nykiela.

## Stack (ważne różnice od specyfikacji)

- **Next.js 16** (nie 14) — `proxy.ts` zamiast `middleware.ts`, app router
- **Tailwind v4** — brak `tailwind.config.ts`, kolory i zmienne w `app/globals.css` (@theme inline + :root CSS vars)
- **Prisma 7** — dwa generatory: `prisma-client` (output `lib/generated/prisma/`) + `prisma-client-js` (dla @prisma/client i seeda)
- **Prisma 7 wymaga adaptera:** `@prisma/adapter-pg` + `PrismaPg` w PrismaClient constructor
- **prisma.config.ts** zarządza URL (nie schema.prisma), używa DIRECT_URL dla migracji
- **shadcn/ui v4** (Base UI) — brak `asChild`, używa `render` prop lub `buttonVariants` + `<Link>`. `DropdownMenuTrigger` nie może owijać `<button>` (nested button error)
- **Seed**: `TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","esModuleInterop":true}' npx ts-node prisma/seed.ts`

## Baza danych (Neon)

- DATABASE_URL: pooler (dla runtime queries)
- DIRECT_URL: direct (dla prisma db push/migrate)
- Konfiguracja w `.env.local`

## Dane logowania demo

- Email: `p.nykiel@gmail.com`
- Hasło: `Admin123!`
- Rola: ADMIN
- Org: Gmina Solaris (slug: "solaris")

## Schema (aktualna — maj 2026)

Modele: Organization, User, Senior, SurveyTemplate, TemplateSection, TemplateQuestion,
Survey, SurveyAnswer, Alert, Provider, ProviderService, ProviderAvailability, Reminder,
Account, Session, VerificationToken

**Kluczowe zmiany względem v1:**
- `Subject` → `Senior` (z dateOfBirth, identificationConfidence, geoLat/geoLon)
- `CareProvider` → `Provider` (z coverageType, coverageRadius, coverageCities)
- `CareNeed` usunięty
- Nowe modele: `ProviderService`, `ProviderAvailability`, `Reminder`
- `Organization` ma `slug` (nie `code`), `logoText`
- `Survey` ma k1Score/k2Score/k3Score/k4Score/careLevel, filledById, seniorId, previousSurveyId
- `SurveyAnswer.value` to `Int` (0-3)
- `Alert` powiązany z `Survey` (ma careLevel, handledById, handledNote)
- `UserRole` rozszerzony: ADMIN, SENIOR, FAMILY_CAREGIVER, SOCIAL_WORKER, NURSE, GP_DOCTOR, MUNICIPALITY_WORKER, VOLUNTEER, NGO_COORDINATOR, PROVIDER_MANAGER

## Seed data

- 1 organizacja: Gmina Solaris (slug: "solaris", logoText: "GS")
- Admin: p.nykiel@gmail.com / Admin123!
- Szablon K1-K4 (5 sekcji: K1/K2A/K2BC/K3/K4, 45 pytań, status: PUBLISHED)
- 5 seniorów (Kowalska, Nowak, Wisniewska, Wojcik, Kaminska)
- 5 podmiotów (CUS, Dom Seniora, Opieka Domowa, Wolontariat, Teleopieka) z dostępnością

## Ważne kwestie

- `app/page.tsx` NIE MOŻE istnieć (konflikt z `app/(app)/page.tsx`)
- Prisma include z relacjami może nie działać w Prisma 7 + driverAdapters — lepiej osobne zapytania
- Auth: `lib/auth.ts` używa `findUnique` bez `include`, osobne zapytanie dla Organization
- Restart dev serwera potrzebny po `prisma generate` (singleton trzyma stary klient)
- OOM przy starcie: wyczyść `.next/` przed restartem

## Zbudowane funkcje (Sprint 1-4)

✅ Sprint 1: Auth, layout, logowanie, dashboard
✅ Sprint 2: Wizard ankiety (SeniorIdentify → dane reportera → K1-K4 → wyniki z RadarChart)
  - lib/survey-algorithm.ts (calcScores, getCareLevel, CARE_LEVELS, LEVEL_PROVIDER_TYPES)
  - lib/senior-identify.ts (Levenshtein fuzzy matching)
  - API: /api/seniors, /api/seniors/identify, /api/surveys, /api/surveys/[id]
✅ Sprint 3: Panel JST (KPI, CareLevelChart, MonthlyChart, alerty, ostatnie ankiety)
  - AlertPanel.tsx — interaktywne przyciski Przejmij/Zamknij dla alertów
  - API: /api/analytics, /api/alerts
✅ Podmioty: katalog + strona szczegółów + wizard rejestracji
  - API: /api/providers, /api/providers/[id]/availability
✅ Dostępność dzienna podmiotów (/podmioty/dostepnosc + AvailabilityForm)
✅ Użytkownicy: lista z rolami, approve/reject/suspend dla PENDING (UserActions.tsx)
✅ Rejestracja użytkownika: 3-krokowy wizard /rejestracja
  - API: /api/users (POST tworzy PENDING), /api/users/[id] (PATCH approve/reject)

## Do zbudowania

- [ ] PDF raportu (@react-pdf/renderer w /api/surveys/[id]/report)
- [ ] Email (Resend) — wysyłka raportu
- [ ] Responsywność mobile
- [ ] Deploy na Vercel

## Routing aplikacji

```
/ → dashboard (app/(app)/page.tsx)
/ankieta → lista ankiet
/ankieta/nowa → wizard ankiety (SurveyWizard)
/ankieta/[id] → szczegóły ankiety
/ankieta/[id]/wyniki → wyniki + RadarChart
/panel → Panel JST (KPI, wykresy, alerty z interaktywnymi przyciskami)
/podmioty → katalog podmiotów
/podmioty/[id] → szczegóły podmiotu
/podmioty/rejestracja → wizard rejestracji podmiotu (4 kroki)
/podmioty/dostepnosc → panel dziennej dostępności podmiotów
/uzytkownicy → lista użytkowników z approve/reject dla PENDING
/logowanie → logowanie (z linkiem do rejestracji)
/rejestracja → rejestracja użytkownika (3-krokowy wizard)
```

## API endpoints

```
GET/POST /api/providers → katalog + tworzenie
POST /api/providers/[id]/availability → upsert dziennej dostępności
GET/POST /api/seniors → seniorzy
POST /api/seniors/identify → fuzzy match
GET/POST /api/surveys → ankiety
GET /api/surveys/[id] → szczegóły ankiety
GET /api/analytics → KPI dla panelu JST
GET/PATCH /api/alerts → lista + aktualizacja statusu alertu
GET/POST /api/users → lista + rejestracja użytkownika
PATCH /api/users/[id] → approve/reject/suspend
```
