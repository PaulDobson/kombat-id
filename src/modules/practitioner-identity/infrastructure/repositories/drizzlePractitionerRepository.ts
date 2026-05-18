import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { Database } from "@/types/database.types";
import type {
  Practitioner,
  Grade,
  Gender,
  PractitionerRole,
} from "../../domain/entities/practitioner";
import type {
  PractitionerRepository,
  PractitionerSearchQuery,
} from "../../domain/interfaces/practitionerRepository";

type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"];
type PractitionerInsert =
  Database["public"]["Tables"]["practitioners"]["Insert"];

const PractitionerRowSchema = z
  .object({
    id: z.string().uuid(),
    auth_user_id: z.string().uuid().nullable(),
    rut: z.string().min(1),
    full_name: z.string().min(1),
    birth_date: z.string().min(1),
    gender: z.enum(["male", "female", "other"]),
    grade: z.enum(["white", "yellow", "green", "blue", "red", "black"]),
    dan: z.number().int().min(1).max(9).nullable(),
    start_date: z.string().min(1),
    is_active: z.boolean(),
    contact_phone: z.string().nullable(),
    contact_email: z.string().nullable(),
    photo_path: z.string().nullable(),
    qr_token: z.string().uuid(),
    weight_kg: z.number().nullable(),
    height_cm: z.number().int().min(50).max(250).nullable().optional(),
    deactivated_at: z.string().nullable(),
    deactivation_reason: z.string().nullable(),
    updated_at: z.string().min(1),
    created_at: z.string().min(1),
    // role may be null in older rows created before the role column was added
    role: z.string().nullable().optional(),
    address_street: z.string().nullable().optional(),
    address_city: z.string().nullable().optional(),
    address_region: z.string().nullable().optional(),
    instructor_id: z.string().uuid().nullable().optional(),
    certificate_path: z.string().nullable().optional(),
  })
  .passthrough(); // ignore unknown columns added by future migrations

export class DrizzlePractitionerRepository implements PractitionerRepository {
  async findById(publicId: string): Promise<Practitioner | null> {
    const { data, error } = await adminSupabase
      .from("practitioners")
      .select("*")
      .eq("id", publicId)
      .maybeSingle();

    if (error)
      throw new DomainError(
        `Failed to find practitioner by id: ${error.message}`,
      );
    if (!data) return null;
    return this.fromRow(data as PractitionerRow);
  }

  async findByRut(rut: string): Promise<Practitioner | null> {
    const { data, error } = await adminSupabase
      .from("practitioners")
      .select("*")
      .eq("rut", rut)
      .maybeSingle();

    if (error)
      throw new DomainError(
        `Failed to find practitioner by RUT: ${error.message}`,
      );
    if (!data) return null;
    return this.fromRow(data as PractitionerRow);
  }

