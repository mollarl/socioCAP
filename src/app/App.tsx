'use client';

import { useRef, useState } from 'react';
import { CredentialForm } from './components/CredentialForm';
import { CredentialCard } from './components/CredentialCard';

interface FormData {
  nombres: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  fechaExpiracion: string;
  matricula: string[];
  imagen: string | null;
}

export default function App() {
  const credentialCardRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<FormData>({
    nombres: '',
    apellido: '',
    dni: '',
    fechaNacimiento: '',
    fechaExpiracion: '',
    matricula: [],
    imagen: null,
  });

  const handleFormChange = (field: keyof FormData, value: string | string[] | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Generador de Credencial Digital
          </h1>
          <p className="text-gray-600">
            Complete el formulario para generar su credencial
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start max-w-7xl mx-auto">
          {/* Formulario */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <CredentialForm 
              formData={formData} 
              onFormChange={handleFormChange} 
              cardRef={credentialCardRef}
            />
          </div>

          {/* Vista previa de credencial */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                Vista Previa
              </h2>
              <CredentialCard formData={formData} cardRef={credentialCardRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
