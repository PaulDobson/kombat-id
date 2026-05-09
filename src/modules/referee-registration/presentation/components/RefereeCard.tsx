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
    <article className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition-all duration-200 hover:border-primary-500/50 hover:bg-neutral-800/60">
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
            <span aria-hidden="true">🌎</span>
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
        <span aria-hidden="true">📅</span>
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