  async findByAuthUserId(authUserId: string): Promise<Practitioner | null> {
    const { data, error } = await adminSupabase
      .from("practitioners")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error)
      throw new DomainError(
        `Failed to find practitioner by auth user id: ${error.message}`,
      );
    if (!data) return null;
    return this.fromRow(data as PractitionerRow);
  }

  async findByQrToken(token: string): Promise<Practitioner | null> {
    // Guard: Postgres UUID columns reject non-UUID strings with a hard error.
    // Return null immediately for any token that isn't a valid UUID format.
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(token)) return null;

    const { data, error } = await adminSupabase
      .from("practitioners")
      .select("*")
      .eq("qr_token", token)
      .maybeSingle();

    if (error)
      throw new DomainError(
        `Failed to find practitioner by QR token: ${error.message}`,
      );
    if (!data) return null;
    return this.fromRow(data as PractitionerRow);
  }

  async search(query: PractitionerSearchQuery): Promise<Practitioner[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let builder: any = adminSupabase.from("practitioners").select("*");

    if (query.name) builder = builder.ilike("full_name", `%${query.name}%`);
    if (query.rut) builder = builder.eq("rut", query.rut);
    if (query.grade) builder = builder.eq("grade", query.grade);

    const { data, error } = await builder;
    if (error)
      throw new DomainError(`Failed to search practitioners: ${error.message}`);

    return ((data as PractitionerRow[]) ?? []).map((row) => this.fromRow(row));
  }

  async findActiveByGrade(grade: Grade): Promise<Practitioner[]> {
    const { data, error } = await adminSupabase
      .from("practitioners")
      .select("*")
      .eq("grade", grade)
      .eq("is_active", true);

    if (error)
      throw new DomainError(
        `Failed to find active practitioners by grade: ${error.message}`,
      );

    return ((data as PractitionerRow[]) ?? []).map((row) => this.fromRow(row));
  }

  async save(practitioner: Practitioner): Promise<void> {
    const row = this.toRow(practitioner);
    const { error } = await adminSupabase
      .from("practitioners")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(row as any);
    if (error)
      throw new DomainError(`Failed to save practitioner: ${error.message}`);
  }

  async updateGrade(
    publicId: string,
    grade: Grade,
    _adminId: string,
  ): Promise<void> {
    const { error } = await adminSupabase
      .from("practitioners")
      .update({
        grade,
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", publicId);

    if (error)
      throw new DomainError(
        `Failed to update practitioner grade: ${error.message}`,
      );
  }

  async setActiveStatus(
    publicId: string,
    active: boolean,
    reason: string,
    _adminId: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await adminSupabase
      .from("practitioners")
      .update({
        is_active: active,
        deactivated_at: active ? null : now,
        deactivation_reason: active ? null : reason,
        updated_at: now,
      } as unknown as never)
      .eq("id", publicId);

    if (error)
      throw new DomainError(
        `Failed to set practitioner active status: ${error.message}`,
      );
  }

  async regenerateQrToken(publicId: string, _adminId: string): Promise<string> {
    const newToken = crypto.randomUUID();
    const { error } = await adminSupabase
      .from("practitioners")
      .update({
        qr_token: newToken,
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", publicId);

    if (error)
      throw new DomainError(`Failed to regenerate QR token: ${error.message}`);

    return newToken;
  }

  private fromRow(row: PractitionerRow): Practitioner {
    const parsed = PractitionerRowSchema.safeParse(row);
    if (!parsed.success) {
      // Log full details server-side for debugging
      console.error(
        "[DrizzlePractitionerRepository.fromRow] Schema validation failed:",
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", "),
      );
      // Fall through to direct mapping to avoid blocking the QR verification
      return this.toEntity(row);
    }
    return this.toEntity(parsed.data as PractitionerRow);
  }

  private toEntity(row: PractitionerRow): Practitioner {
    const base: Practitioner = {
      id: row.id,
      authUserId: row.auth_user_id,
      rut: row.rut,
      fullName: row.full_name,
      birthDate: row.birth_date,
      gender: row.gender as Gender,
      grade: row.grade as Grade,
      dan: row.dan,
      startDate: row.start_date,
      isActive: row.is_active,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,
      photoPath: row.photo_path,
      qrToken: row.qr_token,
      weightKg: row.weight_kg,
      heightCm: row.height_cm ?? null,
      deactivatedAt: row.deactivated_at,
      deactivationReason: row.deactivation_reason,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      addressStreet: row.address_street ?? null,
      addressCity: row.address_city ?? null,
      addressRegion: row.address_region ?? null,
      instructorId: row.instructor_id ?? null,
      certificatePath: row.certificate_path ?? null,
      martialArt: row.martial_art ?? null,
    };
    if (row.role) base.role = row.role as PractitionerRole;
    return base;
  }

  private toRow(practitioner: Practitioner): PractitionerInsert {
    return {
      id: practitioner.id,
      auth_user_id: practitioner.authUserId,
      rut: practitioner.rut,
      full_name: practitioner.fullName,
      birth_date: practitioner.birthDate,
      gender: practitioner.gender,
      grade: practitioner.grade,
      dan: practitioner.dan,
      start_date: practitioner.startDate,
      is_active: practitioner.isActive,
      contact_phone: practitioner.contactPhone,
      contact_email: practitioner.contactEmail,
      photo_path: practitioner.photoPath,
      qr_token: practitioner.qrToken,
      weight_kg: practitioner.weightKg,
      height_cm: practitioner.heightCm,
      deactivated_at: practitioner.deactivatedAt,
      deactivation_reason: practitioner.deactivationReason,
      updated_at: practitioner.updatedAt,
      created_at: practitioner.createdAt,
      address_street: practitioner.addressStreet,
      address_city: practitioner.addressCity,
      address_region: practitioner.addressRegion,
      instructor_id: practitioner.instructorId,
      certificate_path: practitioner.certificatePath ?? null,
      martial_art: practitioner.martialArt ?? null,
    };
  }
}
