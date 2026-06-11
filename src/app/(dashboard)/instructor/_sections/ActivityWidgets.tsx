import Link from "next/link";
import {
  GraduationCap,
  CalendarDays,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileEdit,
  Swords,
  BookOpen,
} from "lucide-react";
import { formatDateShort } from "@/lib/format-date";

// ── Types ────────────────────────────────────────────────────────────────────

interface RecentExam {
  id: string;
  practitionerName: string;
  fromGrade: string;
  toGrade: string;
  status: string;
  examDate: string;
}

interface UpcomingEvent {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  location: string | null;
}

interface Props {
  recentExams: RecentExam[];
  upcomingEvents: UpcomingEvent[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const GRADE_DOT: Record<string, string> = {
  white: "bg-white border border-neutral-600",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
  black: "bg-neutral-900 border border-neutral-500",
};

const EXAM_STATUS_STYLES: Record<string, string> = {
  draft: "text-neutral-400",
  submitted: "text-blue-400",
  pending_authorization: "text-amber-400",
  approved: "text-emerald-400",
  rejected: "text-rose-400",
};

const EXAM_STATUS_ICON: Record<string, React.ElementType> = {
  draft: FileEdit,
  submitted: Clock,
  pending_authorization: AlertCircle,
  approved: CheckCircle,
  rejected: XCircle,
};

const EXAM_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  pending_authorization: "Pendiente auth.",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const EVENT_TYPE_STYLES: Record<string, string> = {
  competition:
    "bg-primary-500/10 text-primary-400 border border-primary-500/20",
  seminar: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  exam: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  competition: "Competencia",
  seminar: "Seminario",
  exam: "Examen",
};

const EVENT_TYPE_ICON: Record<string, React.ElementType> = {
  competition: Swords,
  seminar: BookOpen,
  exam: GraduationCap,
};

// ── Component ────────────────────────────────────────────────────────────────

export function ActivityWidgets({ recentExams, upcomingEvents }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Widget: Últimos exámenes */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-100">
              Últimos exámenes
            </h3>
          </div>
          <Link
            href="/instructor/grade-exams"
            className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <GraduationCap className="w-8 h-8 text-neutral-700" />
            <p className="text-xs text-neutral-500">Sin exámenes recientes</p>
            <Link
              href="/instructor/grade-exams/new"
              className="mt-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              + Iniciar primer examen
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {recentExams.map((exam) => {
              const StatusIcon = EXAM_STATUS_ICON[exam.status] ?? Clock;
              const statusColor =
                EXAM_STATUS_STYLES[exam.status] ?? "text-neutral-400";
              const fromDot = GRADE_DOT[exam.fromGrade] ?? "bg-neutral-600";
              const toDot = GRADE_DOT[exam.toGrade] ?? "bg-neutral-600";

              return (
                <li key={exam.id}>
                  <Link
                    href={`/instructor/grade-exams/${exam.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-800/40 transition-colors"
                  >
                    {/* Grade transition dots */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`w-2.5 h-2.5 rounded-full ${fromDot}`} />
                      <ArrowRight className="w-3 h-3 text-neutral-600" />
                      <span className={`w-2.5 h-2.5 rounded-full ${toDot}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-200 font-medium truncate">
                        {exam.practitionerName}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {GRADE_LABELS[exam.fromGrade] ?? exam.fromGrade} →{" "}
                        {GRADE_LABELS[exam.toGrade] ?? exam.toGrade} ·{" "}
                        {formatDateShort(exam.examDate)}
                      </p>
                    </div>

                    <div
                      className={`flex items-center gap-1 shrink-0 text-xs font-medium ${statusColor}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {EXAM_STATUS_LABELS[exam.status] ?? exam.status}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Widget: Próximos eventos */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-primary-400/10 flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5 text-primary-400" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-100">
              Próximos eventos
            </h3>
          </div>
          <Link
            href="/instructor/events"
            className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <CalendarDays className="w-8 h-8 text-neutral-700" />
            <p className="text-xs text-neutral-500">
              No hay eventos próximos disponibles
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {upcomingEvents.map((event) => {
              const badgeStyle =
                EVENT_TYPE_STYLES[event.eventType] ??
                "bg-neutral-800 text-neutral-400 border border-neutral-700";
              const TypeIcon = EVENT_TYPE_ICON[event.eventType] ?? CalendarDays;

              return (
                <li key={event.id}>
                  <Link
                    href={`/instructor/events`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-800/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                      <TypeIcon className="w-4 h-4 text-neutral-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-200 font-medium truncate">
                        {event.name}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {formatDateShort(event.eventDate)}
                        {event.location && ` · ${event.location}`}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${badgeStyle}`}
                    >
                      {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
