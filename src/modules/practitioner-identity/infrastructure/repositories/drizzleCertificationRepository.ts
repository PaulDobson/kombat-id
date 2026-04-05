import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { Database } from "@/types/database.types";
import type {
  Certification,
  CertType,
  PractitionerSnapshot,
} from "../../domain/entities/certification";
import type { CertificationRepository } from "../../domain/interfaces/certificationRepository";

// ---------------------------------------------------------------------------
// Typed aliases
// ---------------------------------------------------------------------------

type CertificationRow = Database["public"]["Tables"]["certifications"]["Row"];
type CertificationInsert =
  Database["public"]["Tables"]["certifications"]["Insert"];

// ---------------------------------------------------------------------------
// Zod schema for validating the practitioner_snapshot JSONB field (Req 8.4)
// ---------------------------------------------------------------------------

const PractitionerSnapshotSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  rut: z.string().min(1),
  grade: z.enum(["white", "yellow", "green", "blue", "red", "black"]),
  dan: z.number().int().min(1).max(9).nullable(),
  snapshotAt: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class DrizzleCertificationRepository implements CertificationRepository {
  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(certId: string): Promise<Certification | null> {
    const { data, error } = await adminSupabase
      .from("certifications")
      .select("*")
      .eq("id", certId)
      .maybeSingle();

    if (error)
      throw new DomainError(
        `Failed to find certification by id: ${error.message}`,
      );
    if (!data) return null;

    return this.fromRow(data as CertificationRow);
  }

  async findByPractitioner(publicId: string): Promise<Certification[]> {
    const { data, error } = await adminSupabase
      .from("certifications")
      .select("*")
      .eq("practitioner_id", publicId)
      .order("issued_at", { ascending: false });

    if (error)
      throw new DomainError(
        `Failed to find certifications for practitioner: ${error.message}`,
      );

    return ((data as CertificationRow[]) ?? []).map((row) => this.fromRow(row));
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  async save(cert: Certification): Promise<void> {
    const row = this.toRow(cert);

    const { error } = await adminSupabase
      .from("certifications")
      .upsert(row as unknown as never);

    if (error)
      throw new DomainError(`Failed to save certification: ${error.message}`);
  }

  async revoke(certId: string, reason: string, adminId: string): Promise<void> {
    const { error } = await adminSupabase
      .from("certifications")
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
        revocation_reason: reason,
        revoked_by: adminId,
      } as unknown as never)
      .eq("id", certId);

    if (error)
      throw new DomainError(`Failed to revoke certification: ${error.message}`);
  }

  // -------------------------------------------------------------------------
  // Private mapping helpers
  // -------------------------------------------------------------------------

  /**
   * Validates the practitioner_snapshot JSONB field with Zod and maps the row
   * to a domain entity. Throws DomainError if validation fails (Req 8.4).
   */
  private fromRow(row: CertificationRow): Certification {
    const snapshotParsed = PractitionerSnapshotSchema.safeParse(
      row.practitioner_snapshot,
    );

    if (!snapshotParsed.success) {
      throw new DomainError(
        `Certification practitioner_snapshot failed schema validation: ${snapshotParsed.error.message}`,
      );
    }

    return this.toEntity(row);
  }

  private toEntity(row: CertificationRow): Certification {
    return {
      id: row.id,
      practitionerId: row.practitioner_id,
      certType: row.cert_type as CertType,
      issuedAt: row.issued_at,
      issuedBy: row.issued_by,
      isRevoked: row.is_revoked,
      revokedAt: row.revoked_at,
      revocationReason: row.revocation_reason,
      revokedBy: row.revoked_by,
      practitionerSnapshot: row.practitioner_snapshot as PractitionerSnapshot,
      notes: row.notes,
    };
  }

  private toRow(cert: Certification): CertificationInsert {
    return {
      id: cert.id,
      practitioner_id: cert.practitionerId,
      cert_type: cert.certType,
      issued_at: cert.issuedAt,
      issued_by: cert.issuedBy,
      is_revoked: cert.isRevoked,
      revoked_at: cert.revokedAt,
      revocation_reason: cert.revocationReason,
      revoked_by: cert.revokedBy,
      practitioner_snapshot: cert.practitionerSnapshot,
      notes: cert.notes,
    };
  }
}
