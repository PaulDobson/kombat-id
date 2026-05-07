// Server Component — no "use client"
import Link from "next/link";
import type { RefereePortalPublication } from "../../domain/entities/refereePortalPublication";

const CATEGORY_LABELS: Record<RefereePortalPublication["category"], string> = {
  news: "Noticias",
  regulation: "Reglamento",
  championship: "Campeonato",
};

const CATEGORY_BADGE_COLORS: Record<
  RefereePortalPublication["category"],
  string
> = {
  news: "bg-blue-900/40 text-blue-300 border-blue-700/40",
  regulation: "bg-amber-900/40 text-amber-300 border-amber-700/40",
  championship: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
};

/** Strip markdown syntax to produce a clean plain-text excerpt */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "") // headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/^[-*+]\s+/gm, "") // list bullets
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/\n{2,}/g, " ") // collapse blank lines
    .trim();
}

interface Props {
  publication: RefereePortalPublication;
  coverImageUrl?: string | null;
}

export function PublicationCard({ publication, coverImageUrl }: Props) {
  const isRegulation = publication.category === "regulation";
  const excerpt = stripMarkdown(publication.body).slice(0, 200);

  return (
    <Link
      href={`/referee/publications/${publication.id}`}
      className="group block rounded-xl border border-neutral-700/60 bg-neutral-800/50 overflow-hidden hover:border-neutral-600 hover:bg-neutral-800 transition-all duration-200"
    >
      {/* Cover image */}
      {!isRegulation && coverImageUrl && (
        <div className="w-full h-44 bg-neutral-800 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          {/* Regulation icon */}
          {isRegulation && (
            <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-900/30 border border-amber-700/40 flex items-center justify-center text-amber-400">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_BADGE_COLORS[publication.category]}`}
              >
                {CATEGORY_LABELS[publication.category]}
              </span>
              <span className="text-xs text-neutral-600">
                {new Date(publication.publishedAt).toLocaleDateString("es-CL", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <h2 className="text-base font-semibold text-neutral-100 leading-snug group-hover:text-white transition-colors">
              {publication.title}
            </h2>
          </div>
        </div>

        <p className="text-sm text-neutral-400 line-clamp-3 leading-relaxed">
          {excerpt}
        </p>

        <div className="flex items-center gap-1 text-xs text-neutral-500 group-hover:text-neutral-400 transition-colors">
          <span>Leer más</span>
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
    </Link>
  );
}
