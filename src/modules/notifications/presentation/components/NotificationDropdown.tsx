"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getUserNotificationsAction,
  markAsReadAction,
  markAllAsReadAction,
} from "../actions/notificationActions";

import { X } from "lucide-react";
import { NotificationWithStatus } from "../../domain/entities/notification";
import { NotificationItem } from "./NotificationItem";

interface NotificationDropdownProps {
  onClose: () => void;
  onBadgeUpdate: (decrement: number) => void;
}

export function NotificationDropdown({
  onClose,
  onBadgeUpdate,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<NotificationWithStatus[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Cargar notificaciones al montar
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await getUserNotificationsAction({ limit: 10 });
        setNotifications(data);
      } catch (error) {
        console.error(
          "[NotificationDropdown] Error fetching notifications:",
          error,
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchNotifications();
  }, []);

  // Detectar click fuera del dropdown para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  /**
   * Maneja el click en una notificación:
   * 1. Actualiza UI optimísticamente
   * 2. Notifica al badge inmediatamente
   * 3. Persiste en background (no bloquea)
   * 4. Navega si tiene actionUrl
   */
  const handleNotificationClick = async (
    notification: NotificationWithStatus,
  ) => {
    if (notification.isRead) {
      // Si ya está leída, solo navegar
      if (notification.actionUrl) {
        router.push(notification.actionUrl);
      }
      onClose();
      return;
    }

    // 1. Optimistic update: marcar como leída en UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
    );

    // 2. Actualizar badge inmediatamente
    onBadgeUpdate(1);

    // 3. Persistir en background (no await para no bloquear)
    void markAsReadAction(notification.id).catch((err) => {
      console.error("[handleNotificationClick] Failed to persist:", err);
      // Rollback UI si falla (opcional)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: false } : n,
        ),
      );
      onBadgeUpdate(-1); // Revertir badge
    });

    // 4. Navegar si existe actionUrl
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }

    onClose();
  };

  /**
   * Marca todas las notificaciones como leídas
   */
  const handleMarkAllAsRead = async () => {
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    if (unreadCount === 0) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    // Actualizar badge
    onBadgeUpdate(unreadCount);

    // Persistir en background
    void markAllAsReadAction().catch((err) => {
      console.error("[handleMarkAllAsRead] Failed to persist:", err);
    });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 max-h-[32rem] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-200">
          Notificaciones
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-500 hover:text-neutral-200 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      {unreadCount > 0 && (
        <div className="px-4 py-2 border-b border-neutral-800 bg-neutral-900/50">
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Marcar todas como leídas
          </button>
        </div>
      )}

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-neutral-500">
            Cargando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-neutral-500">
            No tienes notificaciones
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full text-left"
                >
                  <NotificationItem notification={notification} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-neutral-800 bg-neutral-900/50 text-center">
          <button
            type="button"
            onClick={() => {
              router.push("/notifications");
              onClose();
            }}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Ver todas las notificaciones
          </button>
        </div>
      )}
    </div>
  );
}
