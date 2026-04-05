/**
 * Database types for the Kombat Taekwondo Identity platform.
 *
 * These types reflect the schema defined in:
 *   src/lib/db/migrations/001_practitioner_identity.sql
 *
 * To regenerate from a live Supabase project, run:
 *   npx supabase gen types typescript --project-id <your-project-id> > src/types/database.types.ts
 */

// ============================================================
// Shared enums / literals
// ============================================================

export type Gender = "male" | "female" | "other";
export type Grade = "white" | "yellow" | "green" | "blue" | "red" | "black";
export type EventType = "competition" | "seminar" | "exam";
export type PractitionerRole = "alumno" | "instructor" | "profesor" | "maestro";
export type AgeCategory = "infantil" | "juvenil" | "adulto" | "senior";
export type AgeRange = "under-12" | "12-17" | "18-30" | "30+";
export type WeightCategory =
  | "fin"
  | "fly"
  | "bantam"
  | "feather"
  | "light"
  | "welter"
  | "middle"
  | "heavy";
export type PeriodType = "monthly" | "annual";
export type CertType =
  | "technical_grade"
  | "instructor"
  | "referee"
  | "coach"
  | "event_participation";

// ============================================================
// JSONB payload stored inside certifications.practitioner_snapshot
// ============================================================

export interface PractitionerSnapshot {
  id: string;
  fullName: string;
  rut: string;
  grade: Grade;
  dan: number | null;
  snapshotAt: string; // ISO timestamp
}

