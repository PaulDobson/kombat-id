"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import * as Label from "@radix-ui/react-label";
import * as Dialog from "@radix-ui/react-dialog";
import { z } from "zod";
import {
  createEventAction,
  updateEventAction,
  type MartialEvent,
} from "@/modules/practitioner-identity/presentation/actions/eventActions";
import {
  uploadEventCoverImage,
  uploadEventAttachment,
  deleteEventFile,
  getEventFileUrl,
  type AttachmentMeta,
} from "@/lib/supabase/storage";

const EVENT_TYPE_OPTIONS = [
  { value: "competition", label: "Competencia" },
  { value: "seminar", label: "Seminario" },
  { value: "exam", label: "Examen" },
] as const;

const EventFormSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    event_type: z.enum(["competition", "seminar", "exam"]),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    location: z.string().optional(),
    description: z
      .string()
      .max(5000, "La descripción no puede superar los 5000 caracteres")
      .optional(),
    isFree: z.boolean(),
    registration_fee: z
      .number()
      .min(0, "El precio no puede ser negativo")
      .nullable()
      .optional(),
    min_participants: z
      .number()
      .int()
      .min(1, "El valor debe ser mayor que cero")
      .nullable()
      .optional(),
    max_participants: z
      .number()
      .int()
      .min(1, "El valor debe ser mayor que cero")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.min_participants != null && data.max_participants != null) {
        return data.max_participants >= data.min_participants;
      }
      return true;
    },
    {
      message: "El máximo de participantes debe ser mayor o igual al mínimo",
      path: ["max_participants"],
    },
  );

type FormErrors = Partial<Record<string, string>>;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  event?: MartialEvent;
}

