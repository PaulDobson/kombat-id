import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { Database } from "@/types/database.types";
import type {
  Charge,
  ChargeStatus,
  ChargeType,
  Currency,
} from "../../domain/entities/charge";
import type { ChargeRepository } from "../../domain/interfaces/chargeRepository";

// ---------------------------------------------------------------------------
// Typed aliases
// ---------------------------------------------------------------------------

type ChargeRow = Database["public"]["Tables"]["charges"]["Row"];
type ChargeInsert = Database["public"]["Tables"]["charges"]["Insert"];

// ---------------------------------------------------------------------------
// Zod schema for validating rows read from the DB (Req 8.4)
// ---------------------------------------------------------------------------

const ChargeRowSchema = z.object({
  id: z.string().uuid(),
  practitioner_id: z.string().uuid(),
  charge_type: z.enum([
    "examen_grado",
    "membresia_anual",
    "licencia_competencia",
  ]),
  amount: z.number(),
  currency: z.enum(["CLP", "USD"]),
  status: z.enum(["pendiente", "pagado", "vencido", "exento"]),
  due_date: z.string().min(1),
  period_start: z.string().min(1),
  period_end: z.string().min(1),
  paid_at: z.string().nullable(),
  payment_reference: z.string().nullable(),
  exemption_reason: z.string().nullable(),
  exempted_by: z.string().nullable(),
  created_by: z.string().uuid(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class DrizzleChargeRepository implements ChargeRepository {
  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(id: string): Promise<Charge | null> {
    const { data, error } = await adminSupabase
      .from("charges")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error)
      throw new DomainError(`Failed to find charge by id: ${error.message}`);
    if (!data) return null;

    return this.fromRow(data as ChargeRow);
  }

  async findByPractitioner(practitionerId: string): Promise<Charge[]> {
    const { data, error } = await adminSupabase
      .from("charges")
      .select("*")
      .eq("practitioner_id", practitionerId)
      .order("created_at", { ascending: false });

    if (error)
      throw new DomainError(
        `Failed to find charges for practitioner: ${error.message}`,
      );

    return ((data as ChargeRow[]) ?? []).map((row) => this.fromRow(row));
  }

  async findPendingByPractitionerAndType(
    practitionerId: string,
    chargeType: ChargeType,
  ): Promise<Charge[]> {
    const { data, error } = await adminSupabase
      .from("charges")
      .select("*")
      .eq("practitioner_id", practitionerId)
      .eq("charge_type", chargeType)
      .eq("status", "pendiente");

    if (error)
      throw new DomainError(
        `Failed to find pending charges by type: ${error.message}`,
      );

    return ((data as ChargeRow[]) ?? []).map((row) => this.fromRow(row));
  }

  async findBlockingCharges(
    practitionerId: string,
    chargeType: ChargeType,
  ): Promise<Charge[]> {
    const { data, error } = await adminSupabase
      .from("charges")
      .select("*")
      .eq("practitioner_id", practitionerId)
      .eq("charge_type", chargeType)
      .in("status", ["pendiente", "vencido"]);

    if (error)
      throw new DomainError(
        `Failed to find blocking charges: ${error.message}`,
      );

    return ((data as ChargeRow[]) ?? []).map((row) => this.fromRow(row));
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  async save(charge: Charge): Promise<void> {
    const row = this.toRow(charge);

    const { error } = await adminSupabase
      .from("charges")
      .upsert(row as unknown as never);

    if (error) throw new DomainError(`Failed to save charge: ${error.message}`);
  }

  async updateStatus(
    id: string,
    status: ChargeStatus,
    metadata?: {
      paidAt?: string;
      paymentReference?: string;
      exemptionReason?: string;
      exemptedBy?: string;
    },
  ): Promise<void> {
    const now = new Date().toISOString();

    const update: Record<string, unknown> = {
      status,
      updated_at: now,
    };

    if (metadata?.paidAt !== undefined) update.paid_at = metadata.paidAt;
    if (metadata?.paymentReference !== undefined)
      update.payment_reference = metadata.paymentReference;
    if (metadata?.exemptionReason !== undefined)
      update.exemption_reason = metadata.exemptionReason;
    if (metadata?.exemptedBy !== undefined)
      update.exempted_by = metadata.exemptedBy;

    const { error } = await adminSupabase
      .from("charges")
      .update(update as unknown as never)
      .eq("id", id);

    if (error)
      throw new DomainError(`Failed to update charge status: ${error.message}`);
  }

  /**
   * Req 12.4 — Marks all pending charges whose due_date is before referenceDate
   * as 'vencido'. Returns the count of updated records.
   */
  async expireOverdue(referenceDate: string): Promise<number> {
    const now = new Date().toISOString();

    const { data, error } = await adminSupabase
      .from("charges")
      .update({ status: "vencido", updated_at: now } as unknown as never)
      .eq("status", "pendiente")
      .lt("due_date", referenceDate)
      .select("id");

    if (error)
      throw new DomainError(
        `Failed to expire overdue charges: ${error.message}`,
      );

    return (data ?? []).length;
  }

  // -------------------------------------------------------------------------
  // Private mapping helpers
  // -------------------------------------------------------------------------

  private fromRow(row: ChargeRow): Charge {
    const parsed = ChargeRowSchema.safeParse(row);

    if (!parsed.success) {
      throw new DomainError(
        `Charge row failed schema validation: ${parsed.error.message}`,
      );
    }

    return this.toEntity(parsed.data as ChargeRow);
  }

  private toEntity(row: ChargeRow): Charge {
    return {
      id: row.id,
      practitionerId: row.practitioner_id,
      chargeType: row.charge_type as ChargeType,
      amount: row.amount,
      currency: row.currency as Currency,
      status: row.status as ChargeStatus,
      dueDate: row.due_date,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      paidAt: row.paid_at,
      paymentReference: row.payment_reference,
      exemptionReason: row.exemption_reason,
      exemptedBy: row.exempted_by,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toRow(charge: Charge): ChargeInsert {
    return {
      id: charge.id,
      practitioner_id: charge.practitionerId,
      charge_type: charge.chargeType,
      amount: charge.amount,
      currency: charge.currency,
      status: charge.status,
      due_date: charge.dueDate,
      period_start: charge.periodStart,
      period_end: charge.periodEnd,
      paid_at: charge.paidAt,
      payment_reference: charge.paymentReference,
      exemption_reason: charge.exemptionReason,
      exempted_by: charge.exemptedBy,
      created_by: charge.createdBy,
      created_at: charge.createdAt,
      updated_at: charge.updatedAt,
    };
  }
}
