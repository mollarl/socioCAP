import { User } from "lucide-react";
import MD5 from "md5";
import capLogo from "../img/cap.png";
import creLogo from "../img/cre.png";

interface FormData {
  nombres: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  fechaExpiracion: string;
  matricula: string[];
  imagen: string | null;
}

interface CredentialCardProps {
  formData: FormData;
  isCAP: boolean;
  institutionLabel: string;
  cardRef?: React.RefObject<HTMLDivElement>;
}

export function CredentialCard({
  formData,
  isCAP,
  institutionLabel,
  cardRef,
}: CredentialCardProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };
  const control = formData.dni
    ? MD5(formData.fechaExpiracion + formData.dni + "cap/control").slice(-6)
    : null;
  const logo = isCAP ? capLogo : creLogo;
  const logoAlt = isCAP ? "Logo CAP" : "Logo CRE";

  return (
    <div className="flex items-center justify-center p-2 sm:p-4 md:p-8 overflow-x-auto">
      <div
        ref={cardRef}
        className={`w-full max-w-[350px] min-w-[350px] bg-gradient-to-br ${isCAP ? "from-yellow-400 to-yellow-950" : "from-green-400 to-green-950"} rounded-2xl shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className={`${isCAP ? "bg-black" : "bg-red-500"} py-4 px-6`}>
          <h3
            className={`text-white text-center font-bold ${isCAP ? "text-lg" : "text-sm"} tracking-wide`}
          >
            {institutionLabel}
          </h3>
          <p className="text-white text-center text-sm">
            {isCAP && (
              <>
                <strong>Tiro con Arco</strong> |{" "}
              </>
            )}
            Credencial digital
          </p>
        </div>

        {/* Photo Section */}
        <div className="relative flex justify-center py-6 px-6">
          <div className="w-40 h-40 rounded-full bg-white overflow-hidden border-4 border-white shadow-lg">
            {formData.imagen ? (
              <div className="relative h-full w-full">
                <img
                  src={formData.imagen}
                  alt="Foto de perfil"
                  className="absolute left-1/2 top-1/2 h-auto w-auto min-h-full min-w-full -translate-x-1/2 -translate-y-1/2"
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <User className="w-20 h-20 text-gray-400" />
              </div>
            )}
          </div>
          <div className="absolute z-10000 bottom-5 ml-30 text-black">
            <img
              src={logo.src}
              alt={logoAlt}
              className="h-14 w-auto max-w-28"
            />
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-white mx-4 mb-4 rounded-xl p-6 space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Nombres
            </p>
            <p className="text-gray-900 font-semibold">
              {formData.nombres || "-"}
            </p>
          </div>

          <div className="border-b border-gray-200 pb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Apellido
            </p>
            <p className="text-gray-900 font-semibold">
              {formData.apellido || "-"}
            </p>
          </div>

          <div className="border-b border-gray-200 pb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              DNI
            </p>
            <p className="text-gray-900 font-semibold">{formData.dni || "-"}</p>
          </div>

          <div className="border-b border-gray-200 pb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Fecha de Nacimiento
            </p>
            <p className="text-gray-900 font-semibold">
              {formData.fechaNacimiento
                ? formatDate(formData.fechaNacimiento)
                : "-"}
            </p>
          </div>

          {isCAP && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Matrícula
              </p>
              <div className="flex flex-wrap gap-2">
                {formData.matricula.length > 0 ? (
                  formData.matricula.map((mat) => (
                    <span
                      key={mat}
                      className="inline-block px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium"
                    >
                      {mat}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-900 font-semibold">-</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`${isCAP ? "bg-black" : "bg-red-500"} py-3 px-6`}>
          <p className="text-white text-center text-xs opacity-80">
            {formData.fechaExpiracion
              ? `Válida hasta ${formatDate(formData.fechaExpiracion)}`
              : "-"}{" "}
            {control && (
              <>
                <strong>|</strong> Control: <strong>{control}</strong>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
