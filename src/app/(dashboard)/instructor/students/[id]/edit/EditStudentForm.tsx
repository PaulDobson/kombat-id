"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStudentProfileAction } from "@/modules/practitioner-identity/presentation/actions/instructorActions";

const REGIONS = [
  { value: "arica_y_parinacota", label: "Arica y Parinacota" },
  { value: "tarapaca", label: "Tarapacá" },
  { value: "antofagasta", label: "Antofagasta" },
  { value: "atacama", label: "Atacama" },
  { value: "coquimbo", label: "Coquimbo" },
  { value: "valparaiso", label: "Valparaíso" },
  { value: "metropolitana", label: "Metropolitana" },
  { value: "ohiggins", label: "O'Higgins" },
  { value: "maule", label: "Maule" },
  { value: "nuble", label: "Ñuble" },
  { value: "biobio", label: "Biobío" },
  { value: "araucania", label: "Araucanía" },
  { value: "los_rios", label: "Los Ríos" },
  { value: "los_lagos", label: "Los Lagos" },
  { value: "aysen", label: "Aysén" },
  { value: "magallanes", label: "Magallanes" },
];

interface StudentEditData {
  publicId: string;
  weightKg: number | null;
  heightCm: number | null;
  contactPhone: string | null;
  contactEmail: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressRegion: string | null;
}

interface Props {
  student: StudentEditData;
  backHref?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditStudentForm({
  student,
  backHref,
  onSuccess,
  onCancel,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [weightKg, setWeightKg] = useState(
    student.weightKg !== null ? String(student.weightKg) : "",
  );
  const [heightCm, setHeightCm] = useState(
    student.heightCm !== null ? String(student.heightCm) : "",
  );
  const [contactPhone, setContactPhone] = useState(student.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(student.contactEmail ?? "");
  const [addressStreet, setAddressStreet] = useState(
    student.addressStreet ?? "",
  );
  const [addressCity, setAddressCity] = useState(student.addressCity ?? "");
  const [addressRegion, setAddressRegion] = useState(
    student.addressRegion ?? "",
  );

  const inputClass =
    "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";
  const labelClass = "block text-xs font-medium text-neutral-400 mb-1";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await updateStudentProfileAction({
        publicId: student.publicId,
        weightKg: weightKg !== "" ? parseFloat(weightKg) : null,
        heightCm: heightCm !== "" ? parseInt(heightCm, 10) : null,
        contactPhone: contactPhone !== "" ? contactPhone : null,
        contactEmail: contactEmail !== "" ? contactEmail : null,
        addressStreet: addressStreet !== "" ? addressStreet : null,
        addressCity: addressCity !== "" ? addressCity : null,
        addressRegion: addressRegion !== "" ? addressRegion : null,
      });

      if (res.success) {
        if (onSuccess) {
          onSuccess();
        } else if (backHref) {
          router.push(backHref);
        }
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Peso */}
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
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Estatura */}
      <div>
        <label htmlFor="heightCm" className={labelClass}>
          Estatura (cm)
        </label>
        <input
          id="heightCm"
          name="heightCm"
          type="number"
          step="1"
          min="50"
          max="250"
          placeholder="170"
          value={heightCm}
          onChange={(e) => setHeightCm(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Teléfono */}
      <div>
        <label htmlFor="contactPhone" className={labelClass}>
          Teléfono de contacto
        </label>
        <input
          id="contactPhone"
          name="contactPhone"
          type="text"
          placeholder="+56 9 1234 5678"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Email de contacto */}
      <div>
        <label htmlFor="contactEmail" className={labelClass}>
          Correo de contacto
        </label>
        <input
          id="contactEmail"
          name="contactEmail"
          type="email"
          placeholder="alumno@correo.cl"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Calle */}
      <div>
        <label htmlFor="addressStreet" className={labelClass}>
          Calle y número
        </label>
        <input
          id="addressStreet"
          name="addressStreet"
          type="text"
          placeholder="Av. Providencia 1234"
          value={addressStreet}
          onChange={(e) => setAddressStreet(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Ciudad */}
      <div>
        <label htmlFor="addressCity" className={labelClass}>
          Ciudad
        </label>
        <input
          id="addressCity"
          name="addressCity"
          type="text"
          placeholder="Santiago"
          value={addressCity}
          onChange={(e) => setAddressCity(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Región */}
      <div>
        <label htmlFor="addressRegion" className={labelClass}>
          Región
        </label>
        <select
          id="addressRegion"
          name="addressRegion"
          value={addressRegion}
          onChange={(e) => setAddressRegion(e.target.value)}
          className={inputClass}
        >
          <option value="">Seleccionar región</option>
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>

        <button
          type="button"
          onClick={() =>
            onCancel ? onCancel() : backHref ? router.push(backHref) : undefined
          }
          disabled={isPending}
          className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
