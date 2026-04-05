import "server-only";

import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { Database } from "@/types/database.types";
import type {
  AuditLogRepository,
  AuditLogEntry,
} from "../../domain/interfaces/auditLogRepository";

// ---------------------------------------------------------------------------
// Typed aliases
// ---------------------------------------------------------------------------

type AuditLogRow = Database["public"]["Tables"]["audit_log"]["Row"];

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class DrizzleAuditLogRepository implements AuditLogRepository {
  async log(entry: AuditLogEntry): Promise<void> {
    const { error } = await adminSupabase.from("audit_log").insert({
      admin_id: entry.adminId,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId ?? null,
      metadata: entry.metadata ?? null,
    } as unknown as never);

    if (error) {
      throw new DomainError(
        `Failed to write audit log entry: ${error.message}`,
      );
    }
  }

  async findByAdmin(adminId: string, limit = 50): Promise<AuditLogEntry[]> {
    const { data, error } = await adminSupabase
      .from("audit_log")
      .select("*")
      .eq("admin_id", adminId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new DomainError(
        `Failed to find audit log entries by admin: ${error.message}`,
      );
    }

    return ((data as AuditLogRow[]) ?? []).map((row) => this.toEntity(row));
  }

  // -------------------------------------------------------------------------
  // Private mapping helpers
  // -------------------------------------------------------------------------

  private toEntity(row: AuditLogRow): AuditLogEntry {
    return {
      id: row.id,
      adminId: row.admin_id,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id ?? undefined,
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      createdAt: row.created_at,
    };
  }
}
