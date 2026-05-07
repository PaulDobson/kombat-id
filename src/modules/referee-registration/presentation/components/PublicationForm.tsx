"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import {
  createPortalPublicationAction,
  updatePortalPublicationAction,
} from "../actions/adminRefereeActions";
import type { RefereePortalPublication } from "../../domain/entities/refereePortalPublication";
import { ImageUploadField } from "./ImageUploadField";
import { MarkdownEditor } from "./MarkdownEditor";

const PublicationSchema = z.object({
  title: z
    .string()
    .min(1, "El título es obligatorio")
    .max(300, "El título no puede superar los 300 caracteres"),
  body: z.string().min(1, "El contenido es obligatorio"),
  category: z.enum(["news", "regulation", "championship"], {
    error: "Selecciona una categoría válida",
  }),
});

type FormErrors = Partial<Record<string, string>>;

const CATEGORY_OPTIONS = [
  { value: "news", label: "Noticias" },
  { value: "regulation", label: "Reglamento" },
  { value: "championship", label: "Campeonato" },
] as const;

const inputClass =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50";

interface Props {
  publication?: RefereePortalPublication;
  coverImageUrl?: string | null;
}

export function PublicationForm({ publication, coverImageUrl }: Props) {
  const isEdit = !!publication;
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    publication?.category ?? "",
  );
  const [isEventChecked, setIsEventChecked] = useState<boolean>(
    publication?.isEvent ?? false,
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const rawPayload = {
      title: formData.get("title") as string,
      body: formData.get("body") as string,
      category: formData.get("category") as string,
    };

    const parsed = PublicationSchema.safeParse(rawPayload);
    if (!parsed.success) {
      const errors: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      const result = isEdit
        ? await updatePortalPublicationAction(formData)
        : await createPortalPublicationAction(formData);

      if (result.success) {
        setSuccessMessage(
          isEdit
            ? "Publicación actualizada correctamente."
            : "Publicación creada correctamente.",
        );
        if (!isEdit) {
          form.reset();
          setSelectedCategory("");
          setIsEventChecked(false);
        }
      } else {
        setGlobalError(result.error);
      }
    });
  }

  const showEventFields = selectedCategory === "championship";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Hidden id for edit mode */}
      {isEdit && <input type="hidden" name="id" value={publication.id} />}

      {/* Título */}
      <div className="space-y-1">
        <label
          htmlFor="title"
          className="block text-sm font-medium text-neutral-300"
        >
          Título
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={300}
          defaultValue={publication?.title}
          disabled={isPending}
          className={inputClass}
          placeholder="Título de la publicación"
        />
        {fieldErrors.title && (
          <p className="text-xs text-red-400">{fieldErrors.title}</p>
        )}
      </div>

      {/* Categoría */}
      <div className="space-y-1">
        <label
          htmlFor="category"
          className="block text-sm font-medium text-neutral-300"
        >
          Categoría
        </label>
        <select
          id="category"
          name="category"
          required
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            if (e.target.value !== "championship") setIsEventChecked(false);
          }}
          disabled={isPending}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
        >
          <option value="" disabled>
            Seleccionar categoría...
          </option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {fieldErrors.category && (
          <p className="text-xs text-red-400">{fieldErrors.category}</p>
        )}
      </div>

      {/* Imagen de portada */}
      <ImageUploadField
        name="coverImage"
        defaultImageUrl={coverImageUrl}
        disabled={isPending}
      />

      {/* Contenido */}
      <div className="space-y-1">
        <label
          htmlFor="body"
          className="block text-sm font-medium text-neutral-300"
        >
          Contenido
        </label>
        <MarkdownEditor
          name="body"
          defaultValue={publication?.body ?? ""}
          disabled={isPending}
          error={fieldErrors.body}
        />
      </div>

      {/* Evento (solo para championship) */}
      {showEventFields && (
        <div className="space-y-4 rounded-xl border border-emerald-700/40 bg-emerald-900/10 p-4">
          <div className="flex items-center gap-3">
            <input
              id="isEvent"
              name="isEvent"
              type="checkbox"
              value="true"
              checked={isEventChecked}
              onChange={(e) => setIsEventChecked(e.target.checked)}
              disabled={isPending}
              className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-emerald-500 focus:ring-emerald-500"
            />
            <label
              htmlFor="isEvent"
              className="text-sm font-medium text-emerald-300"
            >
              Esta publicación es un evento con inscripción
            </label>
          </div>

          {isEventChecked && (
            <div className="space-y-4 pt-2">
              {/* Fecha del evento */}
              <div className="space-y-1">
                <label
                  htmlFor="eventDate"
                  className="block text-sm font-medium text-neutral-300"
                >
                  Fecha del evento
                </label>
                <input
                  id="eventDate"
                  name="eventDate"
                  type="date"
                  defaultValue={publication?.eventDate ?? ""}
                  disabled={isPending}
                  className={inputClass}
                />
              </div>

              {/* Lugar */}
              <div className="space-y-1">
                <label
                  htmlFor="eventLocation"
                  className="block text-sm font-medium text-neutral-300"
                >
                  Lugar
                </label>
                <input
                  id="eventLocation"
                  name="eventLocation"
                  type="text"
                  maxLength={500}
                  defaultValue={publication?.eventLocation ?? ""}
                  disabled={isPending}
                  className={inputClass}
                  placeholder="Ej: Gimnasio Nacional, Santiago"
                />
              </div>

              {/* Cupo máximo */}
              <div className="space-y-1">
                <label
                  htmlFor="maxParticipants"
                  className="block text-sm font-medium text-neutral-300"
                >
                  Cupo máximo{" "}
                  <span className="text-neutral-500">(opcional)</span>
                </label>
                <input
                  id="maxParticipants"
                  name="maxParticipants"
                  type="number"
                  min={1}
                  defaultValue={publication?.maxParticipants ?? ""}
                  disabled={isPending}
                  className={inputClass}
                  placeholder="Sin límite si se deja vacío"
                />
              </div>

              {/* Plazo de inscripción */}
              <div className="space-y-1">
                <label
                  htmlFor="registrationDeadline"
                  className="block text-sm font-medium text-neutral-300"
                >
                  Plazo de inscripción
                </label>
                <input
                  id="registrationDeadline"
                  name="registrationDeadline"
                  type="date"
                  defaultValue={publication?.registrationDeadline ?? ""}
                  disabled={isPending}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {globalError && (
        <p
          role="alert"
          className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
        >
          {globalError}
        </p>
      )}

      {successMessage && (
        <p className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-700/40 rounded-lg px-3 py-2">
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending
          ? isEdit
            ? "Guardando..."
            : "Publicando..."
          : isEdit
            ? "Guardar cambios"
            : "Publicar"}
      </button>
    </form>
  );
}
