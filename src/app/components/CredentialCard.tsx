import { User } from "lucide-react";
import MD5 from "md5";

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
  cardRef?: React.RefObject<HTMLDivElement>;
}

export function CredentialCard({ formData, cardRef }: CredentialCardProps) {
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

  return (
    <div className="flex items-center justify-center p-8">
      <div
        ref={cardRef}
        className="w-[350px] bg-gradient-to-br from-yellow-400 to-yellow-950 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-black py-4 px-6">
          <h3 className="text-white text-center font-bold text-lg tracking-wide">
            CLUB ATLÉTICO PACÍFICO
          </h3>
          <p className="text-white text-center text-sm">
            <strong>Tiro con Arco</strong> | Credencial digital
          </p>
        </div>

        {/* Photo Section */}
        <div className="flex justify-center py-6 px-6">
          <div className="w-40 h-40 rounded-full bg-white overflow-hidden border-4 border-white shadow-lg">
            {formData.imagen ? (
              <img
                src={formData.imagen}
                alt="Foto de perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <User className="w-20 h-20 text-gray-400" />
              </div>
            )}
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
        </div>

        {/* Footer */}
        <div className="bg-black py-3 px-6">
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
