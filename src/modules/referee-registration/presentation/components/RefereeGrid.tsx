// Server Component — no "use client", no React hooks
// Validates: Requisitos 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.2

import type { RefereeListItem } from "./refereeListItem";
import { RefereeCard } from "./RefereeCard";

interface RefereeGridProps {
  referees: RefereeListItem[];
  searchQuery?: string;
}

export function RefereeGrid({ referees, searchQuery }: RefereeGridProps) {
  // Requisitos 4.4, 4.5 — filter by fullName when searchQuery is a non-empty string
  const filtered =
    searchQuery != null && searchQuery !== ""
      ? referees.filter((r) =>
          r.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : referees;

  // Requisitos 4.3, 4.6 — empty state when filtered array is empty
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/50 px-6 py-16 text-center">
        <div
          aria-hidden="true"
          className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center mb-4"
        >
          <svg
            className="w-6 h-6 text-neutral-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
        </div>
        <p className="text-base font-semibold text-neutral-200">
          No hay árbitros registrados
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Aún no se han aprobado registros de árbitros.
        </p>
      </div>
    );
  }

  // Requisitos 4.1, 4.2 — responsive grid with one RefereeCard per item
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((referee) => (
        <li key={referee.id}>
          <RefereeCard referee={referee} />
        </li>
      ))}
    </ul>
  );
}
