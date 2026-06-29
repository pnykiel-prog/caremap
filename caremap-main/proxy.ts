import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith("/logowanie");
  const isRegisterPage = pathname.startsWith("/rejestracja");
  const isApiAuth = pathname.startsWith("/api/auth");
  // Publiczne ścieżki rejestracji podmiotów i zaproszeń ankieterów (ANK-06)
  const isPublicEntity =
    pathname.startsWith("/rejestracja-podmiotu") ||
    pathname.startsWith("/zaproszenie") ||
    pathname.startsWith("/api/surveyor-entities/public");
  const isPublic = isAuthPage || isRegisterPage || isApiAuth || isPublicEntity;

  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
  const isLoggedIn = !!token;

  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/logowanie", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
