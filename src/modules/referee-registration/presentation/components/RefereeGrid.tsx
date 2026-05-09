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
        <span aria-hidden="true" className="text-4xl">
          🏅
        </span>
        <p className="mt-4 text-base font-semibold text-neutral-200">
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
