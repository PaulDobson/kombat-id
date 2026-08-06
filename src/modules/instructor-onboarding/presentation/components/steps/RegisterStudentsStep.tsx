"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, UserPlus } from "lucide-react";
import { registerStudentAction } from "../../actions/onboardingActions";
import type { SessionStudent } from "../types";

const RegisterStudentSchema = z.object({
  fullName: z
    .string()
    .min(1, "Nombre requerido")
    .max(120, "Máximo 120 caracteres"),
  email: z.string().email("Email inválido"),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido")
    .refine((d) => new Date(d) < new Date(), {
      message: "La fecha debe ser pasada",
    }),
  belt: z.enum(["white", "yellow", "green", "blue", "red", "black"]).optional(),
});

type RegisterStudentFormData = z.infer<typeof RegisterStudentSchema>;

const BELT_OPTIONS = [
  { value: "white", label: "Blanco" },
  { value: "yellow", label: "Amarillo" },
  { value: "green", label: "Verde" },
  { value: "blue", label: "Azul" },
  { value: "red", label: "Rojo" },
  { value: "black", label: "Negro" },
] as const;

interface RegisterStudentsStepProps {
  academyId: string;
  onComplete: (students: SessionStudent[]) => void;
}

export function RegisterStudentsStep({
  academyId,
  onComplete,
}: RegisterStudentsStepProps) {
  const [registeredStudents, setRegisteredStudents] = useState<
    SessionStudent[]
  >([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterStudentFormData>({
    resolver: zodResolver(RegisterStudentSchema),
  });

  function handleRegisterStudent(formData: RegisterStudentFormData) {
    setActionError(null);
    startTransition(async () => {
      const result = await registerStudentAction({ ...formData, academyId });
      if (result.success) {
        setRegisteredStudents((prev) => [...prev, result.data]);
        reset();
      } else {
        setActionError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-neutral-50 mb-1">
          Registrar alumnos
        </h3>
        <p className="text-sm text-neutral-400">
          Agrega tus alumnos uno a uno. Puedes agregar varios antes de
          continuar.
        </p>
      </div>

      {/* Registered students list */}
      {registeredStudents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
            Alumnos registrados ({registeredStudents.length})
          </p>
          {registeredStudents.map((student) => (
            <div
              key={student.practitionerId}
              className="flex items-center gap-3 px-4 py-2.5 bg-emerald-400/5 border border-emerald-400/20 rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-neutral-200">
                  {student.fullName}
                </p>
                <p className="text-xs text-neutral-500">{student.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Registration form */}
      <form
        onSubmit={handleSubmit(handleRegisterStudent)}
        className="space-y-4 bg-neutral-800/50 border border-neutral-700 rounded-xl p-4"
      >
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Nuevo alumno
        </p>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">
            Nombre completo <span className="text-red-400">*</span>
          </label>
          <input
            {...register("fullName")}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Ej: Juan Pérez González"
          />
          {errors.fullName && (
            <p className="text-xs text-red-400 mt-1">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            {...register("email")}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="alumno@ejemplo.cl"
          />
          {errors.email && (
            <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">
            Fecha de nacimiento <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            {...register("birthDate")}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.birthDate && (
            <p className="text-xs text-red-400 mt-1">
              {errors.birthDate.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">
            Cinturón{" "}
            <span className="text-neutral-500 text-xs">(opcional)</span>
          </label>
          <select
            {...register("belt")}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Sin especificar</option>
            {BELT_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        {actionError && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
            {actionError}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-neutral-200 font-semibold rounded-xl py-2.5 text-sm transition-colors"
        >
          {isPending ? "Registrando..." : "+ Agregar alumno"}
        </button>
      </form>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onComplete([])}
          className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-semibold rounded-xl py-2.5 text-sm transition-colors"
        >
          Omitir
        </button>
        <button
          type="button"
          disabled={registeredStudents.length === 0 || isPending}
          onClick={() => onComplete(registeredStudents)}
          className="flex-1 bg-primary-500 hover:bg-primary-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-900 font-semibold rounded-xl py-2.5 text-sm transition-colors"
        >
          Continuar ({registeredStudents.length})
        </button>
      </div>
    </div>
  );
}
