import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import type { NotificationKind } from "@/lib/generated/prisma/client";

interface CreateNotificationInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  url?: string | null;
  payload?: unknown;
}

/**
 * Tworzy notyfikacje dla listy użytkowników, honorując kanały włączone per gmina
 * (OrganizationSettings — P-10). MVP: zapis do tabeli Notification (in-app/push).
 * Email/SMS w v2.0 ze sprawdzeniem channelEmail/channelSms.
 */
export async function notifyUsers(
  userIds: string[],
  payload: Omit<CreateNotificationInput, "userId">,
): Promise<void> {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return;

  // Optymalizacja: createMany
  const hasPayload = payload.payload !== undefined && payload.payload !== null;
  await prisma.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      kind: payload.kind,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
      ...(hasPayload ? { payload: payload.payload as Prisma.InputJsonValue } : {}),
      channel: "PUSH" as const,
    })),
  });
}

/**
 * Po wypełnieniu ankiety — powiadom wszystkich obserwatorów seniora (ANK-14).
 * "kiedykolwiek wypełniali ankietę" = wszyscy w SurveyObserver dla tego seniora,
 * z wyłączeniem autora bieżącej ankiety.
 */
export async function notifyObserversOnNewSurvey(
  seniorId: string,
  newSurveyId: string,
  excludeUserId?: string,
): Promise<void> {
  const observers = await prisma.surveyObserver.findMany({
    where: { seniorId },
    select: { userId: true },
  });
  const senior = await prisma.senior.findUnique({
    where: { id: seniorId },
    select: { firstName: true, lastName: true },
  });
  const survey = await prisma.survey.findUnique({
    where: { id: newSurveyId },
    select: { careLevel: true, createdAt: true },
  });
  if (!senior || !survey) return;

  const ids = observers
    .map((o) => o.userId)
    .filter((id) => id !== excludeUserId);

  await notifyUsers(ids, {
    kind: "NEW_SURVEY",
    title: `Nowa ankieta: ${senior.firstName} ${senior.lastName}`,
    body: `Wypełniono ankietę ${survey.createdAt.toISOString().slice(0, 10)}, poziom opieki: ${
      survey.careLevel ?? "?"
    }`,
    url: `/portal/manager/pacjent/${seniorId}`,
    payload: { seniorId, surveyId: newSurveyId, careLevel: survey.careLevel },
  });
}
