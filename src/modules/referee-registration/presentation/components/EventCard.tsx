// Server Component — no "use client"
import Link from "next/link";
import type { RefereePortalPublication } from "../../domain/entities/refereePortalPublication";

interface Props {
  publication: RefereePortalPublication;
  coverImageUrl?: string | null;
  isRegistered: boolean;
  registrationCount: number;
}

export function EventCard({
  publication,
  coverImageUrl,
  isRegistered,
  registrationCount,
}: Props) {
  const now = new Date();

  const isDeadlinePassed = publication.registrationDeadline
    ? new Date(publication.registrationDeadline + "T23:59:59") < now
    : false;

  const isFull =
    publication.maxParticipants !== null
      ? registrationCount >= publication.maxParticipants
      : false;

  const spotsLeft =
    publication.maxParticipants !== null
      ? Math.max(0, publication.maxParticipants - registrationCount)
      : null;

  // Status pill
  let statusLabel: string;
  let statusClass: string;
  if (isRegistered) {
    statusLabel = "✓ Inscrito";
    statusClass = "bg-emerald-900/60 text-emerald-300 border-emerald-600/60";
  } else if (isFull) {
    statusLabel = "Cupo lleno";
    statusClass = "bg-red-900/40 text-red-400 border-red-700/40";
  } else if (isDeadlinePassed) {
    statusLabel = "Cerrado";
    statusClass = "bg-neutral-800 text-neutral-500 border-neutral-700";
  } else {
    statusLabel = spotsLeft !== null ? `${spotsLeft} cupos` : "Abierto";
    statusClass = "bg-emerald-900/40 text-emerald-400 border-emerald-700/40";
  }

  return (
    <Link
      href={`/referee/publications/${publication.id}`}
      className="group block rounded-xl border border-emerald-700/40 bg-neutral-800/50 overflow-hidden hover:border-emerald-600/60 hover:bg-neutral-800 transition-all duration-200"
    >
      {/* Cover image with overlay */}
      {coverImageUrl ? (
        <div className="relative w-full h-44 bg-neutral-800 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-neutral-900/80 via-transparent to-transparent" />
          {/* Event badge on image */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-900/80 backdrop-blur-sm border border-emerald-600/60 rounded-full px-2.5 py-1">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              🏆 Evento
            </span>
          </div>
          {/* Status pill on image */}
          <div
            className={`absolute top-3 right-3 text-xs font-medium px-2.5 py-1 rounded-full border backdrop-blur-sm ${statusClass}`}
          >
            {statusLabel}
          </div>
        </div>
      ) : (
        /* No image — colored header band */
        <div className="relative bg-linear-to-r from-emerald-900/60 to-emerald-800/30 border-b border-emerald-700/40 px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
            🏆 Evento
          </span>
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusClass}`}
          >
            {statusLabel}
          </span>
        </div>
      )}

      <div className="p-5 space-y-3">
        <h2 className="text-base font-semibold text-neutral-100 leading-snug group-hover:text-white transition-colors">
          {publication.title}
        </h2>

        {/* Key event details — compact */}
        <div className="space-y-1.5">
          {publication.eventDate && (
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <span className="text-neutral-500 shrink-0">📅</span>
              <span>
                {new Date(
                  publication.eventDate + "T00:00:00",
                ).toLocaleDateString("es-CL", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
          {publication.eventLocation && (
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <span className="text-neutral-500 shrink-0">📍</span>
              <span className="truncate">{publication.eventLocation}</span>
            </div>
          )}
          {publication.registrationDeadline && !isDeadlinePassed && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="shrink-0">⏰</span>
              <span>
                Inscripciones hasta el{" "}
                {new Date(
                  publication.registrationDeadline + "T00:00:00",
                ).toLocaleDateString("es-CL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-neutral-500">
            {registrationCount} inscrito{registrationCount !== 1 ? "s" : ""}
            {publication.maxParticipants
              ? ` / ${publication.maxParticipants}`
              : ""}
          </span>
          <div className="flex items-center gap-1 text-xs text-emerald-500 group-hover:text-emerald-400 transition-colors font-medium">
            <span>Ver detalle</span>
            <svg
              className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
