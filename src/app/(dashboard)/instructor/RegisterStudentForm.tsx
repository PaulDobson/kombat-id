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
};

export function RegisterStudentForm() {
  const [fields, setFields] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
    setSuccess(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await registerStudentAction({
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
      });

      if (result.success) {
        setSuccess(true);
        setFields({ ...initialState, startDate: today });
      } else {
        setError(result.error);
      }
    });
  }

  const inputClass =
    "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";
  const labelClass = "block text-xs font-medium text-neutral-400 mb-1";

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

      {/* Feedback */}
      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-400">
          Alumno registrado exitosamente
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
