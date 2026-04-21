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
export type EventScope = "national" | "international";
export type RankingType = "national" | "international" | "combined";
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
export type ChargeType =
  | "examen_grado"
  | "membresia_anual"
  | "licencia_competencia";
export type ChargeStatus = "pendiente" | "pagado" | "vencido" | "exento";
export type Currency = "CLP" | "USD";
export type Discipline =
  | "kombat_taekwondo"
  | "taekwondo_wtf"
  | "hapkido"
  | "kick_boxing"
  | "defensa_personal";

// ============================================================
// Event storage types (migration 031)
// ============================================================

export interface EventAttachment {
  name: string;
  path: string;
  size: number;
  type: string;
}

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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================================

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      academies: {
        Row: {
          address: string | null;
          city: string;
          created_at: string;
          created_by: string;
          deactivated_at: string | null;
          deactivation_reason: string | null;
          founded_date: string | null;
          id: string;
          is_active: boolean;
          name: string;
          region: string;
          responsible_instructor_ids: string[];
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          city: string;
          created_at?: string;
          created_by: string;
          deactivated_at?: string | null;
          deactivation_reason?: string | null;
          founded_date?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          region: string;
          responsible_instructor_ids?: string[];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: string;
          created_at?: string;
          created_by?: string;
          deactivated_at?: string | null;
          deactivation_reason?: string | null;
          founded_date?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          region?: string;
          responsible_instructor_ids?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      academy_memberships: {
        Row: {
          academy_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          joined_at: string;
          left_at: string | null;
          practitioner_id: string;
        };
        Insert: {
          academy_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          joined_at?: string;
          left_at?: string | null;
          practitioner_id: string;
        };
        Update: {
          academy_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          joined_at?: string;
          left_at?: string | null;
          practitioner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academy_memberships_academy_id_fkey";
            columns: ["academy_id"];
            isOneToOne: false;
            referencedRelation: "academies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academy_memberships_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_users: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          admin_id: string;
          created_at: string;
          id: string;
          metadata: Json | null;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          action: string;
          admin_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          admin_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [];
      };
      certification_requests: {
        Row: {
          cert_type: string;
          created_at: string;
          id: string;
          notes: string | null;
          observation_notes: string | null;
          practitioner_id: string;
          rejection_reason: string | null;
          requester_id: string;
          status: string;
        };
        Insert: {
          cert_type: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          observation_notes?: string | null;
          practitioner_id: string;
          rejection_reason?: string | null;
          requester_id: string;
          status?: string;
        };
        Update: {
          cert_type?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          observation_notes?: string | null;
          practitioner_id?: string;
          rejection_reason?: string | null;
          requester_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "certification_requests_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certification_requests_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
        ];
      };
      certifications: {
        Row: {
          cert_type: string;
          id: string;
          is_revoked: boolean;
          issued_at: string;
          issued_by: string;
          notes: string | null;
          practitioner_id: string;
          practitioner_snapshot: Json;
          revocation_reason: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
        };
        Insert: {
          cert_type: string;
          id?: string;
          is_revoked?: boolean;
          issued_at?: string;
          issued_by: string;
          notes?: string | null;
          practitioner_id: string;
          practitioner_snapshot: Json;
          revocation_reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
        };
        Update: {
          cert_type?: string;
          id?: string;
          is_revoked?: boolean;
          issued_at?: string;
          issued_by?: string;
          notes?: string | null;
          practitioner_id?: string;
          practitioner_snapshot?: Json;
          revocation_reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "certifications_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
        ];
      };
      charges: {
        Row: {
          amount: number;
          charge_type: string;
          created_at: string;
          created_by: string;
          currency: string;
          due_date: string;
          exempted_by: string | null;
          exemption_reason: string | null;
          id: string;
          paid_at: string | null;
          payment_reference: string | null;
          period_end: string;
          period_start: string;
          practitioner_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          charge_type: string;
          created_at?: string;
          created_by: string;
          currency?: string;
          due_date: string;
          exempted_by?: string | null;
          exemption_reason?: string | null;
          id?: string;
          paid_at?: string | null;
          payment_reference?: string | null;
          period_end: string;
          period_start: string;
          practitioner_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          charge_type?: string;
          created_at?: string;
          created_by?: string;
          currency?: string;
          due_date?: string;
          exempted_by?: string | null;
          exemption_reason?: string | null;
          id?: string;
          paid_at?: string | null;
          payment_reference?: string | null;
          period_end?: string;
          period_start?: string;
          practitioner_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "charges_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
        ];
      };
      discipline_grades: {
        Row: {
          certification_id: string | null;
          certifying_master_id: string | null;
          created_at: string;
          dan: number | null;
          discipline: string;
          grade: string;
          id: string;
          is_active: boolean;
          obtained_at: string;
          practitioner_id: string;
          updated_at: string;
        };
        Insert: {
          certification_id?: string | null;
          certifying_master_id?: string | null;
          created_at?: string;
          dan?: number | null;
          discipline: string;
          grade: string;
          id?: string;
          is_active?: boolean;
          obtained_at: string;
          practitioner_id: string;
          updated_at?: string;
        };
        Update: {
          certification_id?: string | null;
          certifying_master_id?: string | null;
          created_at?: string;
          dan?: number | null;
          discipline?: string;
          grade?: string;
          id?: string;
          is_active?: boolean;
          obtained_at?: string;
          practitioner_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discipline_grades_certification_id_fkey";
            columns: ["certification_id"];
            isOneToOne: false;
            referencedRelation: "certifications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discipline_grades_certifying_master_id_fkey";
            columns: ["certifying_master_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discipline_grades_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
        ];
      };
      event_registrations: {
        Row: {
          cancelled_at: string | null;
          cancelled_by: string | null;
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          event_id: string;
          id: string;
          instructor_id: string;
          notes: string | null;
          practitioner_id: string;
          registered_at: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          event_id: string;
          id?: string;
          instructor_id: string;
          notes?: string | null;
          practitioner_id: string;
          registered_at?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          event_id?: string;
          id?: string;
          instructor_id?: string;
          notes?: string | null;
          practitioner_id?: string;
          registered_at?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "martial_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_registrations_instructor_id_fkey";
            columns: ["instructor_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_registrations_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_template_items: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          max_score: number;
          name: string;
          order: number;
          template_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          max_score: number;
          name: string;
          order?: number;
          template_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          max_score?: number;
          name?: string;
          order?: number;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exam_template_items_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "exam_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_templates: {
        Row: {
          created_at: string;
          created_by: string;
          discipline: string;
          from_grade: string;
          id: string;
          is_active: boolean;
          minimum_pass_score: number;
          requires_admin_auth: boolean;
          to_grade: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          discipline?: string;
          from_grade: string;
          id?: string;
          is_active?: boolean;
          minimum_pass_score?: number;
          requires_admin_auth?: boolean;
          to_grade: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          discipline?: string;
          from_grade?: string;
          id?: string;
          is_active?: boolean;
          minimum_pass_score?: number;
          requires_admin_auth?: boolean;
          to_grade?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      grade_exam_items: {
        Row: {
          created_at: string;
          exam_id: string;
          id: string;
          item_name: string;
          max_score: number;
          score: number;
          template_item_id: string | null;
        };
        Insert: {
          created_at?: string;
          exam_id: string;
          id?: string;
          item_name: string;
          max_score: number;
          score?: number;
          template_item_id?: string | null;
        };
        Update: {
          created_at?: string;
          exam_id?: string;
          id?: string;
          item_name?: string;
          max_score?: number;
          score?: number;
          template_item_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "grade_exam_items_exam_id_fkey";
            columns: ["exam_id"];
            isOneToOne: false;
            referencedRelation: "grade_exams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grade_exam_items_template_item_id_fkey";
            columns: ["template_item_id"];
            isOneToOne: false;
            referencedRelation: "exam_template_items";
            referencedColumns: ["id"];
          },
        ];
      };
      grade_exams: {
        Row: {
          authorized_at: string | null;
          authorized_by: string | null;
          calculated_result: string | null;
          created_at: string;
          discipline: string;
          exam_date: string;
          final_result: string | null;
          from_grade: string;
          id: string;
          instructor_id: string;
          instructor_override: boolean;
          max_possible_score: number | null;
          notes: string | null;
          override_justification: string | null;
          override_result: string | null;
          practitioner_id: string;
          rejected_by: string | null;
          rejection_reason: string | null;
          score_percentage: number | null;
          status: string;
          template_id: string;
          to_grade: string;
          total_score: number | null;
          updated_at: string;
        };
        Insert: {
          authorized_at?: string | null;
          authorized_by?: string | null;
          calculated_result?: string | null;
          created_at?: string;
          discipline: string;
          exam_date: string;
          final_result?: string | null;
          from_grade: string;
          id?: string;
          instructor_id: string;
          instructor_override?: boolean;
          max_possible_score?: number | null;
          notes?: string | null;
          override_justification?: string | null;
          override_result?: string | null;
          practitioner_id: string;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          score_percentage?: number | null;
          status?: string;
          template_id: string;
          to_grade: string;
          total_score?: number | null;
          updated_at?: string;
        };
        Update: {
          authorized_at?: string | null;
          authorized_by?: string | null;
          calculated_result?: string | null;
          created_at?: string;
          discipline?: string;
          exam_date?: string;
          final_result?: string | null;
          from_grade?: string;
          id?: string;
          instructor_id?: string;
          instructor_override?: boolean;
          max_possible_score?: number | null;
          notes?: string | null;
          override_justification?: string | null;
          override_result?: string | null;
          practitioner_id?: string;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          score_percentage?: number | null;
          status?: string;
          template_id?: string;
          to_grade?: string;
          total_score?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grade_exams_instructor_id_fkey";
            columns: ["instructor_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grade_exams_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grade_exams_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "exam_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      martial_events: {
        Row: {
          attachments: Json;
          cover_image_path: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          event_date: string;
          event_type: string;
          id: string;
          location: string | null;
          max_participants: number | null;
          min_participants: number | null;
          name: string;
          registration_fee: number | null;
        };
        Insert: {
          attachments?: Json;
          cover_image_path?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          event_date: string;
          event_type: string;
          id?: string;
          location?: string | null;
          max_participants?: number | null;
          min_participants?: number | null;
          name: string;
          registration_fee?: number | null;
        };
        Update: {
          attachments?: Json;
          cover_image_path?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          event_date?: string;
          event_type?: string;
          id?: string;
          location?: string | null;
          max_participants?: number | null;
          min_participants?: number | null;
          name?: string;
          registration_fee?: number | null;
        };
        Relationships: [];
      };
      martial_history: {
        Row: {
          corrected_at: string | null;
          corrected_by: string | null;
          correction_note: string | null;
          created_at: string;
          event_country: string | null;
          event_date: string;
          event_id: string | null;
          event_scope: string | null;
          event_type: string;
          id: string;
          is_corrected: boolean;
          notes: string | null;
          practitioner_id: string;
          recorded_by: string;
          result: string | null;
        };
        Insert: {
          corrected_at?: string | null;
          corrected_by?: string | null;
          correction_note?: string | null;
          created_at?: string;
          event_country?: string | null;
          event_date: string;
          event_id?: string | null;
          event_scope?: string | null;
          event_type: string;
          id?: string;
          is_corrected?: boolean;
          notes?: string | null;
          practitioner_id: string;
          recorded_by: string;
          result?: string | null;
        };
        Update: {
          corrected_at?: string | null;
          corrected_by?: string | null;
          correction_note?: string | null;
          created_at?: string;
          event_country?: string | null;
          event_date?: string;
          event_id?: string | null;
          event_scope?: string | null;
          event_type?: string;
          id?: string;
          is_corrected?: boolean;
          notes?: string | null;
          practitioner_id?: string;
          recorded_by?: string;
          result?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "martial_history_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "martial_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "martial_history_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
        ];
      };
      master_lineage: {
        Row: {
          certification_id: string;
          certified_at: string;
          certifying_master_id: string;
          created_at: string;
          dan: number | null;
          grade: string;
          id: string;
          practitioner_id: string;
        };
        Insert: {
          certification_id: string;
          certified_at: string;
          certifying_master_id: string;
          created_at?: string;
          dan?: number | null;
          grade: string;
          id?: string;
          practitioner_id: string;
        };
        Update: {
          certification_id?: string;
          certified_at?: string;
          certifying_master_id?: string;
          created_at?: string;
          dan?: number | null;
          grade?: string;
          id?: string;
          practitioner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "master_lineage_certification_id_fkey";
            columns: ["certification_id"];
            isOneToOne: false;
            referencedRelation: "certifications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "master_lineage_certifying_master_id_fkey";
            columns: ["certifying_master_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "master_lineage_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
        ];
      };
      practitioners: {
        Row: {
          address_city: string | null;
          address_region: string | null;
          address_street: string | null;
          auth_user_id: string | null;
          birth_date: string;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          dan: number | null;
          deactivated_at: string | null;
          deactivation_reason: string | null;
          full_name: string;
          gender: string;
          grade: string;
          id: string;
          instructor_id: string | null;
          is_active: boolean;
          photo_path: string | null;
          qr_token: string;
          role: string;
          rut: string;
          start_date: string;
          updated_at: string;
          weight_kg: number | null;
        };
        Insert: {
          address_city?: string | null;
          address_region?: string | null;
          address_street?: string | null;
          auth_user_id?: string | null;
          birth_date: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          dan?: number | null;
          deactivated_at?: string | null;
          deactivation_reason?: string | null;
          full_name: string;
          gender: string;
          grade?: string;
          id?: string;
          instructor_id?: string | null;
          is_active?: boolean;
          photo_path?: string | null;
          qr_token?: string;
          role?: string;
          rut: string;
          start_date: string;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Update: {
          address_city?: string | null;
          address_region?: string | null;
          address_street?: string | null;
          auth_user_id?: string | null;
          birth_date?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          dan?: number | null;
          deactivated_at?: string | null;
          deactivation_reason?: string | null;
          full_name?: string;
          gender?: string;
          grade?: string;
          id?: string;
          instructor_id?: string | null;
          is_active?: boolean;
          photo_path?: string | null;
          qr_token?: string;
          role?: string;
          rut?: string;
          start_date?: string;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "practitioners_instructor_id_fkey";
            columns: ["instructor_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
        ];
      };
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
        Relationships: [];
      };
      ranking_positions: {
        Row: {
          age_range: string;
          calculated_at: string;
          category_count: number;
          combined_points: number;
          combined_position: number | null;
          grade: string;
          id: string;
          international_points: number;
          international_position: number | null;
          national_points: number;
          national_position: number | null;
          position: number;
          practitioner_id: string;
          ranking_type: string;
          total_points: number;
          weight_category: string;
        };
        Insert: {
          age_range: string;
          calculated_at?: string;
          category_count: number;
          combined_points?: number;
          combined_position?: number | null;
          grade: string;
          id?: string;
          international_points?: number;
          international_position?: number | null;
          national_points?: number;
          national_position?: number | null;
          position: number;
          practitioner_id: string;
          ranking_type?: string;
          total_points?: number;
          weight_category: string;
        };
        Update: {
          age_range?: string;
          calculated_at?: string;
          category_count?: number;
          combined_points?: number;
          combined_position?: number | null;
          grade?: string;
          id?: string;
          international_points?: number;
          international_position?: number | null;
          national_points?: number;
          national_position?: number | null;
          position?: number;
          practitioner_id?: string;
          ranking_type?: string;
          total_points?: number;
          weight_category?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ranking_positions_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
        ];
      };
      ranking_snapshots: {
        Row: {
          age_range: string;
          category_count: number;
          combined_points: number | null;
          grade: string;
          id: string;
          international_points: number | null;
          national_points: number | null;
          period_label: string;
          period_type: string;
          position: number;
          practitioner_id: string;
          ranking_type: string;
          snapshot_at: string;
          total_points: number;
          weight_category: string;
        };
        Insert: {
          age_range: string;
          category_count: number;
          combined_points?: number | null;
          grade: string;
          id?: string;
          international_points?: number | null;
          national_points?: number | null;
          period_label: string;
          period_type: string;
          position: number;
          practitioner_id: string;
          ranking_type?: string;
          snapshot_at?: string;
          total_points: number;
          weight_category: string;
        };
        Update: {
          age_range?: string;
          category_count?: number;
          combined_points?: number | null;
          grade?: string;
          id?: string;
          international_points?: number | null;
          national_points?: number | null;
          period_label?: string;
          period_type?: string;
          position?: number;
          practitioner_id?: string;
          ranking_type?: string;
          snapshot_at?: string;
          total_points?: number;
          weight_category?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ranking_snapshots_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
