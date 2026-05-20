"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerPractitionerAction } from "@/modules/practitioner-identity/presentation/actions/practitionerActions";
import { ROLE_LABELS } from "@/lib/roles";

const inputClass =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";
const labelClass = "block text-sm font-medium text-neutral-300 mb-1";
const selectClass =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

interface InstructorOption {
  id: string;
  fullName: string;
  role: string;
}

export function RegisterForm({
  instructors,
}: {
  instructors: InstructorOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const weightRaw = fd.get("weightKg");
    const heightRaw = fd.get("heightCm");
    const instructorRaw = fd.get("instructorId");

    const input = {
      fullName: fd.get("fullName") as string,
      rut: fd.get("rut") as string,
      birthDate: fd.get("birthDate") as string,
      gender: fd.get("gender") as string,
      grade: fd.get("grade") as string,
      startDate: fd.get("startDate") as string,
      weightKg: weightRaw ? Number(weightRaw) : undefined,
      heightCm: heightRaw ? Number(heightRaw) : undefined,
      addressStreet: (fd.get("addressStreet") as string) || null,
      addressCity: (fd.get("addressCity") as string) || null,
      addressRegion: (fd.get("addressRegion") as string) || null,
      instructorId: (instructorRaw as string) || null,
      martialArt: (fd.get("martialArt") as string) || null,
      martialGrade: (fd.get("martialGrade") as string) || null,
      role: (fd.get("role") as string) || "alumno",
    };

    startTransition(async () => {
      const result = await registerPractitionerAction(input);
      if (result.success) {
        router.push(`/admin/practitioners/${result.data.publicId}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Datos personales ── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-neutral-400 uppercase tracking-wider pb-2 border-b border-neutral-700 w-full">
          Datos personales
        </legend>

        <div>
          <label htmlFor="fullName" className={labelClass}>
            Nombre completo <span className="text-rose-500">*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            placeholder="Ej: Juan Pérez González"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="rut" className={labelClass}>
            RUT <span className="text-rose-500">*</span>
          </label>
          <input
            id="rut"
            name="rut"
            type="text"
            required
            placeholder="12345678-9"
            className={inputClass}
          />
          <p className="text-xs text-neutral-500 mt-1">
            Con guión y dígito verificador
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="birthDate" className={labelClass}>
              Fecha de nacimiento <span className="text-rose-500">*</span>
            </label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="gender" className={labelClass}>
              Género <span className="text-rose-500">*</span>
            </label>
            <select id="gender" name="gender" required className={selectClass}>
              <option value="">Seleccionar...</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="grade" className={labelClass}>
              Grado inicial
            </label>
            <input
              id="grade"
              type="text"
              value="Blanco"
              readOnly
              className={`${inputClass} cursor-not-allowed opacity-50`}
            />
            <input type="hidden" name="grade" value="white" />
          </div>
          <div>
            <label htmlFor="startDate" className={labelClass}>
              Fecha de inicio <span className="text-rose-500">*</span>
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="role" className={labelClass}>
            Rol en el sistema
          </label>
          <select
            id="role"
            name="role"
            defaultValue="alumno"
            className={selectClass}
          >
            {Object.entries(ROLE_LABELS)
              .filter(([key]) =>
                ["alumno", "instructor", "profesor", "maestro"].includes(key),
              )
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label htmlFor="weightKg" className={labelClass}>
            Peso (kg)
            <span className="text-neutral-500 font-normal ml-1">
              — opcional
            </span>
          </label>
          <input
            id="weightKg"
            name="weightKg"
            type="number"
            step="0.1"
            min="0"
            max="300"
            placeholder="Ej: 68.5"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="heightCm" className={labelClass}>
            Altura (cm)
            <span className="text-neutral-500 font-normal ml-1">
              — opcional
            </span>
          </label>
          <input
            id="heightCm"
            name="heightCm"
            type="number"
            step="1"
            min="50"
            max="250"
            placeholder="Ej: 170"
            className={inputClass}
          />
        </div>
      </fieldset>

      {/* ── Historial marcial previo ── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-neutral-400 uppercase tracking-wider pb-2 border-b border-neutral-700 w-full">
          Historial marcial previo
          <span className="text-neutral-600 font-normal normal-case tracking-normal ml-2">
            — opcional
          </span>
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="martialArt" className={labelClass}>
              Arte marcial previa
            </label>
            <select id="martialArt" name="martialArt" className={selectClass}>
              <option value="">Seleccionar...</option>
              <option value="Taekwondo WT">Tae kwon do WT</option>
              <option value="Taekwondo ITF">Tae kwon do ITF</option>
              <option value="BJJ">BJJ</option>
              <option value="Karate">Karate</option>
              <option value="Boxeo">Boxeo</option>
              <option value="Kung Fu">Kung Fu</option>
              <option value="Lucha">Lucha</option>
              <option value="Otras">Otras artes marciales</option>
            </select>
          </div>
          <div>
            <label htmlFor="martialGrade" className={labelClass}>
              Grado marcial
            </label>
            <select
              id="martialGrade"
              name="martialGrade"
              className={selectClass}
            >
              <option value="">Seleccionar...</option>
              <option value="white">Blanco</option>
              <option value="yellow">Amarillo</option>
              <option value="green">Verde</option>
              <option value="blue">Azul</option>
              <option value="red">Rojo</option>
              <option value="black">Negro</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* ── Dirección ── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-neutral-400 uppercase tracking-wider pb-2 border-b border-neutral-700 w-full">
          Dirección
          <span className="text-neutral-600 font-normal normal-case tracking-normal ml-2">
            — opcional
          </span>
        </legend>

        <div>
          <label htmlFor="addressStreet" className={labelClass}>
            Calle y número
          </label>
          <input
            id="addressStreet"
            name="addressStreet"
            type="text"
            placeholder="Ej: Av. Libertador 1234"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="addressCity" className={labelClass}>
              Ciudad
            </label>
            <input
              id="addressCity"
              name="addressCity"
              type="text"
              placeholder="Ej: Santiago"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="addressRegion" className={labelClass}>
              Región
            </label>
            <select
              id="addressRegion"
              name="addressRegion"
              className={selectClass}
            >
              <option value="">Seleccionar...</option>
              <option value="Arica y Parinacota">Arica y Parinacota</option>
              <option value="Tarapacá">Tarapacá</option>
              <option value="Antofagasta">Antofagasta</option>
              <option value="Atacama">Atacama</option>
              <option value="Coquimbo">Coquimbo</option>
              <option value="Valparaíso">Valparaíso</option>
              <option value="Metropolitana">Metropolitana</option>
              <option value="O'Higgins">O&apos;Higgins</option>
              <option value="Maule">Maule</option>
              <option value="Ñuble">Ñuble</option>
              <option value="Biobío">Biobío</option>
              <option value="La Araucanía">La Araucanía</option>
              <option value="Los Ríos">Los Ríos</option>
              <option value="Los Lagos">Los Lagos</option>
              <option value="Aysén">Aysén</option>
              <option value="Magallanes">Magallanes</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* ── Instructor / Maestro ── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-neutral-400 uppercase tracking-wider pb-2 border-b border-neutral-700 w-full">
          Instructor o Maestro responsable
          <span className="text-neutral-600 font-normal normal-case tracking-normal ml-2">
            — opcional
          </span>
        </legend>

        <div>
          <label htmlFor="instructorId" className={labelClass}>
            Instructor / Profesor / Maestro
          </label>
          <select id="instructorId" name="instructorId" className={selectClass}>
            <option value="">Sin asignar</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.fullName}
                {i.role ? ` (${ROLE_LABELS[i.role] ?? i.role})` : ""}
              </option>
            ))}
          </select>
          {instructors.length === 0 && (
            <p className="text-xs text-neutral-500 mt-1">
              No hay instructores registrados aún.
            </p>
          )}
        </div>
      </fieldset>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-400"
        >
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/admin/practitioners"
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Registrando..." : "Registrar practicante"}
        </button>
      </div>
    </form>
  );
}
