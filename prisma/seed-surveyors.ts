import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "test1234"; // wspólne proste hasło dla wszystkich kont demo

type EntityType = "POZ" | "CUS" | "CARE_COMPANY" | "NGO" | "HOSPICE" | "OTHER";

interface EntityDef {
  type: EntityType;
  name: string;
  manager: { email: string; name: string };
  surveyors: { email: string; name: string }[];
}

const ENTITIES: EntityDef[] = [
  {
    type: "POZ",
    name: "Przychodnia Solaris-Med",
    manager: { email: "manager.poz@caremap.test", name: "Anna Lewicka" },
    surveyors: [
      { email: "ankieter1.poz@caremap.test", name: "Krzysztof Nowak" },
      { email: "ankieter2.poz@caremap.test", name: "Maria Wójcik" },
    ],
  },
  {
    type: "CUS",
    name: "Centrum Usług Środowiskowych Solaris",
    manager: { email: "manager.cus@caremap.test", name: "Bartosz Kowal" },
    surveyors: [
      { email: "ankieter1.cus@caremap.test", name: "Joanna Mazur" },
      { email: "ankieter2.cus@caremap.test", name: "Tomasz Dudek" },
    ],
  },
  {
    type: "CARE_COMPANY",
    name: "Opieka Domowa Sol-Care",
    manager: { email: "manager.firma@caremap.test", name: "Magdalena Szczepańska" },
    surveyors: [
      { email: "ankieter1.firma@caremap.test", name: "Paweł Adamski" },
      { email: "ankieter2.firma@caremap.test", name: "Karolina Zielińska" },
    ],
  },
  {
    type: "NGO",
    name: "Fundacja Pomocna Dłoń Solaris",
    manager: { email: "manager.ngo@caremap.test", name: "Robert Kamiński" },
    surveyors: [
      { email: "ankieter1.ngo@caremap.test", name: "Ewa Pawlak" },
      { email: "ankieter2.ngo@caremap.test", name: "Michał Sobieski" },
    ],
  },
  {
    type: "HOSPICE",
    name: "Hospicjum Domowe Cor Cordium",
    manager: { email: "manager.hospicjum@caremap.test", name: "Iwona Borkowska" },
    surveyors: [
      { email: "ankieter1.hospicjum@caremap.test", name: "Łukasz Marciniak" },
      { email: "ankieter2.hospicjum@caremap.test", name: "Agnieszka Stępień" },
    ],
  },
  {
    type: "OTHER",
    name: "Centrum Aktywizacji Seniora Solaris+",
    manager: { email: "manager.inny@caremap.test", name: "Sebastian Witkowski" },
    surveyors: [
      { email: "ankieter1.inny@caremap.test", name: "Beata Górska" },
      { email: "ankieter2.inny@caremap.test", name: "Marek Sikora" },
    ],
  },
];

const SENIOR_ACCOUNT = {
  email: "senior@caremap.test",
  name: "Janina Kowalska",
};

