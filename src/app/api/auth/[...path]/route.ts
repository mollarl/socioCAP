import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type AuthRouteContext = { params: Promise<{ path: string[] }> };

function authConfigErrorResponse(error: unknown) {
  return NextResponse.json(
    {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Error de configuración de autenticación.",
    },
    { status: 500 },
  );
}

export async function GET(request: Request, context: AuthRouteContext) {
  try {
    return getAuth().handler().GET(request, context);
  } catch (error) {
    return authConfigErrorResponse(error);
  }
}

export async function POST(request: Request, context: AuthRouteContext) {
  try {
    return getAuth().handler().POST(request, context);
  } catch (error) {
    return authConfigErrorResponse(error);
  }
}

export async function PUT(request: Request, context: AuthRouteContext) {
  try {
    return getAuth().handler().PUT(request, context);
  } catch (error) {
    return authConfigErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: AuthRouteContext) {
  try {
    return getAuth().handler().DELETE(request, context);
  } catch (error) {
    return authConfigErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: AuthRouteContext) {
  try {
    return getAuth().handler().PATCH(request, context);
  } catch (error) {
    return authConfigErrorResponse(error);
  }
}
