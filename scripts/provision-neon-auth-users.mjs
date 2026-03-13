#!/usr/bin/env node

const NEON_API_BASE = "https://console.neon.tech/api/v2";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

function parseJsonSafe(rawText) {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function extractMessage(payload, fallback) {
  if (!payload || typeof payload !== "object") return fallback;
  return (
    payload.message ||
    payload.error?.message ||
    payload.error ||
    payload.code ||
    fallback
  );
}

function extractUserId(payload) {
  if (!payload || typeof payload !== "object") return null;
  return (
    payload.user?.id ||
    payload.data?.user?.id ||
    payload.id ||
    payload.userId ||
    null
  );
}

function isUserAlreadyExistsError(message) {
  const normalized = (message || "").toLowerCase();
  return (
    normalized.includes("already exists") ||
    normalized.includes("already registered") ||
    normalized.includes("user exists") ||
    normalized.includes("email already") ||
    normalized.includes("taken")
  );
}

async function neonApiRequest(path, method, apiKey, body) {
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

async function authRequest(baseUrl, path, body) {
  const origin = new URL(baseUrl).origin;
  const response = await fetch(`${baseUrl}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  const payload = parseJsonSafe(rawText);

  return {
    ok: response.ok,
    status: response.status,
    payload,
    message: extractMessage(payload, rawText || response.statusText),
  };
}

async function resolveMainBranchId(projectId, apiKey, branchName) {
  const payload = await neonApiRequest(
    `/projects/${projectId}/branches?search=${encodeURIComponent(branchName)}`,
    "GET",
    apiKey,
  );

  const branches = Array.isArray(payload?.branches) ? payload.branches : [];
  const exactMatch = branches.find((branch) => branch?.name === branchName);
  if (exactMatch?.id) return exactMatch.id;

  const first = branches[0];
  if (first?.id) return first.id;

  throw new Error(`No se encontró branch '${branchName}' en el proyecto.`);
}

async function createOrSignInUser(baseUrl, user) {
  const callbackURL = `${new URL(baseUrl).origin}/`;
  const signUpResult = await authRequest(baseUrl, "sign-up/email", {
    email: user.email,
    password: user.password,
    name: user.name || user.email.split("@")[0],
    callbackURL,
  });

  if (signUpResult.ok) {
    const signUpUserId = extractUserId(signUpResult.payload);
    if (!signUpUserId) {
      throw new Error(
        `Usuario ${user.email}: signup exitoso pero no devolvió user id.`,
      );
    }
    return {
      userId: signUpUserId,
      source: "signup",
    };
  }

  if (!isUserAlreadyExistsError(signUpResult.message)) {
    throw new Error(
      `Usuario ${user.email}: no se pudo crear cuenta (${signUpResult.status}) ${signUpResult.message}`,
    );
  }

  const signInResult = await authRequest(baseUrl, "sign-in/email", {
    email: user.email,
    password: user.password,
    callbackURL,
  });

  if (!signInResult.ok) {
    throw new Error(
      `Usuario ${user.email}: ya existe pero no se pudo validar password (${signInResult.status}) ${signInResult.message}`,
    );
  }

  const signInUserId = extractUserId(signInResult.payload);
  if (!signInUserId) {
    throw new Error(
      `Usuario ${user.email}: signin exitoso pero no devolvió user id.`,
    );
  }

  return {
    userId: signInUserId,
    source: "signin",
  };
}

async function assignRole(projectId, branchId, apiKey, authUserId, role) {
  await neonApiRequest(
    `/projects/${projectId}/branches/${branchId}/auth/users/${encodeURIComponent(authUserId)}/role`,
    "PUT",
    apiKey,
    { roles: [role] },
  );
}

async function main() {
  const apiKey = requiredEnv("NEON_API_KEY");
  const projectId = requiredEnv("NEON_PROJECT_ID");
  const authBaseUrl = requiredEnv("NEON_AUTH_BASE_URL");
  const branchName = process.env.NEON_BRANCH_NAME || "main";
  const rawUsers = requiredEnv("NEON_AUTH_SEED_USERS");
  const users = JSON.parse(rawUsers);

  if (!Array.isArray(users) || users.length === 0) {
    throw new Error("NEON_AUTH_SEED_USERS debe ser un array no vacío.");
  }

  for (const user of users) {
    if (!user?.email || !user?.password || !user?.role) {
      throw new Error(
        "Cada usuario debe incluir email, password y role en NEON_AUTH_SEED_USERS.",
      );
    }
  }

  const branchId = await resolveMainBranchId(projectId, apiKey, branchName);
  console.log(`Branch resuelto: ${branchName} (${branchId})`);

  for (const user of users) {
    const { userId, source } = await createOrSignInUser(authBaseUrl, user);
    await assignRole(projectId, branchId, apiKey, userId, user.role);
    console.log(
      `OK ${user.email} -> role=${user.role} user_id=${userId} (${source})`,
    );
  }

  console.log("Provisioning completado.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
