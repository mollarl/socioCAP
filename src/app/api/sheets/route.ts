import { NextResponse } from "next/server";

const DEFAULT_DEPLOYMENT_ID =
  "AKfycbw66IpeMriK-t2tCH52qpxvdTwmJNT2Yp0YD0VkUqArqFGXGsCcHGv8fFkvPWXrHrne";

function resolveWebAppUrl(rawValue: string | undefined) {
  const value = (rawValue || DEFAULT_DEPLOYMENT_ID).trim().replace(/^"|"$/g, "");

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://script.google.com/macros/s/${value}/exec`;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const webAppUrl = resolveWebAppUrl(process.env.NEXT_PUBLIC_GAS_WEB_APP_URL);

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
    let parsed: { ok?: boolean; success?: boolean; message?: string; error?: string } | null =
      null;
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
            parsed?.message || parsed?.error || "Apps Script rechazó el registro.",
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
