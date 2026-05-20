// Server Component — no "use client", no React hooks
// Validates: Requisitos 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 8.3

import { formatDateLong } from "@/lib/format-date";
import type { RefereeListItem } from "./refereeListItem";

interface RefereeCardProps {
  referee: RefereeListItem;
}

/**
 * Derives the two-letter initials from a full name.
 * Takes the first letter of the first word and the first letter of the second
 * word (if present), both uppercased.
 *
 * Examples:
 *   "Juan Pérez González" → "JP"
 *   "María"               → "M"
 */
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0]?.toUpperCase() ?? "";
  const second = parts[1]?.[0]?.toUpperCase() ?? "";
  return first + second;
}

export function RefereeCard({ referee }: RefereeCardProps) {
  const initials = getInitials(referee.fullName);

  // Guard: only call formatDateLong when approvedAt is a non-empty string.
  // Requirement 5.4 — valid ISO timestamp → format it.
  // Requirement 5.5 — null / undefined → show em dash fallback.
  const affiliationText =
    referee.approvedAt != null && referee.approvedAt !== ""
      ? `Afiliado el ${formatDateLong(referee.approvedAt)}`
      : "Afiliado el —";

  return (
    <article className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition-all duration-200 hover:border-primary-500/50 hover:bg-neutral-800/60 hover:-translate-y-0.5">
      {/* Header: avatar + name + country */}
      <div className="flex items-start gap-4">
        {/* Avatar with gradient background — Requirement 5.6 */}
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary-600 to-primary-800"
        >
          <span className="text-sm font-bold text-white">{initials}</span>
        </div>

        {/* Name + country */}
        <div className="min-w-0 flex-1">
          {/* Requirement 5.1 */}
          <p className="truncate font-semibold text-lg text-neutral-50">
            {referee.fullName}
          </p>

          {/* Requirement 5.2 */}
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-400">
            <svg
              aria-hidden="true"
              className="w-3.5 h-3.5 text-neutral-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
              />
            </svg>
            <span>{referee.country}</span>
          </p>
        </div>
      </div>

      {/* Registration number — Requirement 5.3 */}
      <p className="mt-4 font-mono text-xs text-neutral-300">
        {referee.registrationNumber}
      </p>

      {/* Affiliation date — Requirements 5.4, 5.5 */}
      <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
        <svg
          aria-hidden="true"
          className="w-3.5 h-3.5 text-neutral-500 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
        <span>{affiliationText}</span>
      </p>

      {/* Badge — Requirement 5.7 */}
      <div className="mt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-800 bg-primary-900/50 px-2.5 py-1 text-xs font-medium text-primary-400">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-primary-400"
          />
          Árbitro Oficial
        </span>
      </div>
    </article>
  );
}