export function EventForm({ event }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [isFree, setIsFree] = useState<boolean>(
    event ? event.registration_fee === null : false,
  );
  const isEdit = !!event;

  // Cover image state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverSignedUrl, setCoverSignedUrl] = useState<string | null>(null);
  const [coverLightboxOpen, setCoverLightboxOpen] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Load signed URL for existing cover image
  useEffect(() => {
    if (event?.cover_image_path) {
      getEventFileUrl(event.cover_image_path).then((url) => {
        if (url) setCoverSignedUrl(url);
      });
    }
  }, [event?.cover_image_path]);

  // Attachments state
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<
    AttachmentMeta[]
  >((event?.attachments ?? []) as AttachmentMeta[]);
  const attachInputRef = useRef<HTMLInputElement>(null);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setRemoveCover(false);
  }

  function handleRemoveCover() {
    setCoverFile(null);
    setCoverPreview(null);
    setCoverSignedUrl(null);
    setRemoveCover(true);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  function handleAttachmentsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setNewAttachments((prev) => [...prev, ...files]);
    if (attachInputRef.current) attachInputRef.current.value = "";
  }

  function removeNewAttachment(index: number) {
    setNewAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function removeExistingAttachment(attachment: AttachmentMeta) {
    // Optimistically remove from UI; fire-and-forget delete
    setExistingAttachments((prev) =>
      prev.filter((a) => a.path !== attachment.path),
    );
    await deleteEventFile(attachment.path);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const form = e.currentTarget;
    const data = new FormData(form);

    const feeRaw = data.get("registration_fee") as string;
    const minRaw = data.get("min_participants") as string;
    const maxRaw = data.get("max_participants") as string;

    const parseOptionalInt = (val: string) => {
      if (!val || val.trim() === "") return undefined;
      const n = parseInt(val, 10);
      return isNaN(n) ? val : n;
    };

    const parseOptionalFloat = (val: string) => {
      if (!val || val.trim() === "") return undefined;
      const n = parseFloat(val);
      return isNaN(n) ? val : n;
    };

    const rawPayload = {
      name: data.get("name") as string,
      event_type: data.get("event_type") as string,
      event_date: data.get("event_date") as string,
      location: (data.get("location") as string) || undefined,
      description: (data.get("description") as string) || undefined,
      isFree,
      registration_fee: isFree ? null : parseOptionalFloat(feeRaw),
      min_participants: parseOptionalInt(minRaw),
      max_participants: parseOptionalInt(maxRaw),
    };

    const parsed = EventFormSchema.safeParse(rawPayload);
    if (!parsed.success) {
      const errors: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      // 1. Upload cover image if a new one was selected
      let coverImagePath: string | null = removeCover
        ? null
        : (event?.cover_image_path ?? null);

      if (coverFile) {
        // We need an event ID for the path. For new events, use a temp UUID
        // that will be replaced once the event is created. For edits, use event.id.
        const tempId = isEdit ? event.id : crypto.randomUUID();
        const { path, error: uploadErr } = await uploadEventCoverImage(
          tempId,
          coverFile,
        );
        if (uploadErr) {
          console.warn("[EventForm] Cover upload failed:", uploadErr);
          // Non-blocking: continue without cover
        } else {
          coverImagePath = path;
        }
      }

      // 2. Upload new attachments
      const uploadedAttachments: AttachmentMeta[] = [];
      const tempId = isEdit ? event.id : crypto.randomUUID();

      for (const file of newAttachments) {
        const result = await uploadEventAttachment(tempId, file);
        if (result.error) {
          console.warn("[EventForm] Attachment upload failed:", result.error);
          // Non-blocking: skip failed uploads
        } else {
          uploadedAttachments.push({
            name: result.name,
            path: result.path,
            size: result.size,
            type: result.type,
          });
        }
      }

      const allAttachments = [...existingAttachments, ...uploadedAttachments];

      // 3. Call server action
      const payload = {
        name: parsed.data.name,
        event_type: parsed.data.event_type,
        event_date: parsed.data.event_date,
        location: parsed.data.location || undefined,
        description: parsed.data.description || undefined,
        registration_fee: parsed.data.isFree
          ? null
          : (parsed.data.registration_fee ?? null),
        min_participants: parsed.data.min_participants ?? null,
        max_participants: parsed.data.max_participants ?? null,
        cover_image_path: coverImagePath,
        attachments: allAttachments,
        ...(isEdit ? { id: event.id } : {}),
      };

      const result = isEdit
        ? await updateEventAction(payload)
        : await createEventAction(payload);

      if (result.success) {
        router.push(isEdit ? `/admin/events/${event.id}` : "/admin/events");
      } else {
        setError(result.error);
      }
    });
  }

  const inputClass =
    "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50";

  const currentCoverPath =
    !removeCover && !coverPreview ? (event?.cover_image_path ?? null) : null;
  // The URL to display: new local preview takes priority, then signed URL for existing
  const displayCoverUrl =
    coverPreview ?? (!removeCover ? coverSignedUrl : null);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {/* Nombre */}
      <div className="space-y-1">
        <Label.Root
          htmlFor="name"
          className="block text-sm font-medium text-neutral-300"
        >
          Nombre del evento
        </Label.Root>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={event?.name}
          disabled={isPending}
          className={inputClass}
          placeholder="Campeonato Nacional 2025"
        />
        {fieldErrors.name && (
          <p className="text-xs text-error-400">{fieldErrors.name}</p>
        )}
      </div>

      {/* Tipo */}
      <div className="space-y-1">
        <Label.Root
          htmlFor="event_type"
          className="block text-sm font-medium text-neutral-300"
        >
          Tipo de evento
        </Label.Root>
        <select
          id="event_type"
          name="event_type"
          required
          defaultValue={event?.event_type ?? ""}
          disabled={isPending}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
        >
          <option value="" disabled>
            Seleccionar tipo...
          </option>
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {fieldErrors.event_type && (
          <p className="text-xs text-error-400">{fieldErrors.event_type}</p>
        )}
      </div>

      {/* Fecha */}
      <div className="space-y-1">
        <Label.Root
          htmlFor="event_date"
          className="block text-sm font-medium text-neutral-300"
        >
          Fecha
        </Label.Root>
        <input
          id="event_date"
          name="event_date"
          type="date"
          required
          defaultValue={event?.event_date}
          disabled={isPending}
          className={inputClass}
        />
        {fieldErrors.event_date && (
          <p className="text-xs text-error-400">{fieldErrors.event_date}</p>
        )}
      </div>

      {/* Lugar */}
      <div className="space-y-1">
        <Label.Root
          htmlFor="location"
          className="block text-sm font-medium text-neutral-300"
        >
          Lugar <span className="text-neutral-500 font-normal">(opcional)</span>
        </Label.Root>
        <input
          id="location"
          name="location"
          type="text"
          defaultValue={event?.location ?? ""}
          disabled={isPending}
          className={inputClass}
          placeholder="Gimnasio Municipal, Santiago"
        />
      </div>

      {/* Descripción */}
      <div className="space-y-1">
        <Label.Root
          htmlFor="description"
          className="block text-sm font-medium text-neutral-300"
        >
          Descripción{" "}
          <span className="text-neutral-500 font-normal">(opcional)</span>
        </Label.Root>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={5000}
          defaultValue={event?.description ?? ""}
          disabled={isPending}
          className={`${inputClass} resize-y`}
          placeholder="Información detallada sobre el evento..."
        />
        {fieldErrors.description && (
          <p className="text-xs text-error-400">{fieldErrors.description}</p>
        )}
      </div>

      {/* Imagen de portada */}
      <div className="space-y-2">
        <Label.Root className="block text-sm font-medium text-neutral-300">
          Imagen de portada{" "}
          <span className="text-neutral-500 font-normal">(opcional)</span>
        </Label.Root>

        {/* Preview — shows signed URL for existing image or local blob for new selection */}
        {displayCoverUrl && (
          <Dialog.Root
            open={coverLightboxOpen}
            onOpenChange={setCoverLightboxOpen}
          >
            <div className="relative w-full h-40 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800">
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className="absolute inset-0 w-full h-full cursor-zoom-in focus:outline-none"
                  aria-label="Ver imagen en tamaño completo"
                >
                  <Image
                    src={displayCoverUrl}
                    alt="Preview portada"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
              </Dialog.Trigger>
              <button
                type="button"
                onClick={handleRemoveCover}
                disabled={isPending}
                className="absolute top-2 right-2 z-10 bg-neutral-900/80 hover:bg-error-600 text-neutral-300 hover:text-white px-2 py-1 rounded text-xs transition-colors"
              >
                Quitar
              </button>
            </div>

            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4 focus:outline-none">
                <Dialog.Title className="sr-only">
                  Imagen de portada
                </Dialog.Title>
                <div className="relative max-w-5xl max-h-[90vh] w-full h-full">
                  <Image
                    src={displayCoverUrl}
                    alt="Imagen de portada"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <Dialog.Close className="absolute top-4 right-4 z-50 bg-neutral-900/80 hover:bg-neutral-700 text-neutral-300 hover:text-white w-9 h-9 rounded-full flex items-center justify-center text-lg transition-colors">
                  ✕
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}

        {/* Skeleton while signed URL is loading */}
        {!displayCoverUrl && currentCoverPath && (
          <div className="w-full h-40 rounded-lg border border-neutral-700 bg-neutral-800 animate-pulse" />
        )}

        {!displayCoverUrl && !currentCoverPath && (
          <div
            className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center cursor-pointer hover:border-neutral-500 transition-colors"
            onClick={() => coverInputRef.current?.click()}
          >
            <p className="text-sm text-neutral-500">
              Haz clic para seleccionar una imagen
            </p>
            <p className="text-xs text-neutral-600 mt-1">
              JPG, PNG o WebP — máx. 10 MB
            </p>
          </div>
        )}

        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleCoverChange}
          disabled={isPending}
          className="hidden"
        />

        {(displayCoverUrl || currentCoverPath) && (
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={isPending}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            Reemplazar imagen
          </button>
        )}
      </div>

      {/* Documentos adjuntos */}
      <div className="space-y-2">
        <Label.Root className="block text-sm font-medium text-neutral-300">
          Documentos adjuntos{" "}
          <span className="text-neutral-500 font-normal">(opcional)</span>
        </Label.Root>

        {/* Existing attachments */}
        {existingAttachments.length > 0 && (
          <ul className="space-y-1">
            {existingAttachments.map((att) => (
              <li
                key={att.path}
                className="flex items-center justify-between px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm"
              >
                <span className="text-neutral-200 truncate flex-1 mr-2">
                  {att.name}
                </span>
                <span className="text-neutral-500 text-xs mr-3 shrink-0">
                  {formatBytes(att.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeExistingAttachment(att)}
                  disabled={isPending}
                  className="text-error-400 hover:text-error-300 text-xs shrink-0 transition-colors"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* New attachments queued */}
        {newAttachments.length > 0 && (
          <ul className="space-y-1">
            {newAttachments.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between px-3 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-lg text-sm"
              >
                <span className="text-neutral-300 truncate flex-1 mr-2">
                  {file.name}
                </span>
                <span className="text-neutral-500 text-xs mr-3 shrink-0">
                  {formatBytes(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeNewAttachment(i)}
                  disabled={isPending}
                  className="text-neutral-500 hover:text-error-400 text-xs shrink-0 transition-colors"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => attachInputRef.current?.click()}
          disabled={isPending}
          className="w-full px-3 py-2 border border-dashed border-neutral-700 rounded-lg text-sm text-neutral-500 hover:border-neutral-500 hover:text-neutral-400 transition-colors text-center"
        >
          + Agregar documento (PDF, DOC, DOCX)
        </button>

        <input
          ref={attachInputRef}
          type="file"
          accept="application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          onChange={handleAttachmentsChange}
          disabled={isPending}
          className="hidden"
        />
      </div>

      {/* Precio de inscripción */}
      <div className="space-y-2">
        <Label.Root
          htmlFor="registration_fee"
          className="block text-sm font-medium text-neutral-300"
        >
          Precio de inscripción{" "}
          <span className="text-neutral-500 font-normal">(opcional)</span>
        </Label.Root>
        <div className="flex items-center gap-3">
          <input
            id="registration_fee"
            name="registration_fee"
            type="number"
            min={0}
            step="0.01"
            defaultValue={
              event?.registration_fee != null
                ? event.registration_fee
                : undefined
            }
            disabled={isPending || isFree}
            className={`flex-1 ${inputClass}`}
            placeholder="0"
          />
          <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              disabled={isPending}
              className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-neutral-900"
            />
            Entrada libre
          </label>
        </div>
        {fieldErrors.registration_fee && (
          <p className="text-xs text-error-400">
            {fieldErrors.registration_fee}
          </p>
        )}
      </div>

      {/* Participantes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label.Root
            htmlFor="min_participants"
            className="block text-sm font-medium text-neutral-300"
          >
            Mínimo de participantes{" "}
            <span className="text-neutral-500 font-normal">(opcional)</span>
          </Label.Root>
          <input
            id="min_participants"
            name="min_participants"
            type="number"
            min={1}
            step={1}
            defaultValue={event?.min_participants ?? undefined}
            disabled={isPending}
            className={inputClass}
            placeholder="—"
          />
          {fieldErrors.min_participants && (
            <p className="text-xs text-error-400">
              {fieldErrors.min_participants}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label.Root
            htmlFor="max_participants"
            className="block text-sm font-medium text-neutral-300"
          >
            Máximo de participantes{" "}
            <span className="text-neutral-500 font-normal">(opcional)</span>
          </Label.Root>
          <input
            id="max_participants"
            name="max_participants"
            type="number"
            min={1}
            step={1}
            defaultValue={event?.max_participants ?? undefined}
            disabled={isPending}
            className={inputClass}
            placeholder="—"
          />
          {fieldErrors.max_participants && (
            <p className="text-xs text-error-400">
              {fieldErrors.max_participants}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="text-xs text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending
            ? isEdit
              ? "Guardando..."
              : "Creando..."
            : isEdit
              ? "Guardar cambios"
              : "Crear evento"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
