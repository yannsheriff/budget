import { NextRequest, NextResponse } from "next/server";
import { verifyToken, createToken, AUTH_COOKIE } from "@/lib/auth";

/**
 * POST /api/auth/refresh
 * Re-establishes the httpOnly cookie from a JWT stored in localStorage.
 * Fixes iOS standalone PWA where cookies are lost between sessions.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token } = body;

  if (!token || !(await verifyToken(token))) {
    return NextResponse.json(
      { error: "Token invalide ou expiré" },
      { status: 401 }
    );
  }

  const newToken = await createToken();

  const response = NextResponse.json({ success: true, token: newToken });

  response.cookies.set(AUTH_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 90 * 24 * 60 * 60,
  });

  return response;
}
