import Link from "next/link";
import { REGION_LABELS } from "@/lib/presentation-constants";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
import { CreateAcademyModal } from "./CreateAcademyModal";

interface Academy {
  id: string;
  name: string;
  region: string;
  city: string;
  is_active: boolean;
}

interface Props {
  academies: Academy[];
}

export function AcademySection({ academies }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-100">
          Mis academias
        </h2>
        <CreateAcademyModal />
      </div>

      {academies.length === 0 ? (
        <p className="text-neutral-500 text-sm py-4">
          No estás vinculado a ninguna academia.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {academies.map((a) => (
            <div
              key={a.id}
              className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-100 leading-snug">
                  {a.name}
                </p>
                {a.is_active ? (
                  <span className="shrink-0 bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-xs">
                    Activa
                  </span>
                ) : (
                  <span className="shrink-0 bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
                    Inactiva
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                {a.city}
                {a.region
                  ? `, ${REGION_LABELS[a.region as ChileanRegion] ?? a.region}`
                  : ""}
              </p>
              <Link
                href={`/instructor/academies/${a.id}`}
                className="self-start text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                Administrar academia →
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
