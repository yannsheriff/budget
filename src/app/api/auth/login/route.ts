import { NextRequest, NextResponse } from "next/server";
import { checkPassword, createToken, AUTH_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password } = body;

  if (!password || !checkPassword(password)) {
    return NextResponse.json(
      { error: "Mot de passe incorrect" },
      { status: 401 }
    );
  }

  const token = await createToken();

  const response = NextResponse.json({ success: true });

  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 90 * 24 * 60 * 60, // 90 days in seconds
  });

  return response;
}
