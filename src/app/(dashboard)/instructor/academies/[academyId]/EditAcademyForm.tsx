"use client";

import { useState, useTransition } from "react";
import { updateInstructorAcademyAction } from "@/modules/practitioner-identity/presentation/actions/instructorAcademyActions";
import {
  Phone,
  Mail,
  ExternalLink,
  MessageCircle,
  Globe,
  FileText,
  BookOpen,
} from "lucide-react";

const inputClass =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50";

const textareaClass =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50 resize-y min-h-[80px]";

interface Props {
  academyId: string;
  name: string;
  city: string;
  address: string | null;
  foundedDate: string | null;
  description: string | null;
  founderStory: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactInstagram: string | null;
  contactWhatsapp: string | null;
  contactWebsite: string | null;
}

export function EditAcademyForm({
  academyId,
  name,
  city,
  address,
  foundedDate,
  description,
  founderStory,
  contactPhone,
  contactEmail,
  contactInstagram,
  contactWhatsapp,
  contactWebsite,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const data = new FormData(e.currentTarget);

    const trim = (key: string) => (data.get(key) as string)?.trim() || null;

    startTransition(async () => {
      const result = await updateInstructorAcademyAction({
        academyId,
        name: data.get("name") as string,
        city: data.get("city") as string,
        address: trim("address"),
        foundedDate: trim("foundedDate"),
        description: trim("description"),
        founderStory: trim("founderStory"),
        contactPhone: trim("contactPhone"),
        contactEmail: trim("contactEmail"),
        contactInstagram: trim("contactInstagram"),
        contactWhatsapp: trim("contactWhatsapp"),
        contactWebsite: trim("contactWebsite"),
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Datos básicos ────────────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          Datos básicos
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nombre */}
          <div className="sm:col-span-2 space-y-1">
            <label
              htmlFor="acad-name"
              className="block text-sm font-medium text-neutral-300"
            >
              Nombre oficial
            </label>
            <input
              id="acad-name"
              name="name"
              type="text"
              required
              defaultValue={name}
              disabled={isPending}
              className={inputClass}
            />
          </div>

          {/* Ciudad */}
          <div className="space-y-1">
            <label
              htmlFor="acad-city"
              className="block text-sm font-medium text-neutral-300"
            >
              Ciudad / Comuna
            </label>
            <input
              id="acad-city"
              name="city"
              type="text"
              required
              defaultValue={city}
              disabled={isPending}
              className={inputClass}
            />
          </div>

          {/* Fecha de fundación */}
          <div className="space-y-1">
            <label
              htmlFor="acad-founded"
              className="block text-sm font-medium text-neutral-300"
            >
              Fecha de fundación{" "}
              <span className="text-neutral-500 font-normal">(opcional)</span>
            </label>
            <input
              id="acad-founded"
              name="foundedDate"
              type="date"
              defaultValue={foundedDate ?? ""}
              disabled={isPending}
              className={inputClass}
            />
          </div>

          {/* Dirección */}
          <div className="sm:col-span-2 space-y-1">
            <label
              htmlFor="acad-address"
              className="block text-sm font-medium text-neutral-300"
            >
              Dirección{" "}
              <span className="text-neutral-500 font-normal">(opcional)</span>
            </label>
            <input
              id="acad-address"
              name="address"
              type="text"
              defaultValue={address ?? ""}
              disabled={isPending}
              className={inputClass}
              placeholder="Av. Ejemplo 123"
            />
          </div>
        </div>
      </fieldset>

      {/* ── Perfil público ───────────────────────────────────────── */}
      <fieldset className="space-y-4 border-t border-neutral-800 pt-5">
        <legend className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5" />
          Perfil público{" "}
          <span className="text-neutral-600 font-normal normal-case tracking-normal">
            — aparece en el directorio de academias
          </span>
        </legend>

        {/* Descripción */}
        <div className="space-y-1">
          <label
            htmlFor="acad-description"
            className="block text-sm font-medium text-neutral-300"
          >
            Descripción{" "}
            <span className="text-neutral-500 font-normal">(opcional)</span>
          </label>
          <textarea
            id="acad-description"
            name="description"
            defaultValue={description ?? ""}
            disabled={isPending}
            className={textareaClass}
            placeholder="Describe tu academia: metodología, valores, qué ofrecen…"
            maxLength={2000}
          />
          <p className="text-xs text-neutral-600">Máximo 2000 caracteres.</p>
        </div>

        {/* Historia del fundador */}
        <div className="space-y-1">
          <label
            htmlFor="acad-founder"
            className="block text-sm font-medium text-neutral-300"
          >
            Historia del fundador{" "}
            <span className="text-neutral-500 font-normal">(opcional)</span>
          </label>
          <textarea
            id="acad-founder"
            name="founderStory"
            defaultValue={founderStory ?? ""}
            disabled={isPending}
            className={textareaClass}
            placeholder="Cuéntanos la historia del fundador de la academia…"
            maxLength={3000}
          />
          <p className="text-xs text-neutral-600">Máximo 3000 caracteres.</p>
        </div>
      </fieldset>

      {/* ── Contacto ─────────────────────────────────────────────── */}
      <fieldset className="space-y-4 border-t border-neutral-800 pt-5">
        <legend className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
          <Phone className="w-3.5 h-3.5" />
          Información de contacto{" "}
          <span className="text-neutral-600 font-normal normal-case tracking-normal">
            — todos opcionales
          </span>
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Teléfono */}
          <div className="space-y-1">
            <label
              htmlFor="acad-phone"
              className="flex items-center gap-1.5 text-sm font-medium text-neutral-300"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              Teléfono
            </label>
            <input
              id="acad-phone"
              name="contactPhone"
              type="tel"
              defaultValue={contactPhone ?? ""}
              disabled={isPending}
              className={inputClass}
              placeholder="+56 9 1234 5678"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label
              htmlFor="acad-email"
              className="flex items-center gap-1.5 text-sm font-medium text-neutral-300"
            >
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              Email de contacto
            </label>
            <input
              id="acad-email"
              name="contactEmail"
              type="email"
              defaultValue={contactEmail ?? ""}
              disabled={isPending}
              className={inputClass}
              placeholder="academia@ejemplo.cl"
            />
          </div>

          {/* WhatsApp */}
          <div className="space-y-1">
            <label
              htmlFor="acad-whatsapp"
              className="flex items-center gap-1.5 text-sm font-medium text-neutral-300"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              WhatsApp
            </label>
            <input
              id="acad-whatsapp"
              name="contactWhatsapp"
              type="tel"
              defaultValue={contactWhatsapp ?? ""}
              disabled={isPending}
              className={inputClass}
              placeholder="+56 9 1234 5678"
            />
          </div>

          {/* Instagram */}
          <div className="space-y-1">
            <label
              htmlFor="acad-instagram"
              className="flex items-center gap-1.5 text-sm font-medium text-neutral-300"
            >
              <ExternalLink className="w-3.5 h-3.5 text-pink-400" />
              Instagram
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm select-none pointer-events-none">
                @
              </span>
              <input
                id="acad-instagram"
                name="contactInstagram"
                type="text"
                defaultValue={(contactInstagram ?? "").replace(/^@/, "")}
                disabled={isPending}
                className={`${inputClass} pl-7`}
                placeholder="miacademia.tkd"
              />
            </div>
          </div>

          {/* Sitio web */}
          <div className="sm:col-span-2 space-y-1">
            <label
              htmlFor="acad-website"
              className="flex items-center gap-1.5 text-sm font-medium text-neutral-300"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              Sitio web
            </label>
            <input
              id="acad-website"
              name="contactWebsite"
              type="url"
              defaultValue={contactWebsite ?? ""}
              disabled={isPending}
              className={inputClass}
              placeholder="https://miacademia.cl"
            />
          </div>
        </div>
      </fieldset>

      {/* ── Feedback & submit ────────────────────────────────────── */}
      {error && (
        <p
          role="alert"
          className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          ✓ Academia actualizada correctamente
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
