export interface AuditLogEntry {
  id?: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface AuditLogRepository {
  log(entry: AuditLogEntry): Promise<void>;
  findByAdmin(adminId: string, limit?: number): Promise<AuditLogEntry[]>;
}
