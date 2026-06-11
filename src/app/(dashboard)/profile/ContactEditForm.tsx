"use client";

import { useState, useTransition } from "react";
import { updateContactInfoAction } from "@/modules/practitioner-identity/presentation/actions/practitionerActions";
import { Pencil, Check, X, Loader2 } from "lucide-react";

interface Props {
  practitionerId: string;
  currentEmail: string | null;
  currentPhone: string | null;
}

export function ContactEditForm({
  practitionerId,
  currentEmail,
  currentPhone,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState(currentEmail ?? "");
  const [phone, setPhone] = useState(currentPhone ?? "");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function handleCancel() {
    setEmail(currentEmail ?? "");
    setPhone(currentPhone ?? "");
    setFeedback(null);
    setIsEditing(false);
  }

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateContactInfoAction({
        publicId: practitionerId,
        contactEmail: email.trim() || null,
        contactPhone: phone.trim() || null,
      });

      if (result.success) {
        setFeedback({
          type: "success",
          message: "Datos actualizados correctamente.",
        });
        setIsEditing(false);
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  if (!isEditing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-50">Contacto</h2>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
        </div>

        {feedback?.type === "success" && (
          <p className="text-xs text-emerald-400">{feedback.message}</p>
        )}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Email de contacto
            </dt>
            <dd className="text-sm text-neutral-200">
              {email || <span className="text-neutral-600">No registrado</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Teléfono
            </dt>
            <dd className="text-sm text-neutral-200">
              {phone || <span className="text-neutral-600">No registrado</span>}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-50">Contacto</h2>
        <p className="text-xs text-neutral-500">Editando</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="contact-email"
            className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1"
          >
            Email de contacto
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.cl"
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label
            htmlFor="contact-phone"
            className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1"
          >
            Teléfono
          </label>
          <input
            id="contact-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+56 9 1234 5678"
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {feedback?.type === "error" && (
        <p role="alert" className="text-xs text-rose-400">
          {feedback.message}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              Guardar cambios
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancelar
        </button>
      </div>
    </div>
  );
}
