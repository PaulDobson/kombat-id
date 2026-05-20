import { describe, it, beforeEach, expect } from "vitest";
import fc from "fast-check";
import {
  updateStudentProfile,
  UpdateStudentProfileInputSchema,
} from "./updateStudentProfile";
import {
  PractitionerNotFoundError,
  PractitionerInactiveError,
} from "../../domain/errors";
import type { Practitioner } from "../../domain/entities/practitioner";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";

// ---------------------------------------------------------------------------
// In-memory mock repository
// ---------------------------------------------------------------------------

class InMemoryPractitionerRepository implements PractitionerRepository {
  private practitioners: Map<string, Practitioner> = new Map();
  public savedPractitioner: Practitioner | null = null;

  reset() {
    this.practitioners.clear();
    this.savedPractitioner = null;
  }

  seed(practitioner: Practitioner) {
    this.practitioners.set(practitioner.id, { ...practitioner });
  }

  async findById(publicId: string): Promise<Practitioner | null> {
    return this.practitioners.get(publicId) ?? null;
  }

  async findByRut(): Promise<Practitioner | null> {
    return null;
  }

  async findByAuthUserId(): Promise<Practitioner | null> {
    return null;
  }

  async findByQrToken(): Promise<Practitioner | null> {
    return null;
  }

  async search(): Promise<Practitioner[]> {
    return [];
  }

  async findActiveByGrade(): Promise<Practitioner[]> {
    return [];
  }

  async save(practitioner: Practitioner): Promise<void> {
    this.savedPractitioner = { ...practitioner };
    this.practitioners.set(practitioner.id, { ...practitioner });
  }

  async updateGrade(): Promise<void> {}

  async setActiveStatus(): Promise<void> {}

