"use client";

import { useRef, useState } from "react";
import { CredentialForm } from "./components/CredentialForm";
import { CredentialCard } from "./components/CredentialCard";

interface FormData {
  nombres: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  fechaExpiracion: string;
  matricula: string[];
  imagen: string | null;
}

const PACIFICO_INSTITUTION = "CLUB ATLÉTICO PACÍFICO";
const CRE_INSTITUTION =
  "CENTRO DE RESIDENTES ENTRERRIANOS DE RÍO NEGRO Y NEUQUÉN";

type Institution = typeof PACIFICO_INSTITUTION | typeof CRE_INSTITUTION;

export default function App() {
  const credentialCardRef = useRef<HTMLDivElement>(null);
  const [institution, setInstitution] = useState<Institution | "">("");
  const [formData, setFormData] = useState<FormData>({
    nombres: "",
    apellido: "",
    dni: "",
    fechaNacimiento: "",
    fechaExpiracion: "",
    matricula: [],
    imagen: null,
  });

  const handleFormChange = (
    field: keyof FormData,
    value: string | string[] | null,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const showFullForm = institution !== "";
  const isCAP = institution === PACIFICO_INSTITUTION;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Generador de Credencial Digital
          </h1>
          <p className="text-gray-600">
            Complete el formulario para generar su credencial
          </p>
        </div>

        <div
          className={`grid w-full gap-8 items-start mx-auto ${showFullForm ? "max-w-7xl lg:grid-cols-2" : "max-w-3xl"}`}
        >
          {/* Formulario */}
          <div className="min-w-0 bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
            <div>
              <label
                htmlFor="institution"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Institución
              </label>
              <select
                id="institution"
                value={institution}
                onChange={(e) =>
                  setInstitution(e.target.value as Institution | "")
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">Seleccione una institución</option>
                <option value={PACIFICO_INSTITUTION}>
                  {PACIFICO_INSTITUTION}
                </option>
                <option value={CRE_INSTITUTION}>{CRE_INSTITUTION}</option>
              </select>
            </div>

            {showFullForm && (
              <div className="mt-8">
                <CredentialForm
                  formData={formData}
                  onFormChange={handleFormChange}
                  cardRef={credentialCardRef}
                  isCAP={isCAP}
                />
              </div>
            )}
          </div>

          {/* Vista previa de credencial */}
          {showFullForm && (
            <div className="min-w-0 lg:sticky lg:top-8">
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 overflow-hidden">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                  Vista Previa
                </h2>
                <CredentialCard
                  formData={formData}
                  cardRef={credentialCardRef}
                  isCAP={isCAP}
                  institutionLabel={institution}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
