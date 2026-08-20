import Link from "next/link";
import {
  Building2,
  MapPin,
  ChevronRight,
  Users,
  AlertTriangle,
} from "lucide-react";
import { REGION_LABELS } from "@/lib/presentation-constants";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
import { CreateAcademyModal } from "./CreateAcademyModal";

interface Academy {
  id: string;
  name: string;
  region: string;
  city: string;
  is_active: boolean;
  studentCount?: number;
  pendingCount?: number;
}

interface Props {
  academies: Academy[];
}

export function AcademySection({ academies }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className="text-base font-semibold text-neutral-100">
            Mis academias
          </h2>
        </div>
        <CreateAcademyModal />
      </div>

      {academies.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl flex flex-col items-center justify-center gap-4 py-12">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-neutral-600" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-neutral-300 text-sm font-medium">
              Aún no tienes academias registradas
            </p>
            <p className="text-neutral-500 text-xs">
              Crea tu primera academia para empezar a gestionar alumnos
            </p>
          </div>
          <CreateAcademyModal />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {academies.map((a) => {
            const hasPending = (a.pendingCount ?? 0) > 0;
            return (
              <Link
                key={a.id}
                href={`/instructor/academies/${a.id}`}
                className={`
                  bg-neutral-900 border rounded-2xl p-5 flex flex-col gap-4 group transition-colors
                  ${
                    hasPending
                      ? "border-amber-500/30 hover:border-amber-500/50"
                      : "border-neutral-700 hover:border-blue-500/40"
                  }
                `}
              >
                {/* Top row: icon + status badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-400/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasPending && (
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-xs font-medium">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {a.pendingCount} pendiente
                        {(a.pendingCount ?? 0) !== 1 ? "s" : ""}
                      </span>
                    )}
                    {a.is_active ? (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-neutral-800 text-neutral-400 border border-neutral-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                        Inactiva
                      </span>
                    )}
                  </div>
                </div>

                {/* Academy name + location */}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-100 leading-snug group-hover:text-white transition-colors">
                    {a.name}
                  </p>
                  {(a.city || a.region) && (
                    <p className="flex items-center gap-1 text-xs text-neutral-500 mt-1.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {a.city}
                      {a.region
                        ? `, ${REGION_LABELS[a.region as ChileanRegion] ?? a.region}`
                        : ""}
                    </p>
                  )}
                  {a.studentCount !== undefined && (
                    <p className="flex items-center gap-1 text-xs text-neutral-500 mt-1">
                      <Users className="w-3 h-3 shrink-0" />
                      {a.studentCount} alumno{a.studentCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* CTA row */}
                <div className="flex items-center justify-between">
                  <span
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      hasPending
                        ? "text-amber-400 group-hover:text-amber-300"
                        : "text-primary-400 group-hover:text-primary-300"
                    }`}
                  >
                    {hasPending ? "Ver pendientes" : "Administrar academia"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