// ============================================================
// Table row / insert / update types
// ============================================================

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      // ----------------------------------------------------------
      // practitioners
      // ----------------------------------------------------------
      practitioners: {
        Row: {
          id: string;
          auth_user_id: string | null;
          rut: string;
          full_name: string;
          birth_date: string; // DATE → ISO string "YYYY-MM-DD"
          gender: Gender;
          grade: Grade;
          dan: number | null;
          start_date: string; // DATE → ISO string "YYYY-MM-DD"
          is_active: boolean;
          contact_phone: string | null;
          contact_email: string | null;
          photo_path: string | null;
          qr_token: string;
          weight_kg: number | null;
          deactivated_at: string | null; // TIMESTAMPTZ → ISO string
          deactivation_reason: string | null;
          updated_at: string; // TIMESTAMPTZ → ISO string
          created_at: string; // TIMESTAMPTZ → ISO string
          /** Req 9.1 — Rol jerárquico */
          role: PractitionerRole;
          /** Req 9.2 — Categoría de edad generada por la BD a partir de birth_date */
          age_category: AgeCategory;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          rut: string;
          full_name: string;
          birth_date: string;
          gender: Gender;
          grade?: Grade;
          dan?: number | null;
          start_date: string;
          is_active?: boolean;
          contact_phone?: string | null;
          contact_email?: string | null;
          photo_path?: string | null;
          qr_token?: string;
          weight_kg?: number | null;
          deactivated_at?: string | null;
          deactivation_reason?: string | null;
          updated_at?: string;
          created_at?: string;
          /** Req 9.1 — Rol jerárquico; por defecto 'alumno' */
          role?: PractitionerRole;
          // age_category es generada por la BD, no se puede insertar
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          rut?: string;
          full_name?: string;
          birth_date?: string;
          gender?: Gender;
          grade?: Grade;
          dan?: number | null;
          start_date?: string;
          is_active?: boolean;
          contact_phone?: string | null;
          contact_email?: string | null;
          photo_path?: string | null;
          qr_token?: string;
          weight_kg?: number | null;
          deactivated_at?: string | null;
          deactivation_reason?: string | null;
          updated_at?: string;
          created_at?: string;
          /** Req 9.1 — Rol jerárquico */
          role?: PractitionerRole;
          // age_category es generada por la BD, no se puede actualizar
        };
      };

      // ----------------------------------------------------------
      // martial_events
      // ----------------------------------------------------------
      martial_events: {
        Row: {
          id: string;
          name: string;
          event_type: EventType;
          event_date: string; // DATE → ISO string "YYYY-MM-DD"
          location: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          event_type: EventType;
          event_date: string;
          location?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          event_type?: EventType;
          event_date?: string;
          location?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };

      // ----------------------------------------------------------
      // martial_history
      // ----------------------------------------------------------
      martial_history: {
        Row: {
          id: string;
          practitioner_id: string;
          event_id: string | null;
          event_type: EventType;
          event_date: string; // DATE → ISO string "YYYY-MM-DD"
          result: string | null;
          notes: string | null;
          is_corrected: boolean;
          correction_note: string | null;
          corrected_at: string | null;
          corrected_by: string | null;
          recorded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          event_id?: string | null;
          event_type: EventType;
          event_date: string;
          result?: string | null;
          notes?: string | null;
          is_corrected?: boolean;
          correction_note?: string | null;
          corrected_at?: string | null;
          corrected_by?: string | null;
          recorded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          practitioner_id?: string;
          event_id?: string | null;
          event_type?: EventType;
          event_date?: string;
          result?: string | null;
          notes?: string | null;
          is_corrected?: boolean;
          correction_note?: string | null;
          corrected_at?: string | null;
          corrected_by?: string | null;
          recorded_by?: string;
          created_at?: string;
        };
      };

      // ----------------------------------------------------------
      // admin_users
      // ----------------------------------------------------------
      admin_users: {
        Row: {
          user_id: string;
          granted_at: string;
          granted_by: string | null;
        };
        Insert: {
          user_id: string;
          granted_at?: string;
          granted_by?: string | null;
        };
        Update: {
          user_id?: string;
          granted_at?: string;
          granted_by?: string | null;
        };
      };

      // ----------------------------------------------------------
      // ranking_positions
      // ----------------------------------------------------------
      ranking_positions: {
        Row: {
          id: string;
          practitioner_id: string;
          grade: Grade;
          age_range: AgeRange;
          weight_category: WeightCategory;
          total_points: number;
          position: number;
          category_count: number;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          grade: Grade;
          age_range: AgeRange;
          weight_category: WeightCategory;
          total_points?: number;
          position: number;
          category_count: number;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          practitioner_id?: string;
          grade?: Grade;
          age_range?: AgeRange;
          weight_category?: WeightCategory;
          total_points?: number;
          position?: number;
          category_count?: number;
          calculated_at?: string;
        };
      };

      // ----------------------------------------------------------
      // ranking_snapshots
      // ----------------------------------------------------------
      ranking_snapshots: {
        Row: {
          id: string;
          practitioner_id: string;
          period_type: PeriodType;
          period_label: string;
          position: number;
          total_points: number;
          category_count: number;
          grade: Grade;
          age_range: AgeRange;
          weight_category: WeightCategory;
          snapshot_at: string;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          period_type: PeriodType;
          period_label: string;
          position: number;
          total_points: number;
          category_count: number;
          grade: Grade;
          age_range: AgeRange;
          weight_category: WeightCategory;
          snapshot_at?: string;
        };
        Update: {
          id?: string;
          practitioner_id?: string;
          period_type?: PeriodType;
          period_label?: string;
          position?: number;
          total_points?: number;
          category_count?: number;
          grade?: Grade;
          age_range?: AgeRange;
          weight_category?: WeightCategory;
          snapshot_at?: string;
        };
      };

      // ----------------------------------------------------------
      // certifications
      // ----------------------------------------------------------
      certifications: {
        Row: {
          id: string;
          practitioner_id: string;
          cert_type: CertType;
          issued_at: string;
          issued_by: string;
          is_revoked: boolean;
          revoked_at: string | null;
          revocation_reason: string | null;
          revoked_by: string | null;
          practitioner_snapshot: PractitionerSnapshot;
          notes: string | null;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          cert_type: CertType;
          issued_at?: string;
          issued_by: string;
          is_revoked?: boolean;
          revoked_at?: string | null;
          revocation_reason?: string | null;
          revoked_by?: string | null;
          practitioner_snapshot: PractitionerSnapshot;
          notes?: string | null;
        };
        Update: {
          id?: string;
          practitioner_id?: string;
          cert_type?: CertType;
          issued_at?: string;
          issued_by?: string;
          is_revoked?: boolean;
          revoked_at?: string | null;
          revocation_reason?: string | null;
          revoked_by?: string | null;
          practitioner_snapshot?: PractitionerSnapshot;
          notes?: string | null;
        };
      };

      // ----------------------------------------------------------
      // qr_scan_events
      // ----------------------------------------------------------
      qr_scan_events: {
        Row: {
          id: string;
          qr_token: string;
          scanned_at: string;
        };
        Insert: {
          id?: string;
          qr_token: string;
          scanned_at?: string;
        };
        Update: {
          id?: string;
          qr_token?: string;
          scanned_at?: string;
        };
      };

      // ----------------------------------------------------------
      // audit_log
      // ----------------------------------------------------------
      audit_log: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          target_type: string;
          target_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: string;
          target_type: string;
          target_id?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action?: string;
          target_type?: string;
          target_id?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
      };

      // ----------------------------------------------------------
      // academies
      // ----------------------------------------------------------
      academies: {
        Row: {
          id: string;
          name: string;
          region: string;
          city: string;
          address: string | null;
          founded_date: string | null; // DATE → ISO string "YYYY-MM-DD"
          is_active: boolean;
          deactivated_at: string | null;
          deactivation_reason: string | null;
          responsible_instructor_ids: string[];
          created_by: string;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          region: string;
          city: string;
          address?: string | null;
          founded_date?: string | null;
          is_active?: boolean;
          deactivated_at?: string | null;
          deactivation_reason?: string | null;
          responsible_instructor_ids?: string[];
          created_by: string;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          region?: string;
          city?: string;
          address?: string | null;
          founded_date?: string | null;
          is_active?: boolean;
          deactivated_at?: string | null;
          deactivation_reason?: string | null;
          responsible_instructor_ids?: string[];
          created_by?: string;
          updated_at?: string;
          created_at?: string;
        };
      };

      // ----------------------------------------------------------
      // academy_memberships
      // ----------------------------------------------------------
      academy_memberships: {
        Row: {
          id: string;
          academy_id: string;
          practitioner_id: string;
          joined_at: string; // DATE → ISO string "YYYY-MM-DD"
          left_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          academy_id: string;
          practitioner_id: string;
          joined_at?: string;
          left_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          academy_id?: string;
          practitioner_id?: string;
          joined_at?: string;
          left_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };

      // ----------------------------------------------------------
      // master_lineage
      // ----------------------------------------------------------
      master_lineage: {
        Row: {
          id: string;
          practitioner_id: string;
          certifying_master_id: string;
          grade: Grade;
          dan: number | null;
          certification_id: string;
          certified_at: string; // DATE → ISO string "YYYY-MM-DD"
          created_at: string; // TIMESTAMPTZ → ISO string
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          certifying_master_id: string;
          grade: Grade;
          dan?: number | null;
          certification_id: string;
          certified_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          practitioner_id?: string;
          certifying_master_id?: string;
          grade?: Grade;
          dan?: number | null;
          certification_id?: string;
          certified_at?: string;
          created_at?: string;
        };
      };
    };
  };
}
