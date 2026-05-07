"use client";

import type { RefereeRegistrationStatus } from "@/modules/referee-registration/domain/entities/refereeRegistration";
import { DownloadCertificateButton } from "./DownloadCertificateButton";

interface RefereeProfile {
  id: string;
  fullName: string;
  email: string;
  country: string;
  registrationNumber: string;
  status: RefereeRegistrationStatus;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasCertificate: boolean;
}

interface Props {
  profile: RefereeProfile;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function StatusBadge({ status }: { status: RefereeRegistrationStatus }) {
  const config = {
    approved: {
      label: "Acreditado",
      dot: "bg-success-400",
      pill: "bg-success-500/10 border-success-500/20 text-success-400",
    },
    pending: {
      label: "Pendiente",
      dot: "bg-warning-400",
      pill: "bg-warning-500/10 border-warning-500/20 text-warning-400",
    },
    rejected: {
      label: "Rechazado",
      dot: "bg-error-400",
      pill: "bg-error-500/10 border-error-500/20 text-error-400",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.pill}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`}
      />
      {config.label}
    </span>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-sm text-neutral-100 ${mono ? "font-mono tracking-wide" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export function RefereeProfileCard({ profile }: Props) {
  const initials = profile.fullName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-neutral-100">Mi Perfil</h1>
        <p className="text-sm text-neutral-500">
          Resumen de tu acreditación como árbitro de la federación.
        </p>
      </div>

      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900">
        {/* Decorative gradient */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, #4f46e520, transparent)",
          }}
        />

        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="shrink-0 w-16 h-16 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
            <span className="text-xl font-bold text-primary-300">
              {initials}
            </span>
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-neutral-50 truncate">
                {profile.fullName}
              </h2>
              <StatusBadge status={profile.status} />
            </div>
            <p className="text-sm text-neutral-400">{profile.email}</p>
          </div>

          {/* Registration number badge */}
          <div className="shrink-0 text-right">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
              N° Registro
            </p>
            <p className="text-lg font-mono font-bold text-primary-300">
              {profile.registrationNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Personal info */}
        <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-4 h-4 text-primary-400" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3Z" />
              </svg>
            </span>
            Información personal
          </h3>
          <div className="space-y-3">
            <InfoRow label="Nombre completo" value={profile.fullName} />
            <InfoRow label="Correo electrónico" value={profile.email} />
            <InfoRow label="País" value={profile.country} />
          </div>
        </div>

        {/* Accreditation info */}
        <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-4 h-4 text-primary-400" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 1ZM3.22 3.22a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1-1.06 1.06L3.22 4.28a.75.75 0 0 1 0-1.06Zm9.56 0a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM4.75 8a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0ZM1 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 1 8Zm12 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 13 8Zm-1.78 4.72a.75.75 0 0 1 1.06-1.06l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06Zm-6.5 0-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 1.06ZM8 13.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            Acreditación
          </h3>
          <div className="space-y-3">
            <InfoRow
              label="N° de registro"
              value={profile.registrationNumber}
              mono
            />
            <InfoRow
              label="Fecha de acreditación"
              value={formatDate(profile.approvedAt)}
            />
            <InfoRow
              label="Última actualización"
              value={formatDate(profile.updatedAt)}
            />
          </div>

          {/* Certificate download — only shown when a file was uploaded */}
          {profile.hasCertificate ? (
            <div className="pt-1 border-t border-neutral-800">
              <p className="text-xs text-neutral-500 mb-2">
                Certificado adjunto
              </p>
              <DownloadCertificateButton />
            </div>
          ) : (
            <div className="pt-1 border-t border-neutral-800 flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-neutral-600 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              <p className="text-xs text-neutral-600">
                Sin certificado adjunto
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status detail banner — only shown when approved */}
      {profile.status === "approved" && (
        <div className="rounded-xl border border-success-500/20 bg-success-500/5 p-5 flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-success-500/10 border border-success-500/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-success-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-success-400">
              Árbitro acreditado
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Tu acreditación está vigente en Kombat Taekwondo Chile. Tienes
              acceso completo al portal de árbitros.
            </p>
          </div>
        </div>
      )}

      {/* Metadata footer */}
      <p className="text-xs text-neutral-600 text-center">
        ID de registro:{" "}
        <span className="font-mono text-neutral-500">{profile.id}</span>
        {" · "}Registrado el {formatDate(profile.createdAt)}
      </p>
    </div>
  );
}
