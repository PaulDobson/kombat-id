// Server Component — no "use client"
import Link from "next/link";
import type { RefereePortalPublication } from "../../domain/entities/refereePortalPublication";
import { DeletePublicationButton } from "./DeletePublicationButton";

const CATEGORY_LABELS: Record<RefereePortalPublication["category"], string> = {
  news: "Noticias",
  regulation: "Reglamento",
  championship: "Campeonato",
};

const CATEGORY_COLORS: Record<RefereePortalPublication["category"], string> = {
  news: "bg-blue-900/40 text-blue-300 border-blue-700/40",
  regulation: "bg-amber-900/40 text-amber-300 border-amber-700/40",
  championship: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
};

interface Props {
  publication: RefereePortalPublication;
  coverImageUrl?: string | null;
  registrationCount?: number;
}

export function AdminPublicationCard({
  publication,
  coverImageUrl,
  registrationCount,
}: Props) {
  return (
    <li className="bg-neutral-900 border border-neutral-700/60 rounded-xl overflow-hidden flex items-stretch gap-0">
      {/* Thumbnail */}
      {coverImageUrl ? (
        <div className="w-24 shrink-0 bg-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-24 shrink-0 bg-neutral-800 flex items-center justify-center text-neutral-600">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 flex items-start justify-between gap-4 min-w-0">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[publication.category]}`}
            >
              {CATEGORY_LABELS[publication.category]}
            </span>
            {publication.isEvent && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-emerald-900/60 text-emerald-200 border-emerald-600/60">
                Evento · {registrationCount ?? 0} inscritos
              </span>
            )}
            <span className="text-xs text-neutral-600">
              {new Date(publication.publishedAt).toLocaleDateString("es-CL")}
            </span>
          </div>
          <p className="text-sm font-medium text-neutral-200 truncate">
            {publication.title}
          </p>
          {publication.isEvent && publication.eventDate && (
            <p className="text-xs text-neutral-500">
              📅{" "}
              {new Date(publication.eventDate + "T00:00:00").toLocaleDateString(
                "es-CL",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              )}
              {publication.eventLocation &&
                ` · 📍 ${publication.eventLocation}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {publication.isEvent && (
            <Link
              href={`/admin/referee-registrations/publications/${publication.id}/registrations`}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-neutral-700"
            >
              Inscritos
            </Link>
          )}
          <Link
            href={`/admin/referee-registrations/publications/${publication.id}/edit`}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-neutral-700"
          >
            Editar
          </Link>
          <DeletePublicationButton id={publication.id} />
        </div>
      </div>
    </li>
  );
}
