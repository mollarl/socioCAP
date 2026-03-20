import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Upload } from "lucide-react";
import MD5 from "md5";
import { useState } from "react";

interface FormData {
  nombres: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  fechaExpiracion: string;
  matricula: string[];
  imagen: string | null;
}

interface CredentialFormProps {
  formData: FormData;
  cardRef: React.RefObject<HTMLDivElement>;
  isCAP: boolean;
  onFormChange: (
    field: keyof FormData,
    value: string | string[] | null,
  ) => void;
}

const matriculaOptions = ["Arquero", "Juez", "Entrenador", "Dirigente", "NO"];
const MAX_IMAGE_SIDE = 1280;
const MAX_IMAGE_BYTES = 900 * 1024;

function estimateDataUrlSizeBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No se pudo leer la imagen."));
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressImageToDataUrl(file: File) {
  const image = await loadImageElement(file);

  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height));
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo procesar la imagen.");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const qualities = [0.86, 0.76, 0.66, 0.56, 0.46];
  let best = canvas.toDataURL("image/jpeg", qualities[0]);

  for (const quality of qualities) {
    const candidate = canvas.toDataURL("image/jpeg", quality);
    best = candidate;
    if (estimateDataUrlSizeBytes(candidate) <= MAX_IMAGE_BYTES) {
      return candidate;
    }
  }

  return best;
}

