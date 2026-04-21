import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleQrScanRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleQrScanRepository";
import { verifyByQrToken } from "@/modules/practitioner-identity/application/use-cases/verifyByQrToken";
import { PractitionerNotFoundError } from "@/modules/practitioner-identity/domain/errors";
import { notFound } from "next/navigation";
import Image from "next/image";

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const GRADE_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  white: {
    bg: "bg-neutral-200",
    text: "text-neutral-900",
    border: "border-neutral-300",
  },
  yellow: {
    bg: "bg-yellow-400",
    text: "text-yellow-900",
    border: "border-yellow-500",
  },
  green: {
    bg: "bg-emerald-500",
    text: "text-white",
    border: "border-emerald-600",
  },
  blue: { bg: "bg-blue-500", text: "text-white", border: "border-blue-600" },
  red: { bg: "bg-red-500", text: "text-white", border: "border-red-600" },
  black: {
    bg: "bg-neutral-900",
    text: "text-neutral-100",
    border: "border-neutral-600",
  },
};

export default async function QrVerificationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const practitionerRepo = new DrizzlePractitionerRepository();
  const qrScanRepo = new DrizzleQrScanRepository();

  let result;
  try {
    result = await verifyByQrToken(token, { practitionerRepo, qrScanRepo });
  } catch (err) {
    if (err instanceof PractitionerNotFoundError) notFound();
    console.error("[verify/qr] Error:", err);
    throw err;
  }

  const gradeColor = GRADE_COLORS[result.grade] ?? GRADE_COLORS["white"]!;
  const gradeLabel = GRADE_LABELS[result.grade] ?? result.grade;
  const kombatId = `KT-${result.practitionerId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Brand */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
          <span className="text-white font-bold text-xs" aria-hidden="true">
            KT
          </span>
        </div>
        <span className="text-neutral-400 text-sm font-medium">
          Kombat Taekwondo Chile
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden shadow-2xl">
        {/* Status banner */}
        {result.isActive ? (
          <div className="bg-success-500/10 border-b border-success-500/20 px-5 py-3 flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full bg-success-400 shrink-0"
              aria-hidden="true"
            />
            <span className="text-success-400 text-sm font-medium">
              Identidad verificada
            </span>
          </div>
        ) : (
          <div
            role="alert"
            className="bg-error-500/10 border-b border-error-500/20 px-5 py-3 flex items-center gap-2"
          >
            <span
              className="w-2 h-2 rounded-full bg-error-400 shrink-0"
              aria-hidden="true"
            />
            <span className="text-error-400 text-sm font-medium">
              Practicante inactivo / suspendido
            </span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Photo + name */}
          <div className="flex items-center gap-4">
            {result.photoPath ? (
              <Image
                src={result.photoPath}
                alt={`Foto de ${result.fullName}`}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border-2 border-neutral-700 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center shrink-0">
                <span
                  className="text-neutral-400 text-xl font-semibold"
                  aria-hidden="true"
                >
                  {result.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-neutral-50 font-semibold text-lg leading-tight truncate">
                {result.fullName}
              </p>
              <p className="text-xs font-mono text-neutral-500 mt-0.5">
                {kombatId}
              </p>
            </div>
          </div>

          {/* Grade badge */}
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full shrink-0 border-2 ${gradeColor.bg} ${gradeColor.border} flex items-center justify-center`}
              aria-hidden="true"
            >
              <span
                className={`text-xs font-bold uppercase ${gradeColor.text}`}
              >
                {result.grade === "black" ? "DAN" : result.grade.slice(0, 3)}
              </span>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">
                Grado
              </p>
              <p className="text-neutral-100 text-sm font-semibold">
                Cinturón {gradeLabel}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-800" />

          {/* Status row */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-medium">
              Estado
            </span>
            {result.isActive ? (
              <span className="bg-success-900/50 text-success-400 border border-success-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
                Activo
              </span>
            ) : (
              <span className="bg-error-500/10 text-error-400 border border-error-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium">
                Inactivo
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-950/50 border-t border-neutral-800 px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-neutral-600">
            Verificado · {new Date().toLocaleDateString("es-CL")}
          </span>
          <span className="text-xs text-neutral-600">kombat.cl</span>
        </div>
      </div>

      <p className="mt-6 text-xs text-neutral-700 text-center max-w-xs">
        Esta verificación es oficial y fue generada por el sistema de identidad
        digital de Kombat Taekwondo Chile.
      </p>
    </div>
  );
}
