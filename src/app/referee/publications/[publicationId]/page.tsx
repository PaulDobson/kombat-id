// Server Component — no "use client"
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SupabaseRefereePortalPublicationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereePortalPublicationRepository";
import { SupabaseRefereeEventRegistrationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereeEventRegistrationRepository";
import { EventRegistrationButton } from "@/modules/referee-registration/presentation/components/EventRegistrationButton";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const BUCKET = "referee-portal-images";

function buildCoverImageUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

const CATEGORY_LABELS = {
  news: "Noticias",
  regulation: "Reglamento",
  championship: "Campeonato",
} as const;

const CATEGORY_BADGE: Record<string, string> = {
  news: "bg-blue-900/40 text-blue-300 border-blue-700/40",
  regulation: "bg-amber-900/40 text-amber-300 border-amber-700/40",
  championship: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
};

/**
 * Converts a subset of Markdown to HTML-safe JSX-friendly plain text lines.
 * We render it as structured paragraphs without a heavy markdown library.
 */
function renderBody(body: string): React.ReactNode {
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line) {
      elements.push(<div key={key++} className="h-3" />);
      continue;
    }

    // Heading levels
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    const bullet = line.match(/^[-*+]\s+(.*)/);

    if (h1) {
      elements.push(
        <h3
          key={key++}
          className="text-lg font-bold text-neutral-100 mt-4 mb-1"
        >
          {inlineFormat(h1[1]!)}
        </h3>,
      );
    } else if (h2) {
      elements.push(
        <h4
          key={key++}
          className="text-base font-semibold text-neutral-200 mt-3 mb-1"
        >
          {inlineFormat(h2[1]!)}
        </h4>,
      );
    } else if (h3) {
      elements.push(
        <h5
          key={key++}
          className="text-sm font-semibold text-neutral-300 mt-2 mb-0.5"
        >
          {inlineFormat(h3[1]!)}
        </h5>,
      );
    } else if (bullet) {
      elements.push(
        <div
          key={key++}
          className="flex items-start gap-2 text-sm text-neutral-300 leading-relaxed"
        >
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neutral-500 shrink-0" />
          <span>{inlineFormat(bullet[1]!)}</span>
        </div>,
      );
    } else {
      elements.push(
        <p key={key++} className="text-sm text-neutral-300 leading-relaxed">
          {inlineFormat(line)}
        </p>,
      );
    }
  }

  return <>{elements}</>;
}

/** Apply bold/italic inline formatting */
function inlineFormat(text: string): React.ReactNode {
  // Split on **bold** and *italic* markers
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="text-neutral-100 font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={i} className="text-neutral-200 italic">
              {part.slice(1, -1)}
            </em>
          );
        }
        return part;
      })}
    </>
  );
}

interface Props {
  params: Promise<{ publicationId: string }>;
}

export default async function PublicationDetailPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { publicationId } = await params;

  const publicationRepo = new SupabaseRefereePortalPublicationRepository();
  const publication = await publicationRepo.findById(publicationId);
  if (!publication) notFound();

  const coverImageUrl = publication.coverImagePath
    ? buildCoverImageUrl(publication.coverImagePath)
    : null;

  // For events: fetch registration state and count
  let isRegistered = false;
  let registrationCount = 0;
  let isDeadlinePassed = false;
  let isFull = false;
  let spotsLeft: number | null = null;

  if (publication.isEvent) {
    const registrationRepo = new SupabaseRefereeEventRegistrationRepository();
    const [existing, count] = await Promise.all([
      registrationRepo.findByPublicationAndReferee(publicationId, user.id),
      registrationRepo.countByPublication(publicationId),
    ]);
    isRegistered = !!existing;
    registrationCount = count;

    if (publication.registrationDeadline) {
      isDeadlinePassed =
        new Date(publication.registrationDeadline + "T23:59:59") < new Date();
    }
    if (publication.maxParticipants !== null) {
      isFull = registrationCount >= publication.maxParticipants;
      spotsLeft = Math.max(0, publication.maxParticipants - registrationCount);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back link */}
      <Link
        href="/referee/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Publicaciones
      </Link>

      {/* Cover image */}
      {coverImageUrl && (
        <div className="w-full h-56 rounded-xl overflow-hidden bg-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {publication.isEvent && (
            <span className="text-xs font-bold text-emerald-300 bg-emerald-900/40 border border-emerald-700/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              🏆 Evento
            </span>
          )}
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${CATEGORY_BADGE[publication.category]}`}
          >
            {CATEGORY_LABELS[publication.category]}
          </span>
          <span className="text-xs text-neutral-600">
            {new Date(publication.publishedAt).toLocaleDateString("es-CL", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-neutral-50 leading-tight">
          {publication.title}
        </h1>
      </div>

      {/* Event details card */}
      {publication.isEvent && (
        <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/10 p-5 space-y-4">
          <div className="space-y-2.5">
            {publication.eventDate && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-neutral-500 w-4 text-center shrink-0">
                  📅
                </span>
                <span className="text-neutral-200 font-medium">
                  {new Date(
                    publication.eventDate + "T00:00:00",
                  ).toLocaleDateString("es-CL", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
            {publication.eventLocation && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-neutral-500 w-4 text-center shrink-0">
                  📍
                </span>
                <span className="text-neutral-300">
                  {publication.eventLocation}
                </span>
              </div>
            )}
            {publication.registrationDeadline && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-neutral-500 w-4 text-center shrink-0">
                  ⏰
                </span>
                <span
                  className={
                    isDeadlinePassed
                      ? "text-neutral-500 line-through"
                      : "text-neutral-300"
                  }
                >
                  Inscripciones hasta el{" "}
                  {new Date(
                    publication.registrationDeadline + "T00:00:00",
                  ).toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {isDeadlinePassed && " (cerrado)"}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-neutral-500 w-4 text-center shrink-0">
                👥
              </span>
              <span className="text-neutral-300">
                {registrationCount} inscrito{registrationCount !== 1 ? "s" : ""}
                {publication.maxParticipants
                  ? ` de ${publication.maxParticipants} cupos`
                  : " (sin límite de cupos)"}
              </span>
            </div>
          </div>

          {/* Capacity bar */}
          {publication.maxParticipants !== null && (
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isFull ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{
                    width: `${Math.min(100, (registrationCount / publication.maxParticipants) * 100)}%`,
                  }}
                />
              </div>
              {!isFull && spotsLeft !== null && (
                <p className="text-xs text-emerald-400">
                  {spotsLeft} cupo{spotsLeft !== 1 ? "s" : ""} disponible
                  {spotsLeft !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* Registration button */}
          <EventRegistrationButton
            publicationId={publication.id}
            isRegistered={isRegistered}
            isDeadlinePassed={isDeadlinePassed}
            isFull={isFull}
          />
        </div>
      )}

      {/* Body content */}
      <div className="space-y-1 pb-8">{renderBody(publication.body)}</div>
    </div>
  );
}
