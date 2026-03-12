import { NextResponse } from "next/server";

const DEFAULT_CAP_DEPLOYMENT_ID =
  "AKfycbw66IpeMriK-t2tCH52qpxvdTwmJNT2Yp0YD0VkUqArqFGXGsCcHGv8fFkvPWXrHrne";
const DEFAULT_CRE_DEPLOYMENT_ID = "testid";

function resolveWebAppUrl(rawValue: string | undefined, isCAP: boolean) {
  const fallbackDeploymentId = isCAP
    ? DEFAULT_CAP_DEPLOYMENT_ID
    : DEFAULT_CRE_DEPLOYMENT_ID;
  const value = (rawValue || fallbackDeploymentId).trim().replace(/^"|"$/g, "");

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://script.google.com/macros/s/${value}/exec`;
}

function resolveEnvWebAppValue(isCAP: boolean) {
  if (isCAP) {
    return process.env.NEXT_PUBLIC_GAS_WEB_APP_URL;
  } else {
    return process.env.NEXT_PUBLIC_GAS_WEB_APP_URL_CRE;
  }
}

export async function POST(request: Request) {
  try {
    const rawPayload = await request.json();
    const payload =
      rawPayload && typeof rawPayload === "object"
        ? (rawPayload as Record<string, unknown>)
        : {};
    const isCAP = payload.isCAP !== false;
    const { isCAP: _isCAP, ...googlePayload } = payload;

    const webAppUrl = resolveWebAppUrl(resolveEnvWebAppValue(isCAP), isCAP);

    const googleResponse = await fetch(webAppUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(googlePayload),
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
      return NextResponse.json(
        {
          ok: false,
          message:
            parsed?.message ||
            parsed?.error ||
            `Google Apps Script respondió ${googleResponse.status}.`,
        },
        { status: 502 },
      );
    }

    if (parsed?.ok === false || parsed?.success === false) {
      return NextResponse.json(
        {
          ok: false,
          message:
            parsed?.message ||
            parsed?.error ||
            "Apps Script rechazó el registro.",
        },
        { status: 400 },
      );
    }

    const explicitlyAccepted = parsed?.ok === true || parsed?.success === true;
    if (!explicitlyAccepted) {
      const compactPreview = responseText.replace(/\s+/g, " ").slice(0, 220);
      return NextResponse.json(
        {
          ok: false,
          message:
            "Apps Script no confirmó el guardado (no devolvió JSON con ok:true/success:true).",
          responsePreview: compactPreview,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: parsed?.message || "Registro guardado correctamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Error inesperado al enviar el registro.",
      },
      { status: 500 },
    );
  }
}