  async regenerateQrToken(): Promise<string> {
    return "new-token";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Valid UUID v4 constants for unit tests
const TEST_PRACTITIONER_ID = "a1b2c3d4-e5f6-4789-8abc-def012345678";
const TEST_NOT_FOUND_ID = "ffffffff-ffff-4fff-bfff-ffffffffffff";

function makeActivePractitioner(
  overrides: Partial<Practitioner> = {},
): Practitioner {
  const now = new Date().toISOString();
  return {
    id: TEST_PRACTITIONER_ID,
    authUserId: null,
    rut: "12345678-9",
    fullName: "Juan Pérez",
    birthDate: "1990-01-15",
    gender: "male",
    grade: "blue",
    dan: null,
    startDate: "2020-01-01",
    isActive: true,
    contactPhone: "+56912345678",
    contactEmail: "juan@example.com",
    photoPath: null,
    qrToken: "qr-token-abc",
    weightKg: 70,
    heightCm: 175,
    deactivatedAt: null,
    deactivationReason: null,
    updatedAt: now,
    createdAt: now,
    role: "alumno",
    ageCategory: "adulto",
    addressStreet: "Calle Falsa 123",
    addressCity: "Santiago",
    addressRegion: "Metropolitana",
    instructorId: "c0ffee00-dead-4bee-beef-a00000000001",
    certificatePath: null,
    martialArt: null,
    martialGrade: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Unit Tests — Subtask 1.4
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
// ---------------------------------------------------------------------------

describe("updateStudentProfile — unit tests", () => {
  let repo: InMemoryPractitionerRepository;

  beforeEach(() => {
    repo = new InMemoryPractitionerRepository();
  });

  it("happy path: updates only the provided fields, leaves others unchanged", async () => {
    const practitioner = makeActivePractitioner();
    repo.seed(practitioner);

    await updateStudentProfile(
      { publicId: practitioner.id, weightKg: 80, contactPhone: "+56999999999" },
      { practitionerRepo: repo },
    );

    const saved = repo.savedPractitioner!;
    expect(saved.weightKg).toBe(80);
    expect(saved.contactPhone).toBe("+56999999999");
    // Unchanged fields
    expect(saved.heightCm).toBe(175);
    expect(saved.contactEmail).toBe("juan@example.com");
    expect(saved.addressStreet).toBe("Calle Falsa 123");
    expect(saved.addressCity).toBe("Santiago");
    expect(saved.addressRegion).toBe("Metropolitana");
  });

  it("null fields are persisted as null (clear semantics)", async () => {
    const practitioner = makeActivePractitioner();
    repo.seed(practitioner);

    await updateStudentProfile(
      {
        publicId: practitioner.id,
        weightKg: null,
        contactPhone: null,
        addressCity: null,
      },
      { practitionerRepo: repo },
    );

    const saved = repo.savedPractitioner!;
    expect(saved.weightKg).toBeNull();
    expect(saved.contactPhone).toBeNull();
    expect(saved.addressCity).toBeNull();
    // Unchanged fields remain
    expect(saved.heightCm).toBe(175);
    expect(saved.contactEmail).toBe("juan@example.com");
  });

  it("throws PractitionerNotFoundError when repo returns null", async () => {
    await expect(
      updateStudentProfile(
        { publicId: TEST_NOT_FOUND_ID },
        { practitionerRepo: repo },
      ),
    ).rejects.toThrow(PractitionerNotFoundError);
  });

  it("throws PractitionerInactiveError when practitioner is inactive", async () => {
    const practitioner = makeActivePractitioner({ isActive: false });
    repo.seed(practitioner);

    await expect(
      updateStudentProfile(
        { publicId: practitioner.id, weightKg: 80 },
        { practitionerRepo: repo },
      ),
    ).rejects.toThrow(PractitionerInactiveError);
  });

  it("updatedAt is renewed on each successful call", async () => {
    const practitioner = makeActivePractitioner({
      updatedAt: "2020-01-01T00:00:00.000Z",
    });
    repo.seed(practitioner);

    const before = Date.now();
    await updateStudentProfile(
      { publicId: practitioner.id, weightKg: 75 },
      { practitionerRepo: repo },
    );
    const after = Date.now();

    const saved = repo.savedPractitioner!;
    const savedTime = new Date(saved.updatedAt).getTime();
    expect(savedTime).toBeGreaterThanOrEqual(before);
    expect(savedTime).toBeLessThanOrEqual(after);
  });

  it("identity fields are never modified", async () => {
    const practitioner = makeActivePractitioner();
    repo.seed(practitioner);

    await updateStudentProfile(
      {
        publicId: practitioner.id,
        weightKg: 90,
        heightCm: 180,
        contactPhone: "+56911111111",
        contactEmail: "new@example.com",
        addressStreet: "Nueva Calle 456",
        addressCity: "Valparaíso",
        addressRegion: "Valparaíso",
      },
      { practitionerRepo: repo },
    );

    const saved = repo.savedPractitioner!;
    expect(saved.rut).toBe(practitioner.rut);
    expect(saved.fullName).toBe(practitioner.fullName);
    expect(saved.birthDate).toBe(practitioner.birthDate);
    expect(saved.gender).toBe(practitioner.gender);
    expect(saved.grade).toBe(practitioner.grade);
    expect(saved.dan).toBe(practitioner.dan);
    expect(saved.role).toBe(practitioner.role);
  });
});

// ---------------------------------------------------------------------------
// Property 2: Patch semántico — campos no provistos permanecen inalterados
// Subtask 1.1
// Validates: Requirements 2.1, 2.2, 2.3
// ---------------------------------------------------------------------------

describe("updateStudentProfile — Property 2: Patch semántico", () => {
  let repo: InMemoryPractitionerRepository;

  beforeEach(() => {
    repo = new InMemoryPractitionerRepository();
  });

  /**
   * **Validates: Requirements 2.1, 2.2, 2.3**
   *
   * Para cualquier practicante activo y cualquier subconjunto de campos editables,
   * los campos NO incluidos en el input deben tener exactamente el mismo valor
   * en el practicante guardado que en el original.
   */
  it("fields not included in input remain unchanged after update", async () => {
    const editableFields = [
      "weightKg",
      "heightCm",
      "contactPhone",
      "contactEmail",
      "addressStreet",
      "addressCity",
      "addressRegion",
    ] as const;

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        // Generate a subset of editable field names to include in the input
        fc.subarray(editableFields as unknown as string[], {
          minLength: 0,
          maxLength: 7,
        }),
        async (publicId, includedFields) => {
          repo.reset();

          const original = makeActivePractitioner({ id: publicId });
          repo.seed(original);

          // Build an input with only the included fields set to some valid value
          const input: Record<string, unknown> = { publicId };
          if (includedFields.includes("weightKg")) input.weightKg = 65;
          if (includedFields.includes("heightCm")) input.heightCm = 170;
          if (includedFields.includes("contactPhone"))
            input.contactPhone = "+56900000001";
          if (includedFields.includes("contactEmail"))
            input.contactEmail = "test@example.com";
          if (includedFields.includes("addressStreet"))
            input.addressStreet = "Test Street 1";
          if (includedFields.includes("addressCity"))
            input.addressCity = "TestCity";
          if (includedFields.includes("addressRegion"))
            input.addressRegion = "TestRegion";

          await updateStudentProfile(
            input as Parameters<typeof updateStudentProfile>[0],
            {
              practitionerRepo: repo,
            },
          );

          const saved = repo.savedPractitioner!;

          // Fields NOT included in the input must retain their original values
          const notIncluded = editableFields.filter(
            (f) => !includedFields.includes(f),
          );

          for (const field of notIncluded) {
            if (saved[field] !== original[field]) return false;
          }

          return true;
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Inmutabilidad de campos de identidad
// Subtask 1.2
// Validates: Requirement 2.4
// ---------------------------------------------------------------------------

describe("updateStudentProfile — Property 3: Inmutabilidad de campos de identidad", () => {
  let repo: InMemoryPractitionerRepository;

  beforeEach(() => {
    repo = new InMemoryPractitionerRepository();
  });

  /**
   * **Validates: Requirement 2.4**
   *
   * Para cualquier input válido, rut, fullName, birthDate, gender, grade, dan y role
   * del practicante guardado deben ser idénticos a los del original.
   */
  it("identity fields are never modified regardless of input", async () => {
    // Use a constrained email generator that matches Zod v4's email pattern
    const safeEmailArb = fc
      .tuple(
        fc.stringMatching(/^[a-z][a-z0-9]{0,10}$/),
        fc.stringMatching(/^[a-z][a-z0-9]{1,8}$/),
        fc.constantFrom("com", "net", "org", "cl", "io"),
      )
      .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.option(fc.double({ min: 0.1, max: 300, noNaN: true }), {
          nil: null,
        }),
        fc.option(fc.integer({ min: 50, max: 250 }), { nil: null }),
        fc.option(fc.string({ maxLength: 30 }), { nil: null }),
        fc.option(safeEmailArb, { nil: null }),
        async (publicId, weightKg, heightCm, contactPhone, contactEmail) => {
          repo.reset();

          const original = makeActivePractitioner({ id: publicId });
          repo.seed(original);

          await updateStudentProfile(
            {
              publicId,
              weightKg: weightKg ?? undefined,
              heightCm: heightCm ?? undefined,
              contactPhone: contactPhone ?? undefined,
              contactEmail: contactEmail ?? undefined,
            },
            { practitionerRepo: repo },
          );

          const saved = repo.savedPractitioner!;

          return (
            saved.rut === original.rut &&
            saved.fullName === original.fullName &&
            saved.birthDate === original.birthDate &&
            saved.gender === original.gender &&
            saved.grade === original.grade &&
            saved.dan === original.dan &&
            saved.role === original.role
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Validación rechaza valores fuera de rango
// Subtask 1.3
// Validates: Requirements 5.2, 5.3, 5.4
// ---------------------------------------------------------------------------

describe("UpdateStudentProfileInputSchema — Property 6: Validación rechaza valores fuera de rango", () => {
  /**
   * **Validates: Requirements 5.2, 5.3, 5.4**
   *
   * Para cualquier weightKg no positivo, heightCm fuera de [50, 250], o contactEmail
   * con formato inválido, el schema debe retornar error de validación.
   */
  it("rejects non-positive weightKg", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.oneof(
          fc.constant(0),
          fc.double({ min: -1000, max: -0.001, noNaN: true }),
        ),
        (publicId, weightKg) => {
          const result = UpdateStudentProfileInputSchema.safeParse({
            publicId,
            weightKg,
          });
          return !result.success;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("rejects heightCm outside [50, 250]", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.oneof(
          fc.integer({ min: -1000, max: 49 }),
          fc.integer({ min: 251, max: 10000 }),
        ),
        (publicId, heightCm) => {
          const result = UpdateStudentProfileInputSchema.safeParse({
            publicId,
            heightCm,
          });
          return !result.success;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("rejects invalid contactEmail format", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        // Generate strings that are clearly not valid emails
        fc.oneof(
          fc.constant("not-an-email"),
          fc.constant("missing@"),
          fc.constant("@nodomain"),
          fc.constant("spaces in@email.com"),
          fc.constant(""),
        ),
        (publicId, contactEmail) => {
          const result = UpdateStudentProfileInputSchema.safeParse({
            publicId,
            contactEmail,
          });
          return !result.success;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("accepts null for all optional fields", () => {
    fc.assert(
      fc.property(fc.uuid(), (publicId) => {
        const result = UpdateStudentProfileInputSchema.safeParse({
          publicId,
          weightKg: null,
          heightCm: null,
          contactPhone: null,
          contactEmail: null,
          addressStreet: null,
          addressCity: null,
          addressRegion: null,
        });
        return result.success;
      }),
      { numRuns: 100 },
    );
  });

  it("accepts undefined for all optional fields (no-change semantics)", () => {
    fc.assert(
      fc.property(fc.uuid(), (publicId) => {
        const result = UpdateStudentProfileInputSchema.safeParse({ publicId });
        return result.success;
      }),
      { numRuns: 100 },
    );
  });
});
