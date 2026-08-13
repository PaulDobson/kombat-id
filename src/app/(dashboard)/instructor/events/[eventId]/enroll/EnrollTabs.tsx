"use client";

import { useState } from "react";
import { EnrollForm } from "./EnrollForm";
import { DeleteRegistrationButton } from "@/modules/event-registration/presentation/components/DeleteRegistrationButton";
import { isDeletable } from "@/modules/event-registration/domain/entities/eventRegistration";

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
  eventRegistrationFee: number | null;
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
  eventId,
  eventRegistrationFee,
}: {
  registrations: Registration[];
  students: Student[];
  isCompetition: boolean;
  eventId: string;
  eventRegistrationFee: number | null;
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
      <div className="text-center py-20 px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-neutral-800 rounded-2xl border border-neutral-700 mb-5">
          <svg
            className="w-10 h-10 text-neutral-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-neutral-300 mb-2">
          Sin inscripciones aún
        </h3>
        <p className="text-neutral-500 text-sm max-w-sm mx-auto">
          Aún no has inscrito alumnos en este evento. Usa la pestaña
          &quot;Inscribir alumnos&quot; para comenzar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        {counts.confirmada > 0 && (
          <div className="flex items-center gap-3 bg-linear-to-br from-success-900/30 to-success-900/10 border border-success-700/50 rounded-xl px-4 py-3 hover:border-success-600/50 transition-all group">
            <div className="p-2 bg-success-500/20 rounded-lg border border-success-500/30 group-hover:bg-success-500/30 transition-colors">
              <svg
                className="w-5 h-5 text-success-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-success-400 font-medium uppercase tracking-wider mb-0.5">
                Confirmadas
              </p>
              <p className="text-2xl font-bold text-success-300 tabular-nums">
                {counts.confirmada}
              </p>
            </div>
          </div>
        )}
        {counts.pendiente_pago > 0 && (
          <div className="flex items-center gap-3 bg-linear-to-br from-warning-900/30 to-warning-900/10 border border-warning-700/50 rounded-xl px-4 py-3 hover:border-warning-600/50 transition-all group">
            <div className="p-2 bg-warning-500/20 rounded-lg border border-warning-500/30 group-hover:bg-warning-500/30 transition-colors">
              <svg
                className="w-5 h-5 text-warning-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-warning-400 font-medium uppercase tracking-wider mb-0.5">
                Pendiente pago
              </p>
              <p className="text-2xl font-bold text-warning-300 tabular-nums">
                {counts.pendiente_pago}
              </p>
            </div>
          </div>
        )}
        {counts.cancelada > 0 && (
          <div className="flex items-center gap-3 bg-linear-to-br from-neutral-800/50 to-neutral-800/20 border border-neutral-700 rounded-xl px-4 py-3 hover:border-neutral-600 transition-all group">
            <div className="p-2 bg-neutral-700/50 rounded-lg border border-neutral-600 group-hover:bg-neutral-700 transition-colors">
              <svg
                className="w-5 h-5 text-neutral-500"
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
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-0.5">
                Canceladas
              </p>
              <p className="text-2xl font-bold text-neutral-400 tabular-nums">
                {counts.cancelada}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700 bg-neutral-900/80">
                <th className="text-left px-4 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Alumno
                </th>
                {isCompetition && (
                  <th className="text-left px-4 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    Grado
                  </th>
                )}
                <th className="text-left px-4 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                  Inscrito el
                </th>
                <th className="text-right px-4 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {registrations.map((reg) => {
                const student = studentMap.get(reg.practitionerId);
                const canDelete = isDeletable(reg.status, eventRegistrationFee);
                return (
                  <tr
                    key={reg.id}
                    className="hover:bg-neutral-800/60 transition-all duration-200 border-l-4 border-transparent hover:border-primary-500/30"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            reg.status === "confirmada"
                              ? "bg-success-500"
                              : reg.status === "pendiente_pago"
                                ? "bg-warning-500"
                                : "bg-neutral-600"
                          }`}
                        />
                        <span className="text-neutral-100 font-medium">
                          {reg.practitionerName}
                        </span>
                      </div>
                    </td>
                    {isCompetition && (
                      <td className="px-4 py-4 hidden sm:table-cell">
                        {student ? (
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${GRADE_STYLES[student.grade] ?? GRADE_STYLES.white}`}
                          >
                            {GRADE_LABELS[student.grade] ?? student.grade}
                            {student.dan ? ` ${student.dan}° Dan` : ""}
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${STATUS_STYLES[reg.status] ?? STATUS_STYLES.cancelada}`}
                      >
                        {reg.status === "confirmada" && (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        {reg.status === "pendiente_pago" && (
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
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                        {STATUS_LABELS[reg.status] ?? reg.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-neutral-400 text-xs tabular-nums hidden md:table-cell">
                      {formatDate(reg.registeredAt)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {canDelete && (
                        <DeleteRegistrationButton
                          registrationId={reg.id}
                          eventId={eventId}
                          studentName={reg.practitionerName}
                        />
                      )}
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
  eventRegistrationFee,
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
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-2 bg-neutral-800/60 border border-neutral-700 rounded-xl p-1.5 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-linear-to-br from-neutral-900 to-neutral-900/90 text-neutral-50 shadow-lg border border-neutral-700"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40"
            }`}
          >
            {tab.id === "inscribir" && (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            )}
            {tab.id === "inscritos" && (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-bold tabular-nums transition-all ${
                  activeTab === tab.id
                    ? "bg-primary-600 text-white shadow-lg shadow-primary-500/30"
                    : "bg-neutral-700 text-neutral-400"
                }`}
              >
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-primary-500 rounded-full" />
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
          eventId={eventId}
          eventRegistrationFee={eventRegistrationFee}
        />
      )}
    </div>
  );
}
