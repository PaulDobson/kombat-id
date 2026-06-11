"use client";

import { useTransition } from "react";
import { regenerateCertificateAction } from "@/modules/practitioner-identity/presentation/actions/regenerateCertificateAction";
import { RefreshCw } from "lucide-react";
import Swal from "sweetalert2";

interface Props {
  publicId: string;
  practitionerName: string;
}

export function RegenerateCertificateButton({
  publicId,
  practitionerName,
}: Props) {
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    const confirm = await Swal.fire({
      title: "¿Regenerar certificado?",
      html: `<p class="text-sm text-neutral-300">Se generará un nuevo certificado de membresía para <strong>${practitionerName}</strong> y reemplazará el actual en el storage.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, regenerar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#C9A84C",
      cancelButtonColor: "#404040",
      background: "#171717",
      color: "#f5f5f5",
    });

    if (!confirm.isConfirmed) return;

    startTransition(async () => {
      const result = await regenerateCertificateAction({ publicId });

      if (result.success) {
        await Swal.fire({
          title: "¡Certificado generado!",
          text: "El certificado de membresía fue regenerado correctamente.",
          icon: "success",
          confirmButtonColor: "#C9A84C",
          background: "#171717",
          color: "#f5f5f5",
        });
      } else {
        await Swal.fire({
          title: "Error",
          text: result.error ?? "No se pudo regenerar el certificado.",
          icon: "error",
          confirmButtonColor: "#ef4444",
          background: "#171717",
          color: "#f5f5f5",
        });
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Generando..." : "Regenerar certificado"}
    </button>
  );
}
