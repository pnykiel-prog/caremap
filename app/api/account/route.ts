import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
}).refine(
  (d) => !(d.newPassword && !d.currentPassword),
  { message: "Podaj aktualne hasło aby zmienić na nowe", path: ["currentPassword"] }
);

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.flatten().formErrors[0] ?? Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Nieprawidłowe dane";
    return NextResponse.json({ success: false, error: firstError }, { status: 400 });
  }

  const { name, currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ success: false, error: "Nie znaleziono użytkownika" }, { status: 404 });

  const updateData: { name?: string; password?: string } = {};

  if (name && name !== user.name) {
    updateData.name = name;
  }

  if (newPassword && currentPassword) {
    if (!user.password) {
      return NextResponse.json({ success: false, error: "Konto nie ma ustawionego hasła" }, { status: 400 });
    }
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return NextResponse.json({ success: false, error: "Aktualne hasło jest nieprawidłowe" }, { status: 400 });
    }
    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: false, error: "Brak zmian do zapisania" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ success: true, data: updated });
}
