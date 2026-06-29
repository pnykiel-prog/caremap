import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as path from "path";
import { randomUUID } from "crypto";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("→ Backfill pseudonimId dla istniejących seniorów…");
  const seniors = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Senior" WHERE "pseudonimId" IS NULL
  `;
  console.log(`  Znaleziono ${seniors.length} rekordów bez pseudonimId`);
  for (const s of seniors) {
    await prisma.senior.update({
      where: { id: s.id },
      data: { pseudonimId: `psd_${randomUUID().replace(/-/g, "")}` },
    });
  }

  console.log("→ Tworzę OrganizationSettings dla istniejących gmin (jeśli brak)…");
  const orgs = await prisma.organization.findMany({ include: { settings: true } });
  for (const org of orgs) {
    if (!org.settings) {
      await prisma.organizationSettings.create({
        data: {
          organizationId: org.id,
          channelPush: true,
          channelEmail: false,
          channelSms: false,
          autoSendPdfToSenior: false,
          sendPdfOnlyIfConsent: true,
        },
      });
      console.log(`  + ustawienia dla ${org.name}`);
    }
  }

  console.log("✔ Backfill zakończony.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
