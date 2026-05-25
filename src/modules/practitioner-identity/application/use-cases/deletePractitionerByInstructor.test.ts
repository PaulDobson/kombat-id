import { describe, it, expect, vi } from "vitest";
import {
  deletePractitionerByInstructor,
  DeletePractitionerByInstructorInputSchema,
} from "./deletePractitionerByInstructor";
import {
  PractitionerNotFoundError,
  UnauthorizedError,
} from "../../domain/errors";
import type { Practitioner } from "../../domain/entities/practitioner";

describe("deletePractitionerByInstructor", () => {
  // UUIDs válidos para las pruebas
  const PRAC_ID = "550e8400-e29b-41d4-a716-446655440000";
  const AUTH_ID = "550e8400-e29b-41d4-a716-446655440001";
  const INST_ID = "550e8400-e29b-41d4-a716-446655440002";
  const ACAD_ID = "550e8400-e29b-41d4-a716-446655440003";
  const OTHER_INST_ID = "550e8400-e29b-41d4-a716-446655440004";

  const mockPractitioner: Practitioner = {
    id: PRAC_ID,
    authUserId: AUTH_ID,
    rut: "12345678-9",
    fullName: "Juan Pérez",
    birthDate: "2000-01-01",
    gender: "male",
    grade: "blue",
    dan: null,
    startDate: "2020-01-01",
    isActive: true,
    contactPhone: "+56912345678",
    contactEmail: "juan@example.com",
    photoPath: null,
    qrToken: "qr-789",
    weightKg: 70,
    heightCm: 170,
    deactivatedAt: null,
    deactivationReason: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    instructorId: INST_ID,
    role: "alumno",
    addressStreet: null,
    addressCity: null,
    addressRegion: null,
    martialArt: null,
    martialGrade: null,
    certificatePath: null,
  };

  type MockDeps = Parameters<typeof deletePractitionerByInstructor>[1];

  const mockDeps = {
    practitionerRepo: {
      findById: vi.fn(),
    },
    verifyInstructorOwnership: vi.fn(),
    verifyAcademyMembership: vi.fn(),
    softDeletePractitioner: vi.fn(),
    deleteAuthUser: vi.fn(),
  } as unknown as MockDeps;

  it("should validate input schema", () => {
    const validInput = {
      practitionerId: PRAC_ID,
      instructorId: INST_ID,
      academyId: ACAD_ID,
    };

    const result =
      DeletePractitionerByInstructorInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should reject invalid UUIDs", () => {
    const invalidInput = {
      practitionerId: "not-a-uuid",
      instructorId: INST_ID,
      academyId: ACAD_ID,
    };

    const result =
      DeletePractitionerByInstructorInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should throw PractitionerNotFoundError if practitioner does not exist", async () => {
    mockDeps.practitionerRepo.findById.mockResolvedValue(null);

    await expect(
      deletePractitionerByInstructor(
        {
          practitionerId: PRAC_ID,
          instructorId: INST_ID,
          academyId: ACAD_ID,
        },
        mockDeps,
      ),
    ).rejects.toThrow(PractitionerNotFoundError);
  });

  it("should throw UnauthorizedError if instructor is not the owner", async () => {
    mockDeps.practitionerRepo.findById.mockResolvedValue(mockPractitioner);
    mockDeps.verifyInstructorOwnership.mockResolvedValue(false);

    await expect(
      deletePractitionerByInstructor(
        {
          practitionerId: PRAC_ID,
          instructorId: OTHER_INST_ID,
          academyId: ACAD_ID,
        },
        mockDeps,
      ),
    ).rejects.toThrow(UnauthorizedError);

    expect(mockDeps.verifyInstructorOwnership).toHaveBeenCalledWith(
      PRAC_ID,
      OTHER_INST_ID,
    );
  });

  it("should throw UnauthorizedError if practitioner does not belong to instructor's academy", async () => {
    mockDeps.practitionerRepo.findById.mockResolvedValue(mockPractitioner);
    mockDeps.verifyInstructorOwnership.mockResolvedValue(true);
    mockDeps.verifyAcademyMembership.mockResolvedValue(false);

    await expect(
      deletePractitionerByInstructor(
        {
          practitionerId: PRAC_ID,
          instructorId: INST_ID,
          academyId: ACAD_ID,
        },
        mockDeps,
      ),
    ).rejects.toThrow(UnauthorizedError);

    expect(mockDeps.verifyAcademyMembership).toHaveBeenCalledWith(
      PRAC_ID,
      INST_ID,
    );
  });

  it("should successfully delete practitioner with auth user", async () => {
    mockDeps.practitionerRepo.findById.mockResolvedValue(mockPractitioner);
    mockDeps.verifyInstructorOwnership.mockResolvedValue(true);
    mockDeps.verifyAcademyMembership.mockResolvedValue(true);
    mockDeps.softDeletePractitioner.mockResolvedValue(undefined);
    mockDeps.deleteAuthUser.mockResolvedValue(undefined);

    await deletePractitionerByInstructor(
      {
        practitionerId: PRAC_ID,
        instructorId: INST_ID,
        academyId: ACAD_ID,
      },
      mockDeps,
    );

    expect(mockDeps.softDeletePractitioner).toHaveBeenCalledWith(
      PRAC_ID,
      `Eliminado por instructor: ${INST_ID}`,
    );
    expect(mockDeps.deleteAuthUser).toHaveBeenCalledWith(AUTH_ID);
  });

  it("should successfully delete practitioner without auth user", async () => {
    const practitionerNoAuth = {
      ...mockPractitioner,
      authUserId: null,
    };

    mockDeps.practitionerRepo.findById.mockResolvedValue(practitionerNoAuth);
    mockDeps.verifyInstructorOwnership.mockResolvedValue(true);
    mockDeps.verifyAcademyMembership.mockResolvedValue(true);
    mockDeps.softDeletePractitioner.mockResolvedValue(undefined);
    mockDeps.deleteAuthUser.mockClear();

    await deletePractitionerByInstructor(
      {
        practitionerId: PRAC_ID,
        instructorId: INST_ID,
        academyId: ACAD_ID,
      },
      mockDeps,
    );

    expect(mockDeps.softDeletePractitioner).toHaveBeenCalledWith(
      PRAC_ID,
      `Eliminado por instructor: ${INST_ID}`,
    );
    expect(mockDeps.deleteAuthUser).not.toHaveBeenCalled();
  });
});
