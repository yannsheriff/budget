import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret"
);

const AUTH_COOKIE = "budget-auth";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check auth cookie
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    return redirectOrReject(request);
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // Token expired or invalid — clear cookie and redirect
    const response = redirectOrReject(request);
    response.cookies.delete(AUTH_COOKIE);
    return response;
  }
}

/**
 * For page requests → redirect to /login
 * For API requests → return 401 JSON
 */
function redirectOrReject(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Non authentifié" },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

// Apply middleware to all routes except static files and Next.js internals
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icons, images
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
