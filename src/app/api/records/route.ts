import { NextResponse } from "next/server";
import { getPool } from "@/lib/database";
import { getAuth } from "@/lib/auth/server";
import {
  canAccessTable,
  extractRawUserRole,
  normalizeUserRole,
} from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

type RecordsTable = "CAP" | "CRE";

const PAGE_SIZE = 10;

function resolveTable(rawValue: string | null): RecordsTable | null {
  if (rawValue === "CAP" || rawValue === "CRE") {
    return rawValue;
  }
  return null;
}

function resolvePage(rawValue: string | null) {
  if (!rawValue) return 1;
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

export async function GET(request: Request) {
  try {
    const { data: sessionData } = await getAuth().getSession();
    const role = normalizeUserRole(extractRawUserRole(sessionData?.user));
    if (!sessionData?.user || !role) {
      return NextResponse.json(
        { ok: false, message: "No autorizado." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const table = resolveTable(searchParams.get("table"));
    if (!table) {
      return NextResponse.json(
        { ok: false, message: "Parámetro table inválido. Use CAP o CRE." },
        { status: 400 },
      );
    }

    if (!canAccessTable(role, table)) {
      return NextResponse.json(
        { ok: false, message: "No tiene permisos para consultar esta tabla." },
        { status: 403 },
      );
    }

    const page = resolvePage(searchParams.get("page"));
    const offset = (page - 1) * PAGE_SIZE;
    const tableName = table === "CAP" ? '"CAP"' : '"CRE"';
    const pool = getPool();

    const [countResult, rowsResult] = await Promise.all([
      pool.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM ${tableName}`),
      pool.query(
        `
          SELECT
            id,
            nombres,
            apellido,
            dni,
            fecha_nacimiento,
            matricula,
            expiracion,
            control,
            "timestamp",
            created_at
          FROM ${tableName}
          ORDER BY COALESCE("timestamp", created_at) DESC, id DESC
          LIMIT $1 OFFSET $2
        `,
        [PAGE_SIZE, offset],
      ),
    ]);

    const total = Number.parseInt(countResult.rows[0]?.total || "0", 10) || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const normalizedPage = Math.min(page, totalPages);

    if (normalizedPage !== page) {
      const normalizedOffset = (normalizedPage - 1) * PAGE_SIZE;
      const normalizedRowsResult = await pool.query(
        `
          SELECT
            id,
            nombres,
            apellido,
            dni,
            fecha_nacimiento,
            matricula,
            expiracion,
            control,
            "timestamp",
            created_at
          FROM ${tableName}
          ORDER BY COALESCE("timestamp", created_at) DESC, id DESC
          LIMIT $1 OFFSET $2
        `,
        [PAGE_SIZE, normalizedOffset],
      );

      return NextResponse.json({
        ok: true,
        table,
        records: normalizedRowsResult.rows,
        pagination: {
          page: normalizedPage,
          pageSize: PAGE_SIZE,
          total,
          totalPages,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      table,
      records: rowsResult.rows,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Error inesperado al obtener registros.",
      },
      { status: 500 },
    );
  }
}
