"use client";

import { useState, useTransition } from "react";
import { enrollSelfAction } from "@/modules/event-registration/presentation/actions/enrollSelfAction";
import { CheckCircle, UserCheck, Clock, Loader2 } from "lucide-react";

interface Props {
  eventId: string;
  /** null means not registered yet */
  selfRegistrationStatus: "confirmada" | "pendiente_pago" | "cancelada" | null;
  registrationFee: number | null;
}

const STATUS_CONFIG = {
  confirmada: {
    label: "Ya estás inscrito",
    sublabel: "Tu inscripción está confirmada",
    icon: CheckCircle,
    className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  },
  pendiente_pago: {
    label: "Inscripción pendiente de pago",
    sublabel: "El administrador confirmará tu pago",
    icon: Clock,
    className: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  },
  cancelada: null, // treat as unregistered
} as const;

export function SelfEnrollSection({
  eventId,
  selfRegistrationStatus,
  registrationFee,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // After a successful enroll, show confirmation inline
  const [localStatus, setLocalStatus] = useState<
    "confirmada" | "pendiente_pago" | "cancelada" | null
  >(selfRegistrationStatus);

  const activeStatus =
    localStatus === "cancelada" || localStatus === null ? null : localStatus;

  function handleEnroll() {
    setResult(null);
    startTransition(async () => {
      const res = await enrollSelfAction({ eventId });
      if (res.success) {
        const isFree = registrationFee === null || registrationFee === 0;
        setLocalStatus(isFree ? "confirmada" : "pendiente_pago");
        setResult({
          type: "success",
          message: "¡Inscripción registrada correctamente!",
        });
      } else {
        setResult({ type: "error", message: res.error });
      }
    });
  }

  // Already enrolled — show status card
  if (activeStatus) {
    const config = STATUS_CONFIG[activeStatus];
    const Icon = config.icon;
    return (
      <div
        className={`flex items-center gap-4 p-5 rounded-xl border ${config.className}`}
      >
        <div className="w-10 h-10 rounded-full bg-current/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">{config.label}</p>
          <p className="text-xs opacity-75 mt-0.5">{config.sublabel}</p>
        </div>
      </div>
    );
  }

  // Not yet enrolled — show enroll CTA
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
          <UserCheck className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-100">
            Inscribirme como participante
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">
            Registra tu participación personal en este evento para mantener tu
            historial de formación actualizado.
          </p>
          {registrationFee !== null && registrationFee > 0 && (
            <p className="text-xs text-amber-400 mt-1.5">
              Este evento requiere pago. Tu inscripción quedará pendiente de
              confirmación por el administrador.
            </p>
          )}
        </div>
      </div>

      {result && (
        <p
          role="alert"
          className={`text-sm ${
            result.type === "success" ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {result.message}
        </p>
      )}

      <button
        type="button"
        onClick={handleEnroll}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Inscribiendo...
          </>
        ) : (
          <>
            <UserCheck className="w-4 h-4" />
            Inscribirme
          </>
        )}
      </button>
    </div>
  );
}
