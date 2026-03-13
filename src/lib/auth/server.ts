import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

let authInstance: NeonAuth | null = null;

function readAuthConfig() {
  const rawBaseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
  const rawCookieSecret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();

  const missing: string[] = [];
  if (!rawBaseUrl) missing.push("NEON_AUTH_BASE_URL");
  if (!rawCookieSecret) missing.push("NEON_AUTH_COOKIE_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Configuración incompleta de Neon Auth. Faltan: ${missing.join(", ")}.`,
    );
  }

  return { baseUrl: rawBaseUrl!, cookieSecret: rawCookieSecret! };
}

export function getAuth(): NeonAuth {
  if (authInstance) return authInstance;

  const { baseUrl, cookieSecret } = readAuthConfig();
  authInstance = createNeonAuth({
    baseUrl,
    cookies: {
      secret: cookieSecret,
    },
  });

  return authInstance;
}
