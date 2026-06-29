import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/logowanie",
    error: "/logowanie",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Hasło", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();
        const password = parsed.data.password.trim();

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.password) return null;
        if (user.status !== "ACTIVE") return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        const org = await prisma.organization.findUnique({
          where: { id: user.organizationId },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: org?.name ?? "",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Przy logowaniu dane pochodzą z authorize()
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.organizationId = (user as { organizationId?: string }).organizationId;
        token.organizationName = (user as { organizationName?: string }).organizationName;
        return token;
      }

      // Auto-naprawa sesji: przy kolejnych żądaniach odśwież dane z bazy po emailu.
      // Dzięki temu token wystawiony przed zmianą/resetem danych (np. po wgraniu
      // nowego zestawu z innym ID organizacji) sam się aktualizuje — bez ręcznego
      // wylogowywania.
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          include: { organization: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationId;
          token.organizationName = dbUser.organization?.name ?? "";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { organizationId?: string }).organizationId = token.organizationId as string;
        (session.user as { organizationName?: string }).organizationName = token.organizationName as string;
      }
      return session;
    },
  },
});
