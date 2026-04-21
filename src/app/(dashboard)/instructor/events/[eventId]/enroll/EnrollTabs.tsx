"use client";

import { useState } from "react";
import { EnrollForm } from "./EnrollForm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Student {
  id: string;
  full_name: string;
  grade: string;
  dan: number | null;
}

export interface Registration {
  id: string;
  practitionerId: string;
  practitionerName: string;
  status: "pendiente_pago" | "confirmada" | "cancelada";
  registeredAt: string;
}

interface Props {
  eventId: string;
  students: Student[];
  registrations: Registration[];
  isCompetition: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: "Pendiente pago",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

const STATUS_STYLES: Record<string, string> = {
  pendiente_pago:
    "bg-warning-500/10 text-warning-400 border border-warning-500/30",
  confirmada: "bg-success-900/50 text-success-400 border border-success-800",
  cancelada: "bg-neutral-800 text-neutral-500 border border-neutral-700",
};

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const GRADE_STYLES: Record<string, string> = {
  white: "bg-neutral-700 text-neutral-200 border border-neutral-600",
  yellow: "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
  green: "bg-green-900/50 text-green-400 border border-green-800",
  blue: "bg-blue-900/50 text-blue-400 border border-blue-800",
  red: "bg-red-900/50 text-red-400 border border-red-800",
  black: "bg-neutral-800 text-neutral-100 border border-neutral-600",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Registered students tab
// ---------------------------------------------------------------------------

function RegisteredTab({
  registrations,
  students,
  isCompetition,
}: {
  registrations: Registration[];
  students: Student[];
  isCompetition: boolean;
}) {
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const counts = {
    confirmada: registrations.filter((r) => r.status === "confirmada").length,
    pendiente_pago: registrations.filter((r) => r.status === "pendiente_pago")
      .length,
    cancelada: registrations.filter((r) => r.status === "cancelada").length,
  };

  if (registrations.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500 text-sm">
          Aún no has inscrito alumnos en este evento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        {counts.confirmada > 0 && (
          <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5">
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES.confirmada}`}
            >
              Confirmada
            </span>
            <span className="text-neutral-100 font-semibold tabular-nums text-sm">
              {counts.confirmada}
            </span>
          </div>
        )}
        {counts.pendiente_pago > 0 && (
          <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5">
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES.pendiente_pago}`}
            >
              Pendiente pago
            </span>
            <span className="text-neutral-100 font-semibold tabular-nums text-sm">
              {counts.pendiente_pago}
            </span>
          </div>
        )}
        {counts.cancelada > 0 && (
          <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5">
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES.cancelada}`}
            >
              Cancelada
            </span>
            <span className="text-neutral-100 font-semibold tabular-nums text-sm">
              {counts.cancelada}
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700 bg-neutral-900/80">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Alumno
                </th>
                {isCompetition && (
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    Grado
                  </th>
                )}
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                  Inscrito el
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {registrations.map((reg) => {
                const student = studentMap.get(reg.practitionerId);
                return (
                  <tr
                    key={reg.id}
                    className="hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-neutral-100 font-medium">
                      {reg.practitionerName}
                    </td>
                    {isCompetition && (
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {student ? (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${GRADE_STYLES[student.grade] ?? GRADE_STYLES.white}`}
                          >
                            {GRADE_LABELS[student.grade] ?? student.grade}
                            {student.dan ? ` ${student.dan}° Dan` : ""}
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[reg.status] ?? STATUS_STYLES.cancelada}`}
                      >
                        {STATUS_LABELS[reg.status] ?? reg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400 text-xs tabular-nums hidden md:table-cell">
                      {formatDate(reg.registeredAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main tabs component
// ---------------------------------------------------------------------------

type Tab = "inscribir" | "inscritos";

export function EnrollTabs({
  eventId,
  students,
  registrations,
  isCompetition,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("inscribir");

  const enrolledIds = new Set(
    registrations
      .filter((r) => r.status !== "cancelada")
      .map((r) => r.practitionerId),
  );

  // Students not yet actively registered
  const availableStudents = students.filter((s) => !enrolledIds.has(s.id));

  const tabs: { id: Tab; label: string; count?: number }[] = [
    {
      id: "inscribir",
      label: "Inscribir alumnos",
      count: availableStudents.length,
    },
    {
      id: "inscritos",
      label: "Mis inscritos",
      count: registrations.filter((r) => r.status !== "cancelada").length,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 bg-neutral-800/60 border border-neutral-700 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-neutral-900 text-neutral-50 shadow-sm border border-neutral-700"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold tabular-nums ${
                  activeTab === tab.id
                    ? "bg-primary-600 text-white"
                    : "bg-neutral-700 text-neutral-400"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "inscribir" && (
        <EnrollForm
          eventId={eventId}
          students={availableStudents}
          isCompetition={isCompetition}
        />
      )}

      {activeTab === "inscritos" && (
        <RegisteredTab
          registrations={registrations}
          students={students}
          isCompetition={isCompetition}
        />
      )}
    </div>
  );
}
