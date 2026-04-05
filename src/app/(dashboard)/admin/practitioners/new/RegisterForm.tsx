"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerPractitionerAction } from "@/modules/practitioner-identity/presentation/actions/practitionerActions";

export function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const weightRaw = formData.get("weightKg");
    const input = {
      fullName: formData.get("fullName") as string,
      rut: formData.get("rut") as string,
      birthDate: formData.get("birthDate") as string,
      gender: formData.get("gender") as string,
      grade: formData.get("grade") as string,
      startDate: formData.get("startDate") as string,
      weightKg: weightRaw ? Number(weightRaw) : undefined,
    };

    startTransition(async () => {
      const result = await registerPractitionerAction(input);
      if (result.success) {
        router.push(`/admin/practitioners/${result.data.publicId}`);
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="fullName">Nombre completo</label>
        <input id="fullName" name="fullName" type="text" required />
      </div>

      <div>
        <label htmlFor="rut">RUT</label>
        <input
          id="rut"
          name="rut"
          type="text"
          placeholder="12345678-9"
          required
        />
      </div>

      <div>
        <label htmlFor="birthDate">Fecha de nacimiento</label>
        <input id="birthDate" name="birthDate" type="date" required />
      </div>

      <div>
        <label htmlFor="gender">Género</label>
        <select id="gender" name="gender" required>
          <option value="">Seleccionar...</option>
          <option value="male">Masculino</option>
          <option value="female">Femenino</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <div>
        <label htmlFor="grade">Grado</label>
        <select id="grade" name="grade" required>
          <option value="">Seleccionar...</option>
          <option value="white">Blanco</option>
          <option value="yellow">Amarillo</option>
          <option value="green">Verde</option>
          <option value="blue">Azul</option>
          <option value="red">Rojo</option>
          <option value="black">Negro</option>
        </select>
      </div>

      <div>
        <label htmlFor="startDate">Fecha de inicio</label>
        <input id="startDate" name="startDate" type="date" required />
      </div>

      <div>
        <label htmlFor="weightKg">Peso (kg, opcional)</label>
        <input
          id="weightKg"
          name="weightKg"
          type="number"
          step="0.01"
          min="0"
        />
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? "Registrando..." : "Registrar practicante"}
      </button>
    </form>
  );
}
