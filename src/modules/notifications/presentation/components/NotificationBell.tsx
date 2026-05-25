"use client";

import { Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { getUnreadCountAction } from "../actions/notificationActions";
import { NotificationDropdown } from "./NotificationDropdown";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Cargar el contador inicial y configurar polling
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await getUnreadCountAction();
        setUnreadCount(count);
      } catch (error) {
        console.error("[NotificationBell] Error fetching unread count:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchUnreadCount();

    // Polling cada 30 segundos para sincronizar el badge
    const interval = setInterval(() => {
      void fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Callback para actualizar el badge inmediatamente cuando se marque como leída
   * Patrón optimistic update: UI se actualiza antes que la base de datos
   */
  const handleBadgeUpdate = (decrement: number) => {
    setUnreadCount((prev) => Math.max(0, prev - decrement));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-neutral-400 hover:text-neutral-200 transition-colors duration-150 rounded-md hover:bg-neutral-800/60"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {!isLoading && unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
          onBadgeUpdate={handleBadgeUpdate}
        />
      )}
    </div>
  );
}
