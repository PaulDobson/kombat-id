"use client";

import { Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { getUnreadCountAction } from "../actions/notificationActions";
import { NotificationDropdown } from "./NotificationDropdown";

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Cargar el contador inicial y configurar polling
  useEffect(() => {
    let isMounted = true;
    let inFlight = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      if (!isMounted) return;
      timerId = setTimeout(() => {
        void fetchUnreadCount();
      }, POLL_INTERVAL_MS);
    };

    const fetchUnreadCount = async () => {
      if (!isMounted || inFlight) return;

      // Evita trabajo cuando la pestaña no está visible o no hay red.
      if (document.visibilityState !== "visible" || !navigator.onLine) {
        scheduleNext();
        return;
      }

      inFlight = true;
      try {
        const count = await getUnreadCountAction();
        if (isMounted) {
          setUnreadCount(count);
        }
      } catch (error) {
        console.error("[NotificationBell] Error fetching unread count:", error);
      } finally {
        inFlight = false;
        if (isMounted) {
          setIsLoading(false);
          scheduleNext();
        }
      }
    };

    void fetchUnreadCount();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (timerId) clearTimeout(timerId);
        void fetchUnreadCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timerId) clearTimeout(timerId);
    };
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
