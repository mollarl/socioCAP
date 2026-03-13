import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";

let authMiddleware: ReturnType<ReturnType<typeof getAuth>["middleware"]> | null =
  null;

function getAuthMiddleware() {
  if (authMiddleware) return authMiddleware;
  authMiddleware = getAuth().middleware({
    loginUrl: "/auth/sign-in",
  });
  return authMiddleware;
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  try {
    return await getAuthMiddleware()(request);
  } catch (error) {
    console.error("Neon auth middleware failed:", error);
    const redirectUrl = new URL("/auth/sign-in", request.url);
    redirectUrl.searchParams.set("auth_error", "middleware");
    return NextResponse.redirect(redirectUrl);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
