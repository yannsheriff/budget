import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret"
);

// Token expires in 90 days (~3 months)
const TOKEN_EXPIRY = "90d";

export const AUTH_COOKIE = "budget-auth";

/**
 * Create a signed JWT token.
 */
export async function createToken(): Promise<string> {
  return new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT token. Returns true if valid, false otherwise.
 */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the provided password matches the app password.
 */
export function checkPassword(password: string): boolean {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return false;
  // Constant-time comparison isn't critical for a single-user app,
  // but we do a basic check
  return password === appPassword;
}
