/**
 * Storage helpers for event files (cover images and attachments).
 *
 * Uses the browser Supabase client so uploads happen client-side from forms.
 * The bucket `event-files` is private — signed URLs are used for reads.
 */

import { createClient } from "@/lib/supabase/client";

const BUCKET = "event-files";
const SIGNED_URL_EXPIRES_IN = 3600; // 1 hour

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AttachmentMeta {
  name: string;
  path: string;
  size: number;
  type: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// ---------------------------------------------------------------------------
// Upload cover image
// ---------------------------------------------------------------------------

export async function uploadEventCoverImage(
  eventId: string,
  file: File,
): Promise<{ path: string; error: string | null }> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `cover_${Date.now()}.${ext}`;
  const storagePath = `events/${eventId}/cover/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error("[uploadEventCoverImage]", error);
    return { path: "", error: error.message };
  }

  return { path: storagePath, error: null };
}

// ---------------------------------------------------------------------------
// Upload attachment
// ---------------------------------------------------------------------------

export async function uploadEventAttachment(
  eventId: string,
  file: File,
): Promise<AttachmentMeta & { error: string | null }> {
  const supabase = createClient();
  const safeName = sanitizeFilename(file.name);
  const storagePath = `events/${eventId}/attachments/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type });

  if (error) {
    console.error("[uploadEventAttachment]", error);
    return {
      name: file.name,
      path: "",
      size: file.size,
      type: file.type,
      error: error.message,
    };
  }

  return {
    name: file.name,
    path: storagePath,
    size: file.size,
    type: file.type,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Get signed URL (bucket is private)
// ---------------------------------------------------------------------------

export async function getEventFileUrl(storagePath: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRES_IN);

  if (error || !data?.signedUrl) {
    console.error("[getEventFileUrl]", error);
    return "";
  }

  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Delete file
// ---------------------------------------------------------------------------

export async function deleteEventFile(storagePath: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) {
    console.error("[deleteEventFile]", error);
  }
}
