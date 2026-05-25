"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  Award,
  CreditCard,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { NotificationWithStatus } from "../../domain/entities/notification";
import { NotificationCategory } from "../../domain/enums/notificationCategory";
import { NotificationPriority } from "../../domain/enums/notificationPriority";

interface NotificationItemProps {
  notification: NotificationWithStatus;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  // Mapeo de categorías a iconos
  const iconMap = {
    [NotificationCategory.APPROVAL]: AlertCircle,
    [NotificationCategory.EVENT]: Calendar,
    [NotificationCategory.CERTIFICATION]: Award,
    [NotificationCategory.PAYMENT]: CreditCard,
    [NotificationCategory.SYSTEM]: Settings,
  };

  const Icon = iconMap[notification.category] ?? Settings;

  // Mapeo de prioridades a colores
  const priorityColorMap = {
    [NotificationPriority.LOW]: "border-neutral-700",
    [NotificationPriority.NORMAL]: "border-blue-500",
    [NotificationPriority.HIGH]: "border-orange-500",
    [NotificationPriority.URGENT]: "border-red-500",
  };

  const priorityColor = priorityColorMap[notification.priority];

  // Estilos condicionales según estado de lectura
  const bgClass = notification.isRead
    ? "bg-neutral-900/50 hover:bg-neutral-800/50"
    : "bg-neutral-900 hover:bg-neutral-800";

  const titleClass = notification.isRead
    ? "text-neutral-400"
    : "text-neutral-200 font-semibold";

  const messageClass = notification.isRead
    ? "text-neutral-500"
    : "text-neutral-400";

  const timeClass = "text-neutral-600 text-xs";

  return (
    <div
      className={cn(
        "px-4 py-3 transition-colors duration-150 border-l-4",
        bgClass,
        priorityColor,
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icono */}
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            notification.isRead ? "bg-neutral-800" : "bg-blue-900/40",
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4",
              notification.isRead ? "text-neutral-500" : "text-blue-400",
            )}
          />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-sm", titleClass)}>{notification.title}</p>
            {!notification.isRead && (
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
            )}
          </div>
          <p className={cn("text-xs mt-0.5 line-clamp-2", messageClass)}>
            {notification.message}
          </p>
          <p className={cn("mt-1", timeClass)}>
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        </div>

        {/* Arrow si hay action */}
        {notification.actionLabel && (
          <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0 mt-1" />
        )}
      </div>
    </div>
  );
}
