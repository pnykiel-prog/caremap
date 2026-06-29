import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CARE_LEVELS } from "@/lib/survey-algorithm";

// Register a simple sans-serif fallback (Helvetica is built-in)
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 50,
    color: "#1a1a2e",
  },
  header: {
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#1e3a5f",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  logoText: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
  },
  headerMeta: {
    fontSize: 8,
    color: "#6b7280",
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
    marginTop: 16,
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    color: "#6b7280",
    fontSize: 9,
    width: "40%",
  },
  value: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    width: "60%",
    textAlign: "right",
  },
  levelBadge: {
    padding: 6,
    borderRadius: 4,
    marginBottom: 12,
    alignItems: "center",
  },
  levelText: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  scoreBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 8,
  },
  scoreLabel: {
    fontSize: 8,
    width: 48,
    color: "#374151",
  },
  scoreTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
  },
  scoreFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1e3a5f",
  },
  scoreValue: {
    fontSize: 8,
    width: 28,
    textAlign: "right",
    color: "#374151",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e3a5f",
    padding: 5,
    borderRadius: 2,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    padding: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  tableCell: {
    fontSize: 8,
    color: "#374151",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#d1d5db",
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: "#9ca3af",
  },
});

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const fillWidth = `${pct}%`;
  const color = pct >= 80 ? "#dc2626" : pct >= 50 ? "#d97706" : "#16a34a";
  return (
    <View style={styles.scoreBar}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: fillWidth, backgroundColor: color }]} />
      </View>
      <Text style={styles.scoreValue}>{pct}%</Text>
    </View>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId!;
  const { id } = await params;

  const survey = await prisma.survey.findFirst({ where: { id, organizationId: orgId } });
  if (!survey) return NextResponse.json({ success: false, error: "Nie znaleziono" }, { status: 404 });

  const [senior, answers, sections, org] = await Promise.all([
    prisma.senior.findUnique({ where: { id: survey.seniorId } }),
    prisma.surveyAnswer.findMany({
      where: { surveyId: id },
      include: { question: { include: { section: true } } },
    }),
    prisma.templateSection.findMany({
      where: { templateId: survey.templateId },
      include: { questions: { orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
  ]);

  if (!senior) return NextResponse.json({ success: false, error: "Brak seniora" }, { status: 404 });

  const answerMap = Object.fromEntries(answers.map((a) => [a.questionId, a.value]));
  const careLevelNum = survey.careLevel as number;
  const levelCfg = careLevelNum ? CARE_LEVELS[careLevelNum as keyof typeof CARE_LEVELS] : null;

  const scores = {
    k1: survey.k1Score as number ?? 0,
    k2: survey.k2Score as number ?? 0,
    k3: survey.k3Score as number ?? 0,
    k4: survey.k4Score as number ?? 0,
  };

  const reportDate = new Date().toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" });
  const surveyDate = survey.createdAt.toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" });
  const seniorDOB = senior.dateOfBirth
    ? new Date(senior.dateOfBirth).toLocaleDateString("pl-PL")
    : "Nie podano";

  const SCORE_LABELS = { k1: "K1 Sprawność", k2: "K2 Aktywność", k3: "K3 Środowisko", k4: "K4 Wsparcie" };

  const doc = (
    <Document title={`Raport K1-K4 — ${senior.firstName} ${senior.lastName}`} author="CareMap">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>CareMap</Text>
          <View>
            <Text style={styles.headerMeta}>{org?.name ?? "Gmina"}</Text>
            <Text style={styles.headerMeta}>Wygenerowano: {reportDate}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: "#1e3a5f", marginBottom: 16 }}>
          Karta oceny potrzeb opiekuńczych
        </Text>

        {/* Senior info */}
        <Text style={styles.sectionTitle}>Dane seniora</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Imię i nazwisko</Text>
            <Text style={styles.value}>{senior.firstName} {senior.lastName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Data urodzenia</Text>
            <Text style={styles.value}>{seniorDOB}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Miejscowość</Text>
            <Text style={styles.value}>{senior.city || "—"}</Text>
          </View>
          {senior.address && (
            <View style={styles.row}>
              <Text style={styles.label}>Adres</Text>
              <Text style={styles.value}>{senior.address}</Text>
            </View>
          )}
        </View>

        {/* Survey meta */}
        <Text style={styles.sectionTitle}>Informacje o badaniu</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Data badania</Text>
            <Text style={styles.value}>{surveyDate}</Text>
          </View>
          {survey.reporterName && (
            <View style={styles.row}>
              <Text style={styles.label}>Przeprowadził/a</Text>
              <Text style={styles.value}>{survey.reporterName}</Text>
            </View>
          )}
          {survey.reporterRole && (
            <View style={styles.row}>
              <Text style={styles.label}>Rola</Text>
              <Text style={styles.value}>{survey.reporterRole}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Nr referencyjny</Text>
            <Text style={styles.value}>{survey.id.slice(0, 12).toUpperCase()}</Text>
          </View>
        </View>

        {/* Care level */}
        {levelCfg && (
          <>
            <Text style={styles.sectionTitle}>Wynik ogólny</Text>
            <View style={[styles.levelBadge, { backgroundColor: levelCfg.bg }]}>
              <Text style={[styles.levelText, { color: levelCfg.color }]}>
                Poziom {careLevelNum} — {levelCfg.label}
              </Text>
            </View>
          </>
        )}

        {/* Scores */}
        <Text style={styles.sectionTitle}>Wyniki według wymiarów</Text>
        <View style={styles.card}>
          {(Object.entries(scores) as [keyof typeof SCORE_LABELS, number][]).map(([key, val]) => (
            <ScoreBar key={key} label={SCORE_LABELS[key]} value={val} />
          ))}
        </View>

        {/* Sections & answers */}
        {sections.map((section) => {
          const sectionAnswers = section.questions.map((q) => ({
            q,
            val: answerMap[q.id] ?? null,
          })).filter((x) => x.val !== null);

          if (sectionAnswers.length === 0) return null;

          return (
            <View key={section.id} wrap={false}>
              <Text style={styles.sectionTitle}>{section.title} — {section.code}</Text>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Pytanie</Text>
                  <Text style={[styles.tableHeaderCell, { width: 40, textAlign: "right" }]}>Pkt</Text>
                </View>
                {sectionAnswers.map(({ q, val }) => (
                  <View key={q.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{q.text}</Text>
                    <Text style={[styles.tableCell, { width: 40, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>
                      {val} / 3
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            CareMap · Dokument wygenerowany automatycznie · {reportDate}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  const uint8 = new Uint8Array(buffer);

  return new Response(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="raport-${senior.lastName.toLowerCase()}-${id.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
