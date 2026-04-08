import { PublicNav } from "@/app/_components/PublicNav";
import { VerifyForm } from "./VerifyForm";

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <PublicNav />

      <main className="pt-16 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        {/* Glow accent */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary-600/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-lg space-y-8 text-center">
          {/* Header */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-primary-900/40 border border-primary-800/60 text-primary-400 text-xs font-medium px-3 py-1.5 rounded-full">
              <span aria-hidden="true">🔍</span>
              Verificación oficial
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-50">
              Verificar identidad o certificación
            </h1>
            <p className="text-neutral-400 text-sm leading-relaxed max-w-sm mx-auto">
              Ingresa el ID de un practicante o de una certificación para
              comprobar su validez en tiempo real.
            </p>
          </div>

          {/* Form card */}
          <VerifyForm />

          {/* Help */}
          <p className="text-xs text-neutral-600">
            El ID de certificación se encuentra en el documento oficial emitido
            por Kombat Taekwondo.
          </p>
        </div>
      </main>
    </div>
  );
}
