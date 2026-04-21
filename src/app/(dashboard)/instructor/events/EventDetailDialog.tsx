"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { EventType } from "@/types/database.types";
import { formatDateWithWeekday } from "@/lib/format-date";
import { formatRegistrationFee } from "@/modules/event-registration/domain/entities/eventRegistration";
import { getEventFileUrl } from "@/lib/supabase/storage";

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  competition: "Competencia",
  seminar: "Seminario",
  exam: "Examen",
};

const EVENT_TYPE_STYLES: Record<EventType, string> = {
  competition: "bg-primary-900/50 text-primary-400 border border-primary-800",
  seminar: "bg-warning-500/10 text-warning-400 border border-warning-500/30",
  exam: "bg-success-900/50 text-success-400 border border-success-800",
};

export interface EventDetailProps {
  id: string;
  name: string;
  event_type: EventType;
  event_date: string;
  location: string | null;
  description: string | null;
  registration_fee: number | null;
  cover_image_path: string | null;
}

interface Props {
  event: EventDetailProps;
  trigger: React.ReactNode;
}

export function EventDetailDialog({ event, trigger }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && event.cover_image_path && !signedUrl) {
      getEventFileUrl(event.cover_image_path).then((url) => {
        if (url) setSignedUrl(url);
      });
    }
  }, [open, event.cover_image_path, signedUrl]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Cover image — full width, natural proportions */}
          {signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedUrl}
              alt={event.name}
              className="w-full max-h-[60vh] object-contain bg-neutral-950 shrink-0"
            />
          ) : event.cover_image_path ? (
            <div className="w-full h-72 shrink-0 bg-neutral-800 animate-pulse" />
          ) : null}

          {/* Content */}
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <Dialog.Title className="text-xl font-semibold text-neutral-50 leading-tight">
                  {event.name}
                </Dialog.Title>
                <span
                  className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${EVENT_TYPE_STYLES[event.event_type]}`}
                >
                  {EVENT_TYPE_LABELS[event.event_type]}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-neutral-400">
                <span className="capitalize">
                  📅 {formatDateWithWeekday(event.event_date)}
                </span>
                {event.location && <span>📍 {event.location}</span>}
                <span>💰 {formatRegistrationFee(event.registration_fee)}</span>
              </div>
            </div>

            {event.description ? (
              <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            ) : (
              <p className="text-sm text-neutral-600 italic">
                Sin descripción disponible.
              </p>
            )}
          </div>

          <Dialog.Close className="absolute top-3 right-3 z-10 bg-neutral-900/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors">
            ✕
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
