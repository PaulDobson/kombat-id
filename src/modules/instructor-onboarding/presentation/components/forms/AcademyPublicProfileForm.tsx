"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const e164OrChile = z
  .string()
  .regex(/^(\+?[1-9]\d{1,14}|(\+56|56)?[\s.-]?(9\d{8}|\d{9}))$/)
  .optional()
  .or(z.literal(""));

export const AcademyPublicProfileSchema = z.object({
  description: z.string().max(1000, "Máximo 1000 caracteres").optional(),
  founderStory: z.string().max(2000, "Máximo 2000 caracteres").optional(),
  contactPhone: e164OrChile,
  contactEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  contactInstagram: z.string().max(100, "Máximo 100 caracteres").optional(),
  contactWhatsapp: e164OrChile,
  contactWebsite: z.string().url("URL inválida").optional().or(z.literal("")),
  coverImagePath: z.string().optional(),
});

export type AcademyPublicProfile = z.infer<typeof AcademyPublicProfileSchema>;

interface AcademyPublicProfileFormProps {
  onSubmit: (data: AcademyPublicProfile) => void;
  isSubmitting: boolean;
  onBack: () => void;
}

export function AcademyPublicProfileForm({
  onSubmit,
  isSubmitting,
  onBack,
}: AcademyPublicProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcademyPublicProfile>({
    resolver: zodResolver(AcademyPublicProfileSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Descripción{" "}
          <span className="text-neutral-500 text-xs">(opcional)</span>
        </label>
        <textarea
          {...register("description")}
          rows={3}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          placeholder="Describe tu academia..."
        />
        {errors.description && (
          <p className="text-xs text-red-400 mt-1">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Founder Story */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Historia del fundador{" "}
          <span className="text-neutral-500 text-xs">(opcional)</span>
        </label>
        <textarea
          {...register("founderStory")}
          rows={3}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          placeholder="Comparte la historia detrás de tu academia..."
        />
        {errors.founderStory && (
          <p className="text-xs text-red-400 mt-1">
            {errors.founderStory.message}
          </p>
        )}
      </div>

      {/* Contact Email */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Email de contacto{" "}
          <span className="text-neutral-500 text-xs">(opcional)</span>
        </label>
        <input
          type="email"
          {...register("contactEmail")}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="academia@ejemplo.cl"
        />
        {errors.contactEmail && (
          <p className="text-xs text-red-400 mt-1">
            {errors.contactEmail.message}
          </p>
        )}
      </div>

      {/* Contact Phone */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Teléfono <span className="text-neutral-500 text-xs">(opcional)</span>
        </label>
        <input
          {...register("contactPhone")}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="+56912345678"
        />
        {errors.contactPhone && (
          <p className="text-xs text-red-400 mt-1">
            {errors.contactPhone.message}
          </p>
        )}
      </div>

      {/* Instagram */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Instagram <span className="text-neutral-500 text-xs">(opcional)</span>
        </label>
        <input
          {...register("contactInstagram")}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="@kombat_academia"
        />
        {errors.contactInstagram && (
          <p className="text-xs text-red-400 mt-1">
            {errors.contactInstagram.message}
          </p>
        )}
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Sitio web <span className="text-neutral-500 text-xs">(opcional)</span>
        </label>
        <input
          {...register("contactWebsite")}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="https://www.miacademia.cl"
        />
        {errors.contactWebsite && (
          <p className="text-xs text-red-400 mt-1">
            {errors.contactWebsite.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 font-semibold rounded-xl py-2.5 text-sm transition-colors"
        >
          ← Atrás
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary-500 hover:bg-primary-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-900 font-semibold rounded-xl py-2.5 text-sm transition-colors"
        >
          {isSubmitting ? "Creando..." : "Crear academia"}
        </button>
      </div>
    </form>
  );
}
