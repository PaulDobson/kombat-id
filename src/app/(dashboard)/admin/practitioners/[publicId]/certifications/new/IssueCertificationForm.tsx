"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueCertificationAction } from "@/modules/practitioner-identity/presentation/actions/adminActions";

interface Props {
  practitionerId: string;
  issuedBy: string;
}

export function IssueCertificationForm({ practitionerId, issuedBy }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const input = {
      practitionerId,
      issuedBy,
      certType: formData.get("certType") as string,
      notes: (formData.get("notes") as string) || null,
    };

    startTransition(async () => {
      const result = await issueCertificationAction(input);
      if (result.success) {
        router.push(`/admin/practitioners/${practitionerId}`);
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label
          htmlFor="certType"
          className="block text-xs font-medium text-neutral-400 uppercase tracking-wider"
        >
          Tipo de certificación <span className="text-rose-400">*</span>
        </label>
        <select
          id="certType"
          name="certType"
          required
          disabled={isPending}
          className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
        >
          <option value="">Seleccionar...</option>
          <option value="technical_grade">Grado técnico</option>
          <option value="instructor">Instructor</option>
          <option value="referee">Árbitro</option>
          <option value="coach">Entrenador</option>
          <option value="event_participation">Participación en evento</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="notes"
          className="block text-xs font-medium text-neutral-400 uppercase tracking-wider"
        >
          Notas{" "}
          <span className="text-neutral-600 normal-case tracking-normal font-normal">
            (opcional)
          </span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          disabled={isPending}
          placeholder="Observaciones adicionales sobre esta certificación..."
          className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-50"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Emitiendo..." : "Emitir certificación"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => router.back()}
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
