# Wdrożenie na Vercel (integracja GitHub)

Aplikacja CareMap (Next.js 16 + Prisma 7 + PostgreSQL) znajduje się w **głównym
katalogu repozytorium**.

## 1. Import projektu

1. Wejdź na https://vercel.com/new i wybierz repozytorium `pnykiel-prog/caremap`.
2. **Root Directory:** zostaw domyślne (`./`). Aplikacja jest w roocie repo.
3. **Framework Preset:** Next.js (wykrywany automatycznie).
4. Build Command / Install Command / Output — zostaw domyślne.
   `prisma generate` uruchamia się automatycznie w `postinstall`.

## 2. Zmienne środowiskowe

Ustaw w **Project → Settings → Environment Variables** (Production + Preview):

| Zmienna                 | Wymagana | Opis |
|-------------------------|----------|------|
| `DATABASE_URL`          | ✅ tak   | Pooled connection string do Twojej bazy (runtime, adapter `pg`). |
| `AUTH_SECRET`           | ✅ tak   | Wygeneruj: `openssl rand -base64 32`. |
| `DATABASE_URL_UNPOOLED` | zalecana | Direct (non-pooled) URL — używany przez `prisma db push`/migracje. |
| `AUTH_URL`              | opcjon.  | Domena produkcyjna, np. `https://caremap.vercel.app`. Pomijalne — `trustHost: true` jest ustawione. |
| `NEXT_PUBLIC_APP_URL`   | zalecana | Publiczny URL aplikacji. |
| `NEXT_PUBLIC_APP_NAME`  | zalecana | `CareMap`. |
| `RESEND_API_KEY`        | opcjon.  | Tylko wysyłka e-maili (zatwierdzanie podmiotów, zaproszenia ankieterów). |
| `RESEND_FROM`           | opcjon.  | Adres nadawcy, np. `noreply@caremap.pl`. |

Wzorzec: [`.env-example`](./.env-example).

## 3. Schemat bazy danych

Build Vercela **nie** aplikuje schematu do bazy. Przed pierwszym uruchomieniem
zastosuj schemat do swojej produkcyjnej bazy (jednorazowo, lokalnie):

```bash
# wskaż produkcyjną bazę:
export DIRECT_URL="<twój_direct_connection_string>"
npx prisma db push
# (opcjonalnie) dane startowe:
npm run db:seed
```

Konto admina z seeda: `admin@example.com` / `Admin123!`.

## 4. Deploy

Po imporcie i ustawieniu zmiennych Vercel zbuduje i wdroży aplikację. Każdy
push na gałąź produkcyjną wyzwala kolejny deploy.
