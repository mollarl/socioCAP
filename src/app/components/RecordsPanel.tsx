"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import type { RecordsTable } from "@/lib/auth/authorization";

type RecordRow = {
  id: number;
  nombres: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string | null;
  matricula: string | null;
  expiracion: string | null;
  control: string | null;
  timestamp: string | null;
  created_at: string;
};

type RecordsResponse = {
  ok: boolean;
  message?: string;
  records?: RecordRow[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type DeleteResponse = {
  ok: boolean;
  message?: string;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR");
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR");
}

interface RecordsPanelProps {
  allowedTables: RecordsTable[];
}

export function RecordsPanel({ allowedTables }: RecordsPanelProps) {
  const [selectedTable, setSelectedTable] = useState<RecordsTable | "">("");
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (allowedTables.length === 0) {
      setSelectedTable("");
      setPage(1);
      return;
    }

    if (!selectedTable || !allowedTables.includes(selectedTable)) {
      setSelectedTable(allowedTables[0]);
      setPage(1);
    }
  }, [allowedTables, selectedTable]);

  useEffect(() => {
    if (!selectedTable) {
      setRecords([]);
      setTotalPages(1);
      setTotalItems(0);
      setError("");
      return;
    }

    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/records?table=${selectedTable}&page=${page}`,
        );
        const payload = (await response.json()) as RecordsResponse;

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.message || "No se pudieron cargar los registros.",
          );
        }

        if (isCancelled) return;
        setRecords(payload.records || []);
        setTotalPages(payload.pagination?.totalPages || 1);
        setTotalItems(payload.pagination?.total || 0);
      } catch (fetchError) {
        if (isCancelled) return;
        setRecords([]);
        setTotalPages(1);
        setTotalItems(0);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Error inesperado al cargar los registros.",
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [selectedTable, page, reloadKey]);

  const handleDelete = async (id: number) => {
    if (!selectedTable || deletingId !== null) return;

    const confirmed = window.confirm(
      `Se eliminará el registro #${id} de ${selectedTable}. ¿Desea continuar?`,
    );
    if (!confirmed) return;

    setDeletingId(id);
    setError("");

    try {
      const response = await fetch("/api/records", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table: selectedTable,
          id,
        }),
      });

      const payload = (await response.json()) as DeleteResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "No se pudo eliminar el registro.");
      }

      if (records.length === 1 && page > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      } else {
        setReloadKey((prev) => prev + 1);
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Error inesperado al eliminar el registro.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const tableLabel = useMemo(() => {
    if (selectedTable === "CAP") return "CLUB ATLÉTICO PACÍFICO";
    if (selectedTable === "CRE")
      return "CENTRO DE RESIDENTES ENTRERRIANOS DE RÍO NEGRO Y NEUQUÉN";
    return "";
  }, [selectedTable]);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Registros</h2>
          <p className="text-sm text-gray-600 mt-1">
            Seleccione una tabla para cargar resultados.
          </p>
        </div>

        <div>
          <label
            htmlFor="records-table"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Tabla
          </label>
          <select
            id="records-table"
            value={selectedTable}
            onChange={(event) => {
              setSelectedTable(event.target.value as RecordsTable | "");
              setPage(1);
            }}
            disabled={allowedTables.length <= 1}
            className="w-full max-w-lg px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none bg-white"
          >
            {allowedTables.length > 1 && (
              <option value="">Seleccione una tabla</option>
            )}
            {allowedTables.includes("CAP") && <option value="CAP">CAP</option>}
            {allowedTables.includes("CRE") && (
              <option value="CRE">CRERNyN</option>
            )}
          </select>
        </div>

        {selectedTable && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <p className="text-sm text-gray-700">
                Tabla: <strong>{selectedTable}</strong>{" "}
                {tableLabel && (
                  <span className="text-gray-500">({tableLabel})</span>
                )}
              </p>
              <p className="text-sm text-gray-600">Total: {totalItems}</p>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      ID
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Nombre completo
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      DNI
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      F. Nacimiento
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Matrícula
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Expiración
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Control
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Registrado
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-6 text-center text-gray-600"
                      >
                        Cargando registros...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-6 text-center text-gray-600"
                      >
                        No hay registros para mostrar.
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">{record.id}</td>
                        <td className="px-4 py-3">
                          {record.nombres} {record.apellido}
                        </td>
                        <td className="px-4 py-3">{record.dni || "-"}</td>
                        <td className="px-4 py-3">
                          {formatDate(record.fecha_nacimiento)}
                        </td>
                        <td className="px-4 py-3">{record.matricula || "-"}</td>
                        <td className="px-4 py-3">
                          {formatDate(record.expiracion)}
                        </td>
                        <td className="px-4 py-3">{record.control || "-"}</td>
                        <td className="px-4 py-3">
                          {formatDateTime(
                            record.timestamp || record.created_at,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleDelete(record.id)}
                            disabled={deletingId !== null}
                            title={`Eliminar registro #${record.id}`}
                            className="inline-flex items-center justify-center rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={isLoading || page <= 1}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-700">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={isLoading || page >= totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
