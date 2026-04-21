import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { EventForm } from "../../EventForm";
import type {
  EventType,
  EventAttachment,
  Database,
} from "@/types/database.types";

type MartialEventRow = Database["public"]["Tables"]["martial_events"]["Row"];

interface MartialEventWithAttachments {
  id: string;
  name: string;
  event_type: EventType;
  event_date: string;
  location: string | null;
  description: string | null;
  registration_fee: number | null;
  min_participants: number | null;
  max_participants: number | null;
  cover_image_path: string | null;
  attachments: EventAttachment[];
  created_by: string;
  created_at: string;
}

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect("/");
  return user;
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireAdminUser();
  const { eventId } = await params;

  const { data } = (await adminSupabase
    .from("martial_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle()) as { data: MartialEventRow | null };

  if (!data) notFound();

  const event: MartialEventWithAttachments = {
    ...data,
    event_type: data.event_type as EventType,
    attachments: (data.attachments || []) as unknown as EventAttachment[],
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href={`/admin/events/${eventId}`}
          className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver al evento
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50 mt-2">
          Editar evento
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5">{event.name}</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <EventForm event={event} />
      </div>
    </main>
  );
}
