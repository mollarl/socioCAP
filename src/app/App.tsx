"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CredentialForm } from "./components/CredentialForm";
import { CredentialCard } from "./components/CredentialCard";
import { RecordsPanel } from "./components/RecordsPanel";
import { AccountDialog } from "./components/AccountDialog";
import { authClient } from "@/lib/auth/client";
import {
  extractRawUserRole,
  normalizeUserRole,
  type RecordsTable,
} from "@/lib/auth/authorization";

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
type AppTab = "create" | "records";

export default function App() {
  const router = useRouter();
  const credentialCardRef = useRef<HTMLDivElement>(null);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("create");
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
  const { data: sessionData, isPending } = authClient.useSession();
  const userRole = normalizeUserRole(extractRawUserRole(sessionData?.user));
  const isAdmin = userRole === "admin";
  const isCapUser = userRole === "cap";
  const isCreUser = userRole === "cre";

  const handleFormChange = (
    field: keyof FormData,
    value: string | string[] | null,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    if (!isPending && !sessionData?.user) {
      router.replace("/auth/sign-in");
    }
  }, [isPending, router, sessionData?.user]);

  useEffect(() => {
    if (isCapUser) {
      setInstitution(PACIFICO_INSTITUTION);
      return;
    }
    if (isCreUser) {
      setInstitution(CRE_INSTITUTION);
    }
  }, [isCapUser, isCreUser]);

  const showFullForm = institution !== "";
  const isCAP = institution === PACIFICO_INSTITUTION;

  const allowedTables: RecordsTable[] = useMemo(() => {
    if (isAdmin) return ["CAP", "CRE"];
    if (isCapUser) return ["CAP"];
    if (isCreUser) return ["CRE"];
    return [];
  }, [isAdmin, isCapUser, isCreUser]);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.replace("/auth/sign-in");
    router.refresh();
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <p className="text-gray-700">Cargando sesión...</p>
      </div>
    );
  }

  if (!sessionData?.user) {
    return null;
  }

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6 sm:p-8 space-y-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            Acceso no autorizado
          </h1>
          <p className="text-gray-700">
            Su usuario no tiene un rol válido. Contacte al administrador.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Generador de Credencial Digital
              </h1>
              <p className="text-gray-600">
                {activeTab === "create"
                  ? "Complete el formulario para generar su credencial"
                  : "Consulte registros de CAP o CRE en forma paginada"}
              </p>
            </div>

            <div className="flex items-center gap-3 self-center sm:self-start">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-700 uppercase">
                {userRole}
              </span>
              <button
                type="button"
                onClick={() => setIsAccountDialogOpen(true)}
                className="max-w-[280px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm truncate"
                title={sessionData.user.email}
              >
                {sessionData.user.email}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mb-6">
          <div className="inline-flex rounded-xl bg-white p-1 shadow-sm border border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "create" ? "bg-yellow-400 text-yellow-900" : "text-gray-700 hover:bg-gray-100"}`}
            >
              Crear credencial
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("records")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "records" ? "bg-yellow-400 text-yellow-900" : "text-gray-700 hover:bg-gray-100"}`}
            >
              Registros
            </button>
          </div>
        </div>

        {activeTab === "create" ? (
          <div
            className={`grid w-full gap-8 items-start mx-auto ${showFullForm ? "max-w-7xl lg:grid-cols-2" : "max-w-3xl"}`}
          >
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
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none bg-white disabled:opacity-90"
                >
                  {isAdmin ? (
                    <>
                      <option value="">Seleccione una institución</option>
                      <option value={PACIFICO_INSTITUTION}>
                        {PACIFICO_INSTITUTION}
                      </option>
                      <option value={CRE_INSTITUTION}>{CRE_INSTITUTION}</option>
                    </>
                  ) : isCapUser ? (
                    <option value={PACIFICO_INSTITUTION}>
                      {PACIFICO_INSTITUTION}
                    </option>
                  ) : (
                    <option value={CRE_INSTITUTION}>{CRE_INSTITUTION}</option>
                  )}
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
        ) : (
          <RecordsPanel allowedTables={allowedTables} />
        )}
      </div>

      <AccountDialog
        email={sessionData.user.email}
        role={userRole}
        isOpen={isAccountDialogOpen}
        onOpenChange={setIsAccountDialogOpen}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
