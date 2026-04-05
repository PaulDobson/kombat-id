"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import * as Label from "@radix-ui/react-label";
import {
  createEventAction,
  updateEventAction,
  type MartialEvent,
} from "@/modules/practitioner-identity/presentation/actions/eventActions";

const EVENT_TYPE_OPTIONS = [
  { value: "competition", label: "Competencia" },
  { value: "seminar", label: "Seminario" },
  { value: "exam", label: "Examen" },
] as const;

interface Props {
  /** When provided, the form operates in edit mode */
  event?: MartialEvent;
}

export function EventForm({ event }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!event;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      name: data.get("name") as string,
      event_type: data.get("event_type") as string,
      event_date: data.get("event_date") as string,
      location: (data.get("location") as string) || undefined,
      ...(isEdit ? { id: event.id } : {}),
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateEventAction(payload)
        : await createEventAction(payload);

      if (result.success) {
        router.push(isEdit ? `/admin/events/${event.id}` : "/admin/events");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {/* Nombre */}
      <div className="space-y-1">
        <Label.Root
          htmlFor="name"
          className="block text-sm font-medium text-neutral-300"
        >
          Nombre del evento
        </Label.Root>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={event?.name}
          disabled={isPending}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50"
          placeholder="Campeonato Nacional 2025"
        />
      </div>

      {/* Tipo */}
      <div className="space-y-1">
        <Label.Root
          htmlFor="event_type"
          className="block text-sm font-medium text-neutral-300"
        >
          Tipo de evento
        </Label.Root>
        <select
          id="event_type"
          name="event_type"
          required
          defaultValue={event?.event_type ?? ""}
          disabled={isPending}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
        >
          <option value="" disabled>
            Seleccionar tipo...
          </option>
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Fecha */}
      <div className="space-y-1">
        <Label.Root
          htmlFor="event_date"
          className="block text-sm font-medium text-neutral-300"
        >
          Fecha
        </Label.Root>
        <input
          id="event_date"
          name="event_date"
          type="date"
          required
          defaultValue={event?.event_date}
          disabled={isPending}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
        />
      </div>

      {/* Lugar */}
      <div className="space-y-1">
        <Label.Root
          htmlFor="location"
          className="block text-sm font-medium text-neutral-300"
        >
          Lugar <span className="text-neutral-500 font-normal">(opcional)</span>
        </Label.Root>
        <input
          id="location"
          name="location"
          type="text"
          defaultValue={event?.location ?? ""}
          disabled={isPending}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50"
          placeholder="Gimnasio Municipal, Santiago"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-xs text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending
            ? isEdit
              ? "Guardando..."
              : "Creando..."
            : isEdit
              ? "Guardar cambios"
              : "Crear evento"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
