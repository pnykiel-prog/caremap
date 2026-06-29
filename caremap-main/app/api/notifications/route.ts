import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";

  const list = await prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId, readAt: null },
  });

  return NextResponse.json({ success: true, data: { items: list, unreadCount } });
}

export async function POST(req: Request) {
  // Mark all as read
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, error: "Brak dostępu" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const body = await req.json().catch(() => ({}));
  if (body.markAll) {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
  return NextResponse.json({ success: true });
}
