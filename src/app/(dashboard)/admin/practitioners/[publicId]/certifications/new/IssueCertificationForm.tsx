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
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="certType">Tipo de certificación</label>
        <select id="certType" name="certType" required>
          <option value="">Seleccionar...</option>
          <option value="technical_grade">Grado técnico</option>
          <option value="instructor">Instructor</option>
          <option value="referee">Árbitro</option>
          <option value="coach">Entrenador</option>
          <option value="event_participation">Participación en evento</option>
        </select>
      </div>

      <div>
        <label htmlFor="notes">Notas (opcional)</label>
        <textarea id="notes" name="notes" rows={3} />
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? "Emitiendo..." : "Emitir certificación"}
      </button>
    </form>
  );
}
