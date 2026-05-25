"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getUserNotificationsAction,
  markAsReadAction,
  markAllAsReadAction,
} from "@/modules/notifications/presentation/actions/notificationActions";
import { NotificationItem } from "@/modules/notifications/presentation/components/NotificationItem";
import { NotificationCategory } from "@/modules/notifications/domain/enums/notificationCategory";
import type { NotificationWithStatus } from "@/modules/notifications/domain/entities/notification";
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  Loader2,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS_PER_PAGE = 20;

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  [NotificationCategory.APPROVAL]: "Aprobaciones",
  [NotificationCategory.EVENT]: "Eventos",
  [NotificationCategory.CERTIFICATION]: "Certificaciones",
  [NotificationCategory.PAYMENT]: "Pagos",
  [NotificationCategory.SYSTEM]: "Sistema",
};

export function NotificationsList() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationWithStatus[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Filtros
  const [showOnlyUnread, setShowOnlyUnread] = useState<boolean>(false);
  const [selectedCategories, setSelectedCategories] = useState<
    NotificationCategory[]
  >([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  /**
   * Carga las notificaciones con los filtros aplicados
   */
  const fetchNotifications = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const offset = (page - 1) * ITEMS_PER_PAGE;

        // Construir parámetros omitiendo undefined para exactOptionalPropertyTypes
        const params: {
          onlyUnread: boolean;
          categories?: NotificationCategory[];
          limit: number;
          offset: number;
        } = {
          onlyUnread: showOnlyUnread,
          limit: ITEMS_PER_PAGE + 1, // +1 para saber si hay más
          offset,
        };

        // Solo agregar categories si hay categorías seleccionadas
        if (selectedCategories.length > 0) {
          params.categories = selectedCategories;
        }

        const data = await getUserNotificationsAction(params);

        // Verificar si hay más páginas
        const hasMorePages = data.length > ITEMS_PER_PAGE;
        setHasMore(hasMorePages);

        // Tomar solo los items de la página actual
        setNotifications(data.slice(0, ITEMS_PER_PAGE));
      } catch (error) {
        console.error(
          "[NotificationsList] Error fetching notifications:",
          error,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [showOnlyUnread, selectedCategories],
  );

  // Cargar notificaciones al montar y cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1);
    void fetchNotifications(1);
  }, [fetchNotifications]);

  /**
   * Maneja el click en una notificación
   */
  const handleNotificationClick = async (
    notification: NotificationWithStatus,
  ) => {
    if (notification.isRead) {
      // Si ya está leída, solo navegar
      if (notification.actionUrl) {
        router.push(notification.actionUrl);
      }
      return;
    }

    // Optimistic update: marcar como leída en UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
    );

    // Persistir en background
    void markAsReadAction(notification.id).catch((err) => {
      console.error("[handleNotificationClick] Failed to persist:", err);
      // Rollback UI si falla
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: false } : n,
        ),
      );
    });

    // Navegar si existe actionUrl
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  /**
   * Marca todas las notificaciones como leídas
   */
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.isRead);
    if (unreadNotifications.length === 0) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    // Persistir en background
    void markAllAsReadAction().catch((err) => {
      console.error("[handleMarkAllAsRead] Failed to persist:", err);
    });
  };

  /**
   * Maneja el toggle de categorías
   */
  const handleCategoryToggle = (category: NotificationCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  /**
   * Navegación de paginación
   */
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      void fetchNotifications(newPage);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      void fetchNotifications(newPage);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* Barra de acciones y filtros */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Acciones */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                showFilters
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700",
              )}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {(showOnlyUnread || selectedCategories.length > 0) && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar todas como leídas ({unreadCount})
              </button>
            )}
          </div>

          {/* Estadísticas */}
          <div className="text-sm text-neutral-400">
            {notifications.length > 0 && (
              <span>
                Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                {(currentPage - 1) * ITEMS_PER_PAGE + notifications.length}
              </span>
            )}
          </div>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-neutral-800 space-y-4">
            {/* Filtro solo no leídas */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyUnread}
                  onChange={(e) => setShowOnlyUnread(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 focus:ring-2"
                />
                <span className="text-sm text-neutral-300">Solo no leídas</span>
              </label>
            </div>

            {/* Filtro por categorías */}
            <div>
              <p className="text-sm font-medium text-neutral-300 mb-2">
                Categorías
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.values(NotificationCategory).map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryToggle(category)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors border",
                      selectedCategories.includes(category)
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-neutral-800 text-neutral-400 hover:text-neutral-300 border-neutral-700 hover:border-neutral-600",
                    )}
                  >
                    {CATEGORY_LABELS[category]}
                  </button>
                ))}
              </div>
            </div>

            {/* Limpiar filtros */}
            {(showOnlyUnread || selectedCategories.length > 0) && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowOnlyUnread(false);
                    setSelectedCategories([]);
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-400 transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de notificaciones */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-16 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-400">
              Cargando notificaciones...
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <Bell className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-sm text-neutral-400">
              {showOnlyUnread || selectedCategories.length > 0
                ? "No hay notificaciones que coincidan con los filtros"
                : "No tienes notificaciones"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full text-left hover:bg-neutral-800/50 transition-colors"
                >
                  <NotificationItem notification={notification} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Paginación */}
      {!isLoading && notifications.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={cn(
              "inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-md transition-colors border",
              currentPage === 1
                ? "bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border-neutral-700",
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <div className="px-4 py-2 text-sm text-neutral-400">
            Página {currentPage}
          </div>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={!hasMore}
            className={cn(
              "inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-md transition-colors border",
              !hasMore
                ? "bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border-neutral-700",
            )}
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
