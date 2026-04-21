"use client";

import { useState, useTransition } from "react";
import { registerStudentAction } from "@/modules/practitioner-identity/presentation/actions/instructorActions";

const today = new Date().toISOString().split("T")[0];

const initialState = {
  rut: "",
  fullName: "",
  birthDate: "",
  gender: "" as "male" | "female" | "other" | "",
  grade: "" as "white" | "yellow" | "green" | "blue" | "red" | "black" | "",
  startDate: today,
  weightKg: "",
  addressCity: "",
  studentEmail: "",
};

export function RegisterStudentForm() {
  const [fields, setFields] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    publicId: string;
    linked: boolean;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
    setResult(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    startTransition(async () => {
      const res = await registerStudentAction({
        rut: fields.rut,
        fullName: fields.fullName,
        birthDate: fields.birthDate,
        gender: fields.gender as "male" | "female" | "other",
        grade: fields.grade as
          | "white"
          | "yellow"
          | "green"
          | "blue"
          | "red"
          | "black",
        startDate: fields.startDate,
        weightKg: fields.weightKg ? parseFloat(fields.weightKg) : undefined,
        addressCity: fields.addressCity || undefined,
        studentEmail: fields.studentEmail || undefined,
      });

      if (res.success) {
        setResult({
          publicId: res.data.publicId,
          linked: Boolean(fields.studentEmail),
        });
        setFields({ ...initialState, startDate: today });
      } else {
        setError(res.error);
      }
    });
  }

  const inputClass =
    "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";
  const labelClass = "block text-xs font-medium text-neutral-400 mb-1";

  if (result) {
    return (
      <div className="space-y-4">
        {/* Success state */}
        <div className="flex items-start gap-3 bg-success-500/10 border border-success-500/20 rounded-xl p-4">
          <svg
            className="w-5 h-5 text-success-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="space-y-1">
            <p className="text-sm font-medium text-success-400">
              Alumno registrado exitosamente
            </p>
            <p className="text-xs text-neutral-400">
              ID generado:{" "}
              <span className="font-mono text-neutral-200">
                {result.publicId}
              </span>
            </p>
            {result.linked ? (
              <p className="text-xs text-success-400/80">
                ✓ Cuenta vinculada — el alumno ya puede ingresar y ver su perfil
                y QR.
              </p>
            ) : (
              <p className="text-xs text-warning-400/80">
                ⚠ Sin email ingresado — cuando el alumno cree su cuenta con el
                mismo RUT, se vinculará automáticamente.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setResult(null)}
          className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
        >
          Registrar otro alumno
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* RUT */}
      <div>
        <label htmlFor="rut" className={labelClass}>
          RUT <span className="text-rose-400">*</span>
        </label>
        <input
          id="rut"
          name="rut"
          type="text"
          required
          placeholder="12345678-9"
          value={fields.rut}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      {/* Nombre completo */}
      <div>
        <label htmlFor="fullName" className={labelClass}>
          Nombre completo <span className="text-rose-400">*</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          placeholder="Juan Pérez González"
          value={fields.fullName}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      {/* Email del alumno */}
      <div>
        <label htmlFor="studentEmail" className={labelClass}>
          Correo del alumno{" "}
          <span className="text-neutral-600 font-normal">(opcional)</span>
        </label>
        <input
          id="studentEmail"
          name="studentEmail"
          type="email"
          placeholder="alumno@correo.cl"
          value={fields.studentEmail}
          onChange={handleChange}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-neutral-600">
          Si el alumno ya tiene cuenta, se vinculará automáticamente.
        </p>
      </div>

      {/* Fecha de nacimiento */}
      <div>
        <label htmlFor="birthDate" className={labelClass}>
          Fecha de nacimiento <span className="text-rose-400">*</span>
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          required
          value={fields.birthDate}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      {/* Género */}
      <div>
        <label htmlFor="gender" className={labelClass}>
          Género <span className="text-rose-400">*</span>
        </label>
        <select
          id="gender"
          name="gender"
          required
          value={fields.gender}
          onChange={handleChange}
          className={inputClass}
        >
          <option value="" disabled>
            Seleccionar...
          </option>
          <option value="male">Masculino</option>
          <option value="female">Femenino</option>
          <option value="other">Otro</option>
        </select>
      </div>

      {/* Grado inicial */}
      <div>
        <label htmlFor="grade" className={labelClass}>
          Grado inicial <span className="text-rose-400">*</span>
        </label>
        <select
          id="grade"
          name="grade"
          required
          value={fields.grade}
          onChange={handleChange}
          className={inputClass}
        >
          <option value="" disabled>
            Seleccionar...
          </option>
          <option value="white">Blanco</option>
          <option value="yellow">Amarillo</option>
          <option value="green">Verde</option>
          <option value="blue">Azul</option>
          <option value="red">Rojo</option>
          <option value="black">Negro</option>
        </select>
      </div>

      {/* Fecha de inicio */}
      <div>
        <label htmlFor="startDate" className={labelClass}>
          Fecha de inicio <span className="text-rose-400">*</span>
        </label>
        <input
          id="startDate"
          name="startDate"
          type="date"
          required
          value={fields.startDate}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      {/* Peso (opcional) */}
      <div>
        <label htmlFor="weightKg" className={labelClass}>
          Peso (kg)
        </label>
        <input
          id="weightKg"
          name="weightKg"
          type="number"
          step="0.1"
          min="0"
          placeholder="65.5"
          value={fields.weightKg}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      {/* Ciudad (opcional) */}
      <div>
        <label htmlFor="addressCity" className={labelClass}>
          Ciudad
        </label>
        <input
          id="addressCity"
          name="addressCity"
          type="text"
          placeholder="Santiago"
          value={fields.addressCity}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Registrando..." : "Registrar alumno"}
      </button>
    </form>
  );
}
