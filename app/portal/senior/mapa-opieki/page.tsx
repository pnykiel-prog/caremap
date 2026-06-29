import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CARE_LEVELS } from "@/lib/survey-algorithm";
import SurveyTrendChart from "@/components/survey/SurveyTrendChart";

export default async function MapaOpiekiPage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;
  const email = session!.user?.email ?? undefined;

  const mySenior =
    (await prisma.senior.findFirst({
      where: { ownerUserId: userId },
      include: { surveys: { orderBy: { createdAt: "asc" } } },
    })) ??
    (email
      ? await prisma.senior.findFirst({
          where: { email },
          include: { surveys: { orderBy: { createdAt: "asc" } } },
        })
      : null);

  const surveys = mySenior?.surveys ?? [];
  const points = surveys
    .filter((s) => s.k1Score !== null)
    .map((s) => ({
      surveyId: s.id,
      dateLabel: new Date(s.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }),
      dateFull: new Date(s.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" }),
      k1: s.k1Score,
      k2: s.k2Score,
      k3: s.k3Score,
      k4: s.k4Score,
      level: s.careLevel,
    }));

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Mapa opieki</h1>
        <p className="text-base text-muted-foreground mt-1">
          Wykres pokazuje jak zmieniają się Twoje wyniki K1-K4 w czasie. Im więcej badań — tym
          dokładniejszy obraz.
        </p>
      </div>

      {points.length < 2 ? (
        <Card className="bg-white">
          <CardContent className="p-10 text-center">
            <p className="text-base text-muted-foreground">
              Potrzeba przynajmniej 2 ankiet, aby pokazać trend. Aktualnie masz {points.length}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white">
          <CardContent className="p-5">
            <SurveyTrendChart history={points} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 text-sm">
              {(["k1", "k2", "k3", "k4"] as const).map((k) => {
                const first = (points[0][k] as number) ?? 0;
                const last = (points[points.length - 1][k] as number) ?? 0;
                const delta = last - first;
                return (
                  <div key={k} className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase text-muted-foreground tracking-wider">{k.toUpperCase()}</p>
                    <p className="text-lg font-bold text-[#1e3a5f]">{last}%</p>
                    <p
                      className={`text-xs ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-muted-foreground"}`}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta} pp od pierwszego badania
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {surveys.length >= 2 && (
        <Card className="bg-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-[#1e3a5f] mb-3">Zmiana poziomu opieki</p>
            <div className="space-y-2">
              {surveys.map((s, i) => {
                const prev = i > 0 ? surveys[i - 1] : null;
                const cfg = s.careLevel
                  ? CARE_LEVELS[s.careLevel as keyof typeof CARE_LEVELS]
                  : null;
                const trend =
                  prev && prev.careLevel != null && s.careLevel != null
                    ? prev.careLevel > s.careLevel
                      ? "↑ poprawa"
                      : prev.careLevel < s.careLevel
                      ? "↓ pogorszenie"
                      : "= bez zmian"
                    : "—";
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1e3a5f]">
                        {new Date(s.createdAt).toLocaleDateString("pl-PL", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">{trend}</p>
                    </div>
                    {cfg && s.careLevel && (
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        Poziom {s.careLevel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
