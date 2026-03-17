import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";
import {
  extractRawUserRole,
  normalizeUserRole,
  type UserRole,
} from "@/lib/auth/authorization";

const NEON_API_BASE = "https://console.neon.tech/api/v2";
const MIN_PASSWORD_LENGTH = 8;

let cachedBranchId: string | null = null;

type CreateUserPayload = {
  email?: unknown;
  password?: unknown;
  name?: unknown;
  role?: unknown;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

function parseJsonSafe(rawText: string) {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  const rawError = record.error;
  const errorMessage =
    rawError && typeof rawError === "object"
      ? (rawError as Record<string, unknown>).message
      : undefined;

  return (
    (typeof record.message === "string" && record.message) ||
    (typeof errorMessage === "string" && errorMessage) ||
    (typeof rawError === "string" && rawError) ||
    fallback
  );
}

function isAlreadyExistsMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already exists") ||
    normalized.includes("already registered") ||
    normalized.includes("user exists") ||
    normalized.includes("email already") ||
    normalized.includes("taken")
  );
}

function extractUserId(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const user = record.user as Record<string, unknown> | undefined;
  const nestedData = record.data as Record<string, unknown> | undefined;
  const nestedUser = nestedData?.user as Record<string, unknown> | undefined;

  return (
    (typeof user?.id === "string" && user.id) ||
    (typeof nestedUser?.id === "string" && nestedUser.id) ||
    (typeof record.userId === "string" && record.userId) ||
    (typeof record.id === "string" && record.id) ||
    null
  );
}

function normalizeRoleInput(value: unknown): UserRole | null {
  return normalizeUserRole(typeof value === "string" ? value : null);
}

function resolveDisplayName(name: string | null, email: string) {
  if (name && name.trim()) return name.trim();
  const localPart = email.split("@")[0] || "usuario";
  return localPart;
}

async function neonApiRequest(
  path: string,
  method: "GET" | "PUT",
  apiKey: string,
  body?: Record<string, unknown>,
) {
  const response = await fetch(`${NEON_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  const payload = parseJsonSafe(rawText);

  if (!response.ok) {
    throw new Error(
      `Neon API ${method} ${path} -> ${response.status}: ${extractMessage(payload, rawText || response.statusText)}`,
    );
  }

  return payload;
}

async function resolveBranchId(projectId: string, apiKey: string) {
  if (cachedBranchId) return cachedBranchId;

  const branchName = process.env.NEON_BRANCH_NAME?.trim() || "main";
  const payload = await neonApiRequest(
    `/projects/${projectId}/branches?search=${encodeURIComponent(branchName)}`,
    "GET",
    apiKey,
  );

  const branches =
    payload && typeof payload === "object" && Array.isArray(payload.branches)
      ? payload.branches
      : [];

  const exact = branches.find(
    (branch) =>
      branch &&
      typeof branch === "object" &&
      (branch as Record<string, unknown>).name === branchName,
  ) as Record<string, unknown> | undefined;

  const first = branches[0] as Record<string, unknown> | undefined;
  const branchId =
    (typeof exact?.id === "string" && exact.id) ||
    (typeof first?.id === "string" && first.id) ||
    null;

  if (!branchId) {
    throw new Error(`No se pudo resolver el branch '${branchName}'.`);
  }

  cachedBranchId = branchId;
  return branchId;
}

async function createAuthUser(
  authBaseUrl: string,
  input: { email: string; password: string; name: string },
) {
  const origin = new URL(authBaseUrl).origin;
  const callbackURL = `${origin}/`;

  const response = await fetch(`${authBaseUrl}/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      name: input.name,
      callbackURL,
    }),
  });

  const rawText = await response.text();
  const payload = parseJsonSafe(rawText);
  const message = extractMessage(payload, rawText || response.statusText);

  if (!response.ok) {
    if (isAlreadyExistsMessage(message)) {
      return { ok: false as const, status: 409, message: "El email ya existe." };
    }

    return {
      ok: false as const,
      status: response.status,
      message: `No se pudo crear el usuario: ${message}`,
    };
  }

  const userId = extractUserId(payload);
  if (!userId) {
    return {
      ok: false as const,
      status: 500,
      message: "El usuario se creó pero no se pudo obtener su ID.",
    };
  }

  return { ok: true as const, userId };
}

async function assignRole(
  projectId: string,
  branchId: string,
  apiKey: string,
  userId: string,
  role: UserRole,
) {
  await neonApiRequest(
    `/projects/${projectId}/branches/${branchId}/auth/users/${encodeURIComponent(userId)}/role`,
    "PUT",
    apiKey,
    { roles: [role] },
  );
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { data: sessionData } = await getAuth().getSession();
    const currentRole = normalizeUserRole(extractRawUserRole(sessionData?.user));

    if (!sessionData?.user || !currentRole) {
      return NextResponse.json(
        { ok: false, message: "No autorizado." },
        { status: 401 },
      );
    }

    const rawBody = await request.json();
    const body =
      rawBody && typeof rawBody === "object"
        ? (rawBody as CreateUserPayload)
        : {};

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password =
      typeof body.password === "string" ? body.password.trim() : "";
    const providedName = typeof body.name === "string" ? body.name.trim() : "";
    const requestedRole = normalizeRoleInput(body.role);

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, message: "Email inválido." },
        { status: 400 },
      );
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
        },
        { status: 400 },
      );
    }

    const targetRole =
      currentRole === "admin" ? requestedRole || "cap" : currentRole;

    if (!targetRole) {
      return NextResponse.json(
        { ok: false, message: "Role inválido." },
        { status: 400 },
      );
    }

    if (currentRole !== "admin" && requestedRole && requestedRole !== currentRole) {
      return NextResponse.json(
        { ok: false, message: "No tiene permisos para asignar ese role." },
        { status: 403 },
      );
    }

    const authBaseUrl = requiredEnv("NEON_AUTH_BASE_URL");
    const apiKey = requiredEnv("NEON_API_KEY");
    const projectId = requiredEnv("NEON_PROJECT_ID");

    const created = await createAuthUser(authBaseUrl, {
      email,
      password,
      name: resolveDisplayName(providedName || null, email),
    });

    if (!created.ok) {
      return NextResponse.json(
        { ok: false, message: created.message },
        { status: created.status },
      );
    }

    const branchId = await resolveBranchId(projectId, apiKey);
    await assignRole(projectId, branchId, apiKey, created.userId, targetRole);

    return NextResponse.json({
      ok: true,
      message: "Usuario creado correctamente.",
      user: {
        email,
        role: targetRole,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Error inesperado al crear usuario.",
      },
      { status: 500 },
    );
  }
}
