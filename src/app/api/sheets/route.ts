import { NextResponse } from "next/server";
import { getPool } from "@/lib/database";
import { getAuth } from "@/lib/auth/server";
import {
  canAccessTable,
  extractRawUserRole,
  normalizeUserRole,
  tableFromInstitution,
} from "@/lib/auth/authorization";

const DEFAULT_CAP_DEPLOYMENT_ID =
  "AKfycbw66IpeMriK-t2tCH52qpxvdTwmJNT2Yp0YD0VkUqArqFGXGsCcHGv8fFkvPWXrHrne";
const MAX_RETRIES = 3;

type IncomingPayload = Record<string, unknown>;

type NormalizedPayload = {
  nombres: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  matricula: string;
  expiracion: string;
  control: string;
  timestamp: string;
  isCAP: boolean;
};

type SheetsPayload = Omit<NormalizedPayload, "isCAP">;

type RetryResult = {
  ok: boolean;
  attempts: number;
  skipped?: boolean;
  error?: string;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDate(value: unknown) {
  const date = normalizeText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function normalizeTimestamp(value: unknown) {
  const rawValue = normalizeText(value);
  const date = rawValue ? new Date(rawValue) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

function resolveWebAppUrl(rawValue: string | undefined) {
  const value = (rawValue || DEFAULT_CAP_DEPLOYMENT_ID)
    .trim()
    .replace(/^"|"$/g, "");

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://script.google.com/macros/s/${value}/exec`;
}

function resolveCapWebAppValue() {
  return (
    process.env.NEXT_PUBLIC_GAS_WEB_APP_URL_CAP ||
    process.env.NEXT_PUBLIC_GAS_WEB_APP_URL
  );
}

function normalizeIsCap(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "false" || normalized === "0" || normalized === "cre") {
      return false;
    }
    if (normalized === "true" || normalized === "1" || normalized === "cap") {
      return true;
    }
  }
  return true;
}

function normalizePayload(rawPayload: IncomingPayload): NormalizedPayload {
  const isCAP = normalizeIsCap(rawPayload.isCAP);

  return {
    nombres: normalizeText(rawPayload.nombres),
    apellido: normalizeText(rawPayload.apellido),
    dni: normalizeText(rawPayload.dni),
    fechaNacimiento: normalizeText(rawPayload.fechaNacimiento),
    matricula: normalizeText(rawPayload.matricula),
    expiracion: normalizeText(rawPayload.expiracion),
    control: normalizeText(rawPayload.control),
    timestamp: normalizeText(rawPayload.timestamp) || new Date().toISOString(),
    isCAP,
  };
}

async function saveToSheets(payload: SheetsPayload) {
  const webAppUrl = resolveWebAppUrl(resolveCapWebAppValue());
  const googleResponse = await fetch(webAppUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    redirect: "follow",
  });

  const responseText = await googleResponse.text();
  let parsed: {
    ok?: boolean;
    success?: boolean;
    message?: string;
    error?: string;
  } | null = null;
  try {
    parsed = responseText ? JSON.parse(responseText) : null;
  } catch {
    parsed = null;
  }

  if (!googleResponse.ok) {
    throw new Error(
      parsed?.message ||
        parsed?.error ||
        `Google Apps Script respondió ${googleResponse.status}.`,
    );
  }

  if (parsed?.ok === false || parsed?.success === false) {
    throw new Error(
      parsed?.message || parsed?.error || "Apps Script rechazó el registro.",
    );
  }

  const explicitlyAccepted = parsed?.ok === true || parsed?.success === true;
  if (!explicitlyAccepted) {
    const compactPreview = responseText.replace(/\s+/g, " ").slice(0, 220);
    throw new Error(
      `Apps Script no confirmó el guardado. Respuesta: ${compactPreview}`,
    );
  }
}

async function saveToDatabase(payload: NormalizedPayload) {
  const pool = getPool();

  const tableName = payload.isCAP ? '"CAP"' : '"CRE"';
  const query = `
    INSERT INTO ${tableName}
      (nombres, apellido, dni, fecha_nacimiento, matricula, expiracion, control, imagen, "timestamp")
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, NULL, $8)
  `;

  await pool.query(query, [
    payload.nombres,
    payload.apellido,
    payload.dni,
    normalizeDate(payload.fechaNacimiento),
    payload.matricula || null,
    normalizeDate(payload.expiracion),
    payload.control || null,
    normalizeTimestamp(payload.timestamp),
  ]);
}

async function withRetries(
  operation: () => Promise<void>,
  label: string,
): Promise<RetryResult> {
  let lastError = "Error desconocido.";

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
    try {
      await operation();
      return { ok: true, attempts: attempt };
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : `${label} falló sin detalle.`;

      if (attempt <= MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
      }
    }
  }

  return {
    ok: false,
    attempts: MAX_RETRIES + 1,
    error: `${label}: ${lastError}`,
  };
}

export async function POST(request: Request) {
  try {
    const { data: sessionData } = await getAuth().getSession();
    const role = normalizeUserRole(extractRawUserRole(sessionData?.user));
    if (!sessionData?.user || !role) {
      return NextResponse.json(
        { ok: false, success: false, message: "No autorizado." },
        { status: 401 },
      );
    }

    const rawPayload = await request.json();
    const payload =
      rawPayload && typeof rawPayload === "object"
        ? (rawPayload as Record<string, unknown>)
        : {};
    const normalizedPayload = normalizePayload(payload);
    const targetTable = tableFromInstitution(normalizedPayload.isCAP);
    if (!canAccessTable(role, targetTable)) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message:
            "No tiene permisos para guardar registros en esta institución.",
        },
        { status: 403 },
      );
    }

    const { isCAP, ...googlePayload } = normalizedPayload;

    let sheetsResult: RetryResult = {
      ok: true,
      attempts: 0,
      skipped: true,
    };
    let dbResult: RetryResult;

    if (normalizedPayload.isCAP) {
      [sheetsResult, dbResult] = await Promise.all([
        withRetries(() => saveToSheets(googlePayload), "Google Sheets"),
        withRetries(() => saveToDatabase(normalizedPayload), "Base de datos"),
      ]);
    } else {
      dbResult = await withRetries(
        () => saveToDatabase(normalizedPayload),
        "Base de datos",
      );
    }

    const warnings: string[] = [];
    if (!sheetsResult.ok && sheetsResult.error)
      warnings.push(sheetsResult.error);
    if (!dbResult.ok && dbResult.error) warnings.push(dbResult.error);

    const successMessage =
      warnings.length === 0
        ? normalizedPayload.isCAP
          ? "Registro guardado en Google Sheets y en base de datos."
          : "Registro guardado en base de datos."
        : `Registro procesado con advertencias. Puede continuar igual. ${warnings.join(" | ")}`;

    return NextResponse.json({
      ok: true,
      success: true,
      message: successMessage,
      warnings,
      attempts: {
        sheets: sheetsResult.skipped ? null : sheetsResult.attempts,
        database: dbResult.attempts,
      },
      storage: {
        sheets: sheetsResult.skipped ? false : sheetsResult.ok,
        sheetsAttempted: !sheetsResult.skipped,
        database: dbResult.ok,
        table: isCAP ? "CAP" : "CRE",
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      success: true,
      message: "No se pudo confirmar el guardado. Puede continuar igual.",
      warnings: [
        error instanceof Error
          ? error.message
          : "Error inesperado al enviar el registro.",
      ],
    });
  }
}
