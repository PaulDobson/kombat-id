import { requireUser } from "@/lib/supabase/server";
import { NotificationsList } from "./NotificationsList";
import { Bell } from "lucide-react";

/**
 * Página de notificaciones completa
 * Muestra todas las notificaciones del usuario con filtros y paginación
 */
export default async function NotificationsPage() {
  // Proteger la ruta - requiere autenticación
  await requireUser();

  return (
    <div className="min-h-screen bg-neutral-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-100">
              Notificaciones
            </h1>
          </div>
          <p className="text-neutral-400 text-sm">
            Mantente al día con todas tus notificaciones y actualizaciones
          </p>
        </div>

        {/* Lista de notificaciones con filtros y paginación */}
        <NotificationsList />
      </div>
    </div>
  );
}
