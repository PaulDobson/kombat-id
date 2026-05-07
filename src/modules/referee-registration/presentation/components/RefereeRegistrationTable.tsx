"use client";

import Link from "next/link";
import type { RefereeRegistration } from "../../domain/entities/refereeRegistration";
import { ApproveRegistrationButton } from "./ApproveRegistrationButton";
import { RejectRegistrationButton } from "./RejectRegistrationButton";
import { ViewCertificateButton } from "./ViewCertificateButton";

// Serializable DTO passed from Server Component
export type RefereeRegistrationRow = Pick<
  RefereeRegistration,
  | "id"
  | "fullName"
  | "email"
  | "country"
  | "registrationNumber"
  | "status"
  | "createdAt"
>;

const STATUS_BADGE: Record<
  RefereeRegistration["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Pendiente",
    className: "bg-amber-900/40 text-amber-300 border border-amber-700/40",
  },
  approved: {
    label: "Aprobado",
    className:
      "bg-emerald-900/40 text-emerald-300 border border-emerald-700/40",
  },
  rejected: {
    label: "Rechazado",
    className: "bg-red-900/40 text-red-300 border border-red-700/40",
  },
};

interface Props {
  registrations: RefereeRegistrationRow[];
  currentPage: number;
  totalPages: number;
}

export function RefereeRegistrationTable({
  registrations,
  currentPage,
  totalPages,
}: Props) {
  if (registrations.length === 0) {
    return (
      <div className="text-center py-16 text-neutral-500 text-sm">
        No hay registros que coincidan con el filtro seleccionado.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-neutral-700/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-700/60 bg-neutral-800/60">
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                País
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                N° Registro
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-700/40">
            {registrations.map((reg) => {
              const badge = STATUS_BADGE[reg.status];
              return (
                <tr
                  key={reg.id}
                  className="bg-neutral-900/40 hover:bg-neutral-800/40 transition-colors"
                >
                  <td className="px-4 py-3 text-neutral-200 font-medium">
                    {reg.fullName}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{reg.email}</td>
                  <td className="px-4 py-3 text-neutral-400">{reg.country}</td>
                  <td className="px-4 py-3 text-neutral-400 font-mono text-xs">
                    {reg.registrationNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">
                    {new Date(reg.createdAt).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {reg.status === "pending" && (
                        <>
                          <ApproveRegistrationButton id={reg.id} />
                          <RejectRegistrationButton id={reg.id} />
                        </>
                      )}
                      <ViewCertificateButton id={reg.id} />
                      <Link
                        href={`/admin/referee-registrations/${reg.id}`}
                        className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-neutral-500">
            Página {currentPage} de {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