async function ensureUser(
  email: string,
  name: string,
  role: "ADMIN" | "PROVIDER_MANAGER" | "VOLUNTEER" | "SENIOR" | "FAMILY_CAREGIVER",
  organizationId: string,
  activeContext: string | null,
  passwordHash: string,
) {
  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      password: passwordHash,
      organizationId,
      role,
      status: "ACTIVE",
      activeContext,
    },
    update: {
      name,
      password: passwordHash,
      status: "ACTIVE",
      role,
      activeContext,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const org = await prisma.organization.findFirst({ where: { slug: "solaris" } });
  if (!org) throw new Error("Brak Gminy Solaris w bazie. Uruchom najpierw główny seed.");
  const orgId = org.id;

  console.log(`✓ Gmina: ${org.name} (${orgId})`);
  console.log(`→ Hasło dla wszystkich kont: ${PASSWORD}\n`);

  // ─── Senior ──────────────────────────────────────────────────────────────
  const seniorUser = await ensureUser(
    SENIOR_ACCOUNT.email,
    SENIOR_ACCOUNT.name,
    "SENIOR",
    orgId,
    "senior",
    passwordHash,
  );
  console.log(`✓ Senior: ${seniorUser.email}`);

  // Powiąż konto seniora z pierwszym istniejącym Senior rekordem (s-001 = Janina Kowalska)
  const seniorRecord =
    (await prisma.senior.findUnique({ where: { id: "s-001" } })) ??
    (await prisma.senior.findFirst({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" } }));
  if (seniorRecord) {
    await prisma.senior.update({
      where: { id: seniorRecord.id },
      data: { ownerUserId: seniorUser.id, email: SENIOR_ACCOUNT.email },
    });
    console.log(`  ↳ powiązany z rekordem: ${seniorRecord.firstName} ${seniorRecord.lastName} (${seniorRecord.id})`);
  }

  // ─── Podmioty profesjonalne ──────────────────────────────────────────────
  for (const def of ENTITIES) {
    console.log(`\n— ${def.type}: ${def.name} —`);

    // Podmiot (find/create — bez unique constraint na name)
    let entity = await prisma.surveyorEntity.findFirst({
      where: { name: def.name },
    });
    if (!entity) {
      entity = await prisma.surveyorEntity.create({
        data: {
          name: def.name,
          type: def.type,
          city: "Solaris",
          status: "ACTIVE",
          contactManagerName: def.manager.name,
          contactManagerEmail: def.manager.email,
          approvedAt: new Date(),
        },
      });
    } else {
      entity = await prisma.surveyorEntity.update({
        where: { id: entity.id },
        data: {
          status: "ACTIVE",
          contactManagerName: def.manager.name,
          contactManagerEmail: def.manager.email,
          approvedAt: entity.approvedAt ?? new Date(),
        },
      });
    }
    console.log(`  ✓ Podmiot: ${entity.id}`);

    // Powiązanie z gminą (P-12)
    await prisma.surveyorEntityGmina.upsert({
      where: { entityId_organizationId: { entityId: entity.id, organizationId: orgId } },
      create: {
        entityId: entity.id,
        organizationId: orgId,
        status: "ACTIVE",
        approvedAt: new Date(),
      },
      update: { status: "ACTIVE", approvedAt: new Date() },
    });
    console.log(`  ✓ Aktywne w Gminie Solaris`);

    // Manager
    const mgrUser = await ensureUser(
      def.manager.email,
      def.manager.name,
      "PROVIDER_MANAGER",
      orgId,
      "manager",
      passwordHash,
    );
    await prisma.surveyorMembership.upsert({
      where: { userId_entityId: { userId: mgrUser.id, entityId: entity.id } },
      create: {
        userId: mgrUser.id,
        entityId: entity.id,
        role: "ENTITY_MANAGER",
        status: "ACTIVE",
      },
      update: { role: "ENTITY_MANAGER", status: "ACTIVE", suspendedAt: null },
    });
    console.log(`  ✓ Manager: ${mgrUser.email}`);

    // Ankieterzy
    for (const s of def.surveyors) {
      const user = await ensureUser(
        s.email,
        s.name,
        "VOLUNTEER",
        orgId,
        "surveyor",
        passwordHash,
      );
      await prisma.surveyorMembership.upsert({
        where: { userId_entityId: { userId: user.id, entityId: entity.id } },
        create: {
          userId: user.id,
          entityId: entity.id,
          role: "ENTITY_SURVEYOR",
          status: "ACTIVE",
          invitedById: mgrUser.id,
        },
        update: { role: "ENTITY_SURVEYOR", status: "ACTIVE", suspendedAt: null },
      });
      console.log(`    ✓ Ankieter: ${user.email}`);
    }
  }

  console.log("\n────────────────────────────────────────");
  console.log("✔ Seed zakończony.");
  const totalUsers = 1 + ENTITIES.length * 3;
  console.log(`  Konta utworzone/zaktualizowane: ${totalUsers}`);
  console.log(`  Podmioty: ${ENTITIES.length}`);
  console.log(`  Hasło dla wszystkich: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
