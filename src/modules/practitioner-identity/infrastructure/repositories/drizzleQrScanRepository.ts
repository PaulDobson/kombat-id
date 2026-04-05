import "server-only";

import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { QrScanRepository } from "../../domain/interfaces/qrScanRepository";

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class DrizzleQrScanRepository implements QrScanRepository {
  /**
   * Records a QR scan event.
   * Only the token and timestamp are stored — no user/verifier data (Req 6.5).
   */
  async recordScan(token: string, timestamp: Date): Promise<void> {
    const { error } = await adminSupabase.from("qr_scan_events").insert({
      qr_token: token,
      scanned_at: timestamp.toISOString(),
    } as unknown as never);

    if (error) {
      throw new DomainError(`Failed to record QR scan event: ${error.message}`);
    }
  }
}