export function CredentialForm({
  formData,
  cardRef,
  isCAP,
  onFormChange,
}: CredentialFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const updateField = (
    field: keyof FormData,
    value: string | string[] | null,
  ) => {
    onFormChange(field, value);
    if (isSaved) {
      setIsSaved(false);
      setSubmitSuccess("");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubmitError("");
      void (async () => {
        try {
          const compressedImage = await compressImageToDataUrl(file);
          updateField("imagen", compressedImage);
        } catch (error) {
          setSubmitError(
            error instanceof Error
              ? error.message
              : "No se pudo procesar la imagen seleccionada.",
          );
        }
      })();
    }
  };

  const handleMatriculaChange = (option: string) => {
    const currentMatricula = formData.matricula;
    if (currentMatricula.includes(option)) {
      updateField(
        "matricula",
        currentMatricula.filter((m) => m !== option),
      );
    } else {
      updateField("matricula", [...currentMatricula, option]);
    }
  };

  const buildControl = () => {
    if (!formData.dni || !formData.fechaExpiracion) return "";
    return MD5(formData.fechaExpiracion + formData.dni + "cap/control").slice(
      -6,
    );
  };

  const validateFormData = () => {
    if (!formData.nombres.trim()) return "Ingrese nombres.";
    if (!formData.apellido.trim()) return "Ingrese apellido.";
    if (!/^\d{7,8}$/.test(formData.dni.trim()))
      return "El DNI debe tener 7 u 8 dígitos.";
    if (!formData.fechaNacimiento) return "Ingrese fecha de nacimiento.";
    if (isCAP && formData.matricula.length === 0)
      return "Seleccione al menos una matrícula.";
    if (!formData.fechaExpiracion) return "Ingrese fecha de expiración.";
    if (formData.fechaExpiracion <= formData.fechaNacimiento) {
      return "La expiración debe ser posterior a la fecha de nacimiento.";
    }
    if (!formData.imagen) return "Suba una imagen.";
    return null;
  };

  const sanitizeCssValue = (property: string, value: string) => {
    const hasUnsupportedColorFn =
      /(oklch|oklab|lab|lch|color)\(/i.test(value);
    if (!hasUnsupportedColorFn) return value;

    if (property === "background-image") {
      return "linear-gradient(135deg, #facc15, #422006)";
    }
    if (property.includes("background")) return "#ffffff";
    if (property.includes("border")) return "#d1d5db";
    if (property.includes("shadow")) return "none";
    if (
      property.includes("color") ||
      property.includes("outline") ||
      property === "fill" ||
      property === "stroke"
    ) {
      return "#111827";
    }

    return "";
  };

  const createInlineStyledClone = (source: HTMLElement) => {
    const clone = source.cloneNode(true) as HTMLElement;

    const copyStyles = (sourceNode: Element, cloneNode: Element) => {
      const sourceEl = sourceNode as HTMLElement;
      const cloneEl = cloneNode as HTMLElement;
      const computed = window.getComputedStyle(sourceEl);

      for (const property of computed) {
        const rawValue = computed.getPropertyValue(property);
        const value = sanitizeCssValue(property, rawValue);
        if (!value) continue;
        cloneEl.style.setProperty(
          property,
          value,
          computed.getPropertyPriority(property),
        );
      }

      const sourceChildren = Array.from(sourceNode.children);
      const cloneChildren = Array.from(cloneNode.children);
      for (let index = 0; index < sourceChildren.length; index += 1) {
        const sourceChild = sourceChildren[index];
        const cloneChild = cloneChildren[index];
        if (sourceChild && cloneChild) {
          copyStyles(sourceChild, cloneChild);
        }
      }
    };

    copyStyles(source, clone);
    return clone;
  };

  const isCanvasBlank = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("2d");
    if (!context) return true;

    const width = canvas.width;
    const height = canvas.height;
    const samplePoints = [
      [Math.floor(width * 0.5), Math.floor(height * 0.5)],
      [Math.floor(width * 0.2), Math.floor(height * 0.2)],
      [Math.floor(width * 0.8), Math.floor(height * 0.2)],
      [Math.floor(width * 0.2), Math.floor(height * 0.8)],
      [Math.floor(width * 0.8), Math.floor(height * 0.8)],
    ];

    return samplePoints.every(([x, y]) => {
      const data = context.getImageData(x, y, 1, 1).data;
      const [r, g, b, a] = data;
      return a === 0 || (r === 255 && g === 255 && b === 255);
    });
  };

  const waitForImages = async (root: HTMLElement) => {
    const images = Array.from(root.querySelectorAll("img"));

    await Promise.all(
      images.map(async (img) => {
        img.loading = "eager";
        img.decoding = "sync";

        if (img.complete && img.naturalWidth > 0) {
          if (typeof img.decode === "function") {
            try {
              await img.decode();
            } catch {
              // Ignore decode failures; we still attempt export with the loaded bitmap.
            }
          }
          return;
        }

        await new Promise<void>((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      }),
    );
  };

  const handlePrimaryAction = async () => {
    if (isSaved) {
      setSubmitError("");
      setSubmitSuccess("");
      setIsSubmitting(true);

      try {
        if (!cardRef.current) {
          throw new Error("No se encontró la credencial para exportar.");
        }

        await document.fonts.ready;

        const exportNode = createInlineStyledClone(cardRef.current);
        const exportWrapper = document.createElement("div");
        exportWrapper.style.position = "fixed";
        exportWrapper.style.left = "-10000px";
        exportWrapper.style.top = "0";
        exportWrapper.style.zIndex = "-1";
        exportWrapper.style.background = "#ffffff";
        exportWrapper.style.padding = "0";
        exportWrapper.appendChild(exportNode);
        document.body.appendChild(exportWrapper);
        await waitForImages(exportNode);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );

        let canvas: HTMLCanvasElement;
        try {
          canvas = await html2canvas(exportNode, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            foreignObjectRendering: false,
          });
        } finally {
          document.body.removeChild(exportWrapper);
        }

        if (isCanvasBlank(canvas)) {
          throw new Error(
            "No se pudo renderizar la credencial para PDF. Intente nuevamente.",
          );
        }

        const imageData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: [350, 720],
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 12;
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;

        let renderWidth = maxWidth;
        let renderHeight = (canvas.height * renderWidth) / canvas.width;

        if (renderHeight > maxHeight) {
          renderHeight = maxHeight;
          renderWidth = (canvas.width * renderHeight) / canvas.height;
        }

        const x = (pageWidth - renderWidth) / 2;
        const y = (pageHeight - renderHeight) / 2;

        pdf.addImage(imageData, "PNG", x, y, renderWidth, renderHeight);
        pdf.save(`credencial-${formData.dni || "registro"}.pdf`);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo exportar el PDF.";
        setSubmitError(message);
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    setSubmitError("");
    setSubmitSuccess("");

    const validationError = validateFormData();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);
    const control = buildControl();

    try {
      const response = await fetch("/api/sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombres: formData.nombres.trim(),
          apellido: formData.apellido.trim(),
          dni: formData.dni.trim(),
          fechaNacimiento: formData.fechaNacimiento,
          matricula: isCAP ? formData.matricula.join(", ") : "",
          expiracion: formData.fechaExpiracion,
          control,
          isCAP,
          timestamp: new Date().toISOString(),
        }),
      });

      const responseText = await response.text();
      let parsedResponse: {
        ok?: boolean;
        success?: boolean;
        error?: string;
        message?: string;
        warnings?: string[];
      } | null = null;
      try {
        parsedResponse = responseText ? JSON.parse(responseText) : null;
      } catch {
        parsedResponse = null;
      }

      if (
        !response.ok ||
        parsedResponse?.success === false ||
        parsedResponse?.ok === false
      ) {
        throw new Error(
          parsedResponse?.message ||
            parsedResponse?.error ||
            "No se pudo guardar el registro.",
        );
      }

      setIsSaved(true);
      setSubmitSuccess(
        parsedResponse?.message ||
          "Registro procesado. Ya puede exportar el PDF.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error inesperado al guardar el registro.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Datos Personales</h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="nombres"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nombres
          </label>
          <input
            id="nombres"
            type="text"
            value={formData.nombres}
            onChange={(e) => updateField("nombres", e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
            placeholder="Ingrese nombres"
            required
          />
        </div>

        <div>
          <label
            htmlFor="apellido"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Apellido
          </label>
          <input
            id="apellido"
            type="text"
            value={formData.apellido}
            onChange={(e) => updateField("apellido", e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
            placeholder="Ingrese apellido"
            required
          />
        </div>

        <div>
          <label
            htmlFor="dni"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            DNI
          </label>
          <input
            id="dni"
            type="text"
            value={formData.dni}
            onChange={(e) => updateField("dni", e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
            placeholder="Ingrese DNI"
            required
          />
        </div>

        <div>
          <label
            htmlFor="fechaNacimiento"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Fecha de Nacimiento
          </label>
          <input
            id="fechaNacimiento"
            type="date"
            value={formData.fechaNacimiento}
            onChange={(e) => updateField("fechaNacimiento", e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
            required
          />
        </div>

        {isCAP && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Matrícula
            </label>
            <div className="space-y-2">
              {matriculaOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center space-x-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.matricula.includes(option)}
                    onChange={() => handleMatriculaChange(option)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="fechaExpiracion"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Expiración
          </label>
          <input
            id="fechaExpiracion"
            type="date"
            value={formData.fechaExpiracion}
            onChange={(e) => updateField("fechaExpiracion", e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imagen
          </label>
          <div className="relative">
            <input
              id="imagen"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <label
              htmlFor="imagen"
              className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-yellow-500 transition-colors"
            >
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  {formData.imagen ? "Cambiar imagen" : "Subir imagen"}
                </p>
              </div>
            </label>
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={isSubmitting}
            className="w-full px-4 py-2 text-yellow-800 border-2 border-yellow-400 bg-yellow-400 rounded-lg hover:border-yellow-500 focus:border-transparent outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? isSaved
                ? "Exportando..."
                : "Guardando..."
              : isSaved
                ? "Exportar PDF"
                : "Confirmar y generar registro"}
          </button>
        </div>
        <div className="space-y-2">
          {submitError && (
            <p className="text-sm text-red-600 font-medium">{submitError}</p>
          )}
          {submitSuccess && (
            <p className="text-sm text-green-700 font-medium">
              {submitSuccess}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
