"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getPractitionerSummary,
  type PractitionerSummary,
} from "../../getPractitionerSummary";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const BELT_COLORS: Record<string, string> = {
  white: "bg-neutral-100",
  yellow: "bg-yellow-400",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
  black: "bg-neutral-900 border border-neutral-600",
};

const ROLE_LABELS: Record<string, string> = {
  alumno: "Alumno",
  instructor: "Instructor",
  profesor: "Profesor",
  maestro: "Maestro",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcAge(birthDate: string): number {
  const today = new Date();
  const bd = new Date(birthDate);
  let age = today.getFullYear() - bd.getFullYear();
  if (today < new Date(today.getFullYear(), bd.getMonth(), bd.getDate())) age--;
  return age;
}

function formatBirthDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  practitionerId: string | null;
  onClose: () => void;
}

export function PractitionerDetailModal({ practitionerId, onClose }: Props) {
  const [data, setData] = useState<PractitionerSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!practitionerId) {
      setData(null);
      return;
    }
    setLoading(true);
    setData(null);
    getPractitionerSummary(practitionerId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [practitionerId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!practitionerId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-neutral-900 border border-neutral-700/60 rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-200">
            Detalle del practicante
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg
              className="w-6 h-6 text-primary-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          </div>
        ) : data ? (
          <>
            <div className="px-5 py-4 space-y-4">
              {/* Avatar + Name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary-700 to-primary-900 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-white">
                    {getInitials(data.fullName)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-100 leading-snug truncate">
                    {data.fullName}
                  </p>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">
                    {data.rut}
                  </p>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Grado */}
                <div className="bg-neutral-800/60 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-neutral-500 mb-1.5">Grado</p>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${BELT_COLORS[data.grade] ?? "bg-neutral-500"}`}
                    />
                    <span className="text-sm font-medium text-neutral-100">
                      {GRADE_LABELS[data.grade] ?? data.grade}
                    </span>
                    {data.dan !== null && (
                      <span className="text-xs text-neutral-500">
                        {data.dan}° Dan
                      </span>
                    )}
                  </div>
                </div>

                {/* Edad */}
                <div className="bg-neutral-800/60 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-neutral-500 mb-1.5">Edad</p>
                  <p className="text-sm font-medium text-neutral-100">
                    {calcAge(data.birthDate)} años
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5 truncate">
                    {formatBirthDate(data.birthDate)}
                  </p>
                </div>

                {/* Rol */}
                <div className="bg-neutral-800/60 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-neutral-500 mb-1.5">Rol</p>
                  <p className="text-sm font-medium text-neutral-100">
                    {ROLE_LABELS[data.role] ?? data.role}
                  </p>
                </div>

                {/* Género */}
                <div className="bg-neutral-800/60 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-neutral-500 mb-1.5">Género</p>
                  <p className="text-sm font-medium text-neutral-100">
                    {GENDER_LABELS[data.gender] ?? data.gender}
                  </p>
                </div>

                {/* Peso */}
                <div className="bg-neutral-800/60 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-neutral-500 mb-1.5">Peso</p>
                  <p className="text-sm font-medium text-neutral-100">
                    {data.weightKg !== null ? `${data.weightKg} kg` : "—"}
                  </p>
                </div>

                {/* Altura */}
                <div className="bg-neutral-800/60 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-neutral-500 mb-1.5">Altura</p>
                  <p className="text-sm font-medium text-neutral-100">
                    {data.heightCm !== null ? `${data.heightCm} cm` : "—"}
                  </p>
                </div>
              </div>

              {/* Inactivo warning */}
              {!data.isActive && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/40 rounded-lg">
                  <svg
                    className="w-3.5 h-3.5 text-red-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <p className="text-xs text-red-400">Practicante inactivo</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-neutral-800">
              <Link
                href={`/admin/practitioners/${data.id}`}
                target="_blank"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 border border-neutral-700 text-xs font-medium transition-colors"
              >
                Ver perfil completo
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-neutral-500 text-sm">
              No se encontró información del practicante.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
