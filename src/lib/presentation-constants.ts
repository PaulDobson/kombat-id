import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";

// ---------------------------------------------------------------------------
// Grade
// ---------------------------------------------------------------------------

export const GRADE_LABELS: Record<Grade, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

export const GRADE_STYLES: Record<Grade, string> = {
  white: "bg-neutral-700 text-neutral-200 border border-neutral-600",
  yellow: "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
  green: "bg-green-900/50 text-green-400 border border-green-800",
  blue: "bg-blue-900/50 text-blue-400 border border-blue-800",
  red: "bg-red-900/50 text-red-400 border border-red-800",
  black: "bg-neutral-800 text-neutral-100 border border-neutral-600",
};

export const BELT_COLORS: Record<Grade, string> = {
  white: "bg-neutral-100",
  yellow: "bg-yellow-400",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
  black: "bg-neutral-900 border border-neutral-600",
};

// ---------------------------------------------------------------------------
// Region
// ---------------------------------------------------------------------------

export const REGION_LABELS: Record<ChileanRegion, string> = {
  arica_y_parinacota: "Arica y Parinacota",
  tarapaca: "Tarapacá",
  antofagasta: "Antofagasta",
  atacama: "Atacama",
  coquimbo: "Coquimbo",
  valparaiso: "Valparaíso",
  metropolitana: "Metropolitana",
  ohiggins: "O'Higgins",
  maule: "Maule",
  nuble: "Ñuble",
  biobio: "Biobío",
  araucania: "Araucanía",
  los_rios: "Los Ríos",
  los_lagos: "Los Lagos",
  aysen: "Aysén",
  magallanes: "Magallanes",
};

// ---------------------------------------------------------------------------
// Exam status
// ---------------------------------------------------------------------------

export const EXAM_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  pending_authorization: "Pendiente autorización",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export const EXAM_STATUS_STYLES: Record<string, string> = {
  draft: "bg-neutral-800 text-neutral-400 border border-neutral-700",
  submitted: "bg-blue-900/50 text-blue-400 border border-blue-800",
  pending_authorization:
    "bg-amber-900/50 text-amber-400 border border-amber-800",
  approved: "bg-emerald-900/50 text-emerald-400 border border-emerald-800",
  rejected: "bg-rose-900/50 text-rose-400 border border-rose-800",
};

// ---------------------------------------------------------------------------
// Exam result
// ---------------------------------------------------------------------------

export const RESULT_LABELS: Record<string, string> = {
  approved: "Aprobado",
  failed: "Reprobado",
};

export const RESULT_STYLES: Record<string, string> = {
  approved: "text-emerald-400",
  failed: "text-rose-400",
};

// ---------------------------------------------------------------------------
// Certification
// ---------------------------------------------------------------------------

export const CERT_TYPE_LABELS: Record<string, string> = {
  technical_grade: "Grado técnico",
  instructor: "Instructor",
  referee: "Árbitro",
  coach: "Entrenador",
  event_participation: "Participación en evento",
};

export const CERT_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  observed: "Observada",
};

export const CERT_REQUEST_STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
  approved: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
  rejected: "bg-red-900/50 text-red-400 border-red-800",
  observed: "bg-blue-900/50 text-blue-400 border-blue-800",
};

// ---------------------------------------------------------------------------
// Event type
// ---------------------------------------------------------------------------

export const EVENT_TYPE_LABELS: Record<string, string> = {
  competition: "Competencia",
  seminar: "Seminario",
  exam: "Examen",
};

export const EVENT_TYPE_STYLES: Record<string, string> = {
  competition: "bg-primary-900/50 text-primary-400 border border-primary-800",
  seminar: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  exam: "bg-emerald-900/50 text-emerald-400 border border-emerald-800",
};

// ---------------------------------------------------------------------------
// Gender
// ---------------------------------------------------------------------------

export const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro",
};
