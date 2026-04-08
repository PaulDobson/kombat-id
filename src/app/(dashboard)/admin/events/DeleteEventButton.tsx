"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { deleteEventAction } from "@/modules/practitioner-identity/presentation/actions/eventActions";

interface Props {
  id: string;
  name: string;
}

export function DeleteEventButton({ id, name }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteEventAction(id);
      if (result.success) {
        setOpen(false);
        router.push("/admin/events");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="bg-neutral-800 hover:bg-error-600 text-neutral-400 hover:text-white border border-neutral-700 hover:border-error-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Eliminar evento
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 w-full max-w-md">
          <Dialog.Title className="text-base font-semibold text-neutral-50">
            Eliminar evento
          </Dialog.Title>
          <Dialog.Description className="text-sm text-neutral-400 mt-2">
            ¿Estás seguro de que deseas eliminar{" "}
            <span className="text-neutral-200 font-medium">{name}</span>? Esta
            acción no se puede deshacer.
          </Dialog.Description>

          {error && (
            <p
              role="alert"
              className="mt-3 text-xs text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Dialog.Close asChild>
              <button
                disabled={isPending}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </Dialog.Close>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="bg-error-600 hover:bg-error-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
