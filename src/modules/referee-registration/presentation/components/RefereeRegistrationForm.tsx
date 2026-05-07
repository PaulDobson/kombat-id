"use client";

import { useState, useTransition, useRef } from "react";
import { z } from "zod";
import { submitRefereeRegistrationAction } from "../actions/refereeRegistrationActions";

// ---------------------------------------------------------------------------
// Client-side validation schema
// Validates: Propiedad 6 — Validación rechaza archivos no PDF
// Validates: Propiedad 9 — Tamaño máximo del certificado
// ---------------------------------------------------------------------------

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB

const FormSchema = z.object({
  email: z
    .string()
    .email("El email debe tener un formato válido")
    .max(254, "El email no puede superar los 254 caracteres"),
  fullName: z
    .string()
    .min(2, "El nombre completo debe tener al menos 2 caracteres")
    .max(200, "El nombre completo no puede superar los 200 caracteres"),
  country: z.string().min(1, "El país es obligatorio"),
  registrationNumber: z
    .string()
    .min(1, "El número de registro es obligatorio")
    .max(100, "El número de registro no puede superar los 100 caracteres"),
});

type FormErrors = Partial<Record<string, string>>;

const inputClass =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RefereeRegistrationForm() {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFieldErrors((prev) => ({ ...prev, certificate: undefined }));

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate MIME type — Propiedad 6
    if (file.type !== "application/pdf") {
      setFieldErrors((prev) => ({
        ...prev,
        certificate: "Solo se aceptan archivos PDF",
      }));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate size — Propiedad 9
    if (file.size > MAX_PDF_SIZE) {
      setFieldErrors((prev) => ({
        ...prev,
        certificate: "El archivo no puede superar los 10 MB",
      }));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});

    const form = e.currentTarget;
    const data = new FormData(form);

    const rawPayload = {
      email: data.get("email") as string,
      fullName: data.get("fullName") as string,
      country: data.get("country") as string,
      registrationNumber: data.get("registrationNumber") as string,
    };

    // Client-side field validation
    const parsed = FormSchema.safeParse(rawPayload);
    if (!parsed.success) {
      const errors: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    if (!selectedFile) {
      // PDF is optional — proceed without it
    }

    startTransition(async () => {
      // Build FormData and send everything to the Server Action.
      // The PDF upload happens server-side via adminSupabase,
      // so no Storage bucket policies are needed for anonymous users.
      const formData = new FormData();
      formData.append("email", parsed.data.email);
      formData.append("fullName", parsed.data.fullName);
      formData.append("country", parsed.data.country);
      formData.append("registrationNumber", parsed.data.registrationNumber);
      if (selectedFile) {
        formData.append("certificate", selectedFile);
      }

      const result = await submitRefereeRegistrationAction(formData);

      if (result.success) {
        setSuccess(true);
      } else {
        if (result.code === "CONFLICT") {
          setFieldErrors((prev) => ({
            ...prev,
            email: result.error,
          }));
        } else {
          setGlobalError(result.error);
        }
      }
    });
  }

  // Success state
  if (success) {
    return (
      <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 px-6 py-8 text-center space-y-2">
        <p className="text-emerald-400 font-semibold text-lg">
          ¡Registro recibido!
        </p>
        <p className="text-neutral-300 text-sm">
          Tu solicitud de acreditación está pendiente de revisión. Te
          contactaremos al email proporcionado una vez que sea procesada.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {/* Email */}
      <div className="space-y-1">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-neutral-300"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={isPending}
          className={inputClass}
          placeholder="tu@email.com"
        />
        {fieldErrors.email && (
          <p className="text-xs text-error-400">{fieldErrors.email}</p>
        )}
      </div>

      {/* Nombre completo */}
      <div className="space-y-1">
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-neutral-300"
        >
          Nombre completo
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          disabled={isPending}
          className={inputClass}
          placeholder="Juan Pérez González"
        />
        {fieldErrors.fullName && (
          <p className="text-xs text-error-400">{fieldErrors.fullName}</p>
        )}
      </div>

      {/* País */}
      <div className="space-y-1">
        <label
          htmlFor="country"
          className="block text-sm font-medium text-neutral-300"
        >
          País
        </label>
        <input
          id="country"
          name="country"
          type="text"
          required
          autoComplete="country-name"
          disabled={isPending}
          className={inputClass}
          placeholder="Chile"
          list="countries-list"
        />
        <datalist id="countries-list">
          {COUNTRIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {fieldErrors.country && (
          <p className="text-xs text-error-400">{fieldErrors.country}</p>
        )}
      </div>

      {/* Número de registro oficial */}
      <div className="space-y-1">
        <label
          htmlFor="registrationNumber"
          className="block text-sm font-medium text-neutral-300"
        >
          Número de registro oficial
        </label>
        <input
          id="registrationNumber"
          name="registrationNumber"
          type="text"
          required
          disabled={isPending}
          className={inputClass}
          placeholder="ARB-2024-001"
        />
        {fieldErrors.registrationNumber && (
          <p className="text-xs text-error-400">
            {fieldErrors.registrationNumber}
          </p>
        )}
      </div>

      {/* Certificado PDF */}
      <div className="space-y-1">
        <label
          htmlFor="certificate"
          className="block text-sm font-medium text-neutral-300"
        >
          Certificado oficial (PDF){" "}
          <span className="text-neutral-500 font-normal">(opcional)</span>
        </label>
        <input
          ref={fileInputRef}
          id="certificate"
          name="certificate"
          type="file"
          accept="application/pdf"
          disabled={isPending}
          onChange={handleFileChange}
          className="w-full text-sm text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-neutral-700 file:text-neutral-200 hover:file:bg-neutral-600 file:cursor-pointer disabled:opacity-50"
        />
        {selectedFile && !fieldErrors.certificate && (
          <p className="text-xs text-neutral-500">
            {selectedFile.name} —{" "}
            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        )}
        {fieldErrors.certificate && (
          <p className="text-xs text-error-400">{fieldErrors.certificate}</p>
        )}
        <p className="text-xs text-neutral-600">
          Solo PDF · máximo 10 MB · puedes adjuntarlo después
        </p>
      </div>

      {/* Global error */}
      {globalError && (
        <p
          role="alert"
          className="text-xs text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2"
        >
          {globalError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Enviando..." : "Enviar solicitud de registro"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Countries list (abbreviated — common countries + full ISO list)
// ---------------------------------------------------------------------------

const COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kosovo",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];
