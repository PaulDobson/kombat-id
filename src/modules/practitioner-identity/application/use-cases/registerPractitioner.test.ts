import { describe, it, expect } from "vitest";
import { registerPractitioner } from "./registerPractitioner";
import { DuplicateAuthUserError, DuplicateRutError } from "../../domain/errors";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import type { Practitioner } from "../../domain/entities/practitioner";

class MockRepo implements PractitionerRepository {
  constructor(
    private readonly existingByRut: Practitioner | null = null,
    private readonly existingByAuthUser: Practitioner | null = null,
  ) {}

  async findById(): Promise<Practitioner | null> {
    return null;
  }

  async findByRut(rut: string): Promise<Practitioner | null> {
    return this.existingByRut && this.existingByRut.rut === rut
      ? this.existingByRut
      : null;
  }

  async findByAuthUserId(authUserId: string): Promise<Practitioner | null> {
    return this.existingByAuthUser &&
      this.existingByAuthUser.authUserId === authUserId
      ? this.existingByAuthUser
      : null;
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

  async save(): Promise<void> {}

  async updateGrade(): Promise<void> {}

  async setActiveStatus(): Promise<void> {}

  async regenerateQrToken(): Promise<string> {
    return "new-token";
  }
}

describe("registerPractitioner", () => {
  it("throws DuplicateRutError when rut already exists", async () => {
    const practitioner: Practitioner = {
      id: "11111111-1111-4111-8111-111111111111",
      authUserId: null,
      rut: "12345678-9",
      fullName: "Ana Torres",
      birthDate: "2005-01-01",
      gender: "female",
      grade: "white",
      dan: null,
      startDate: "2020-01-01",
      isActive: true,
      contactPhone: null,
      contactEmail: "ana@example.com",
      photoPath: null,
      qrToken: "22222222-2222-4222-8222-222222222222",
      weightKg: 55,
      heightCm: 165,
      deactivatedAt: null,
      deactivationReason: null,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      role: "alumno",
      ageCategory: "juvenil",
      addressStreet: null,
      addressCity: null,
      addressRegion: null,
      instructorId: null,
      certificatePath: null,
      martialArt: null,
      martialGrade: null,
    };

    await expect(
      registerPractitioner(
        {
          rut: practitioner.rut,
          fullName: practitioner.fullName,
          birthDate: practitioner.birthDate,
          gender: practitioner.gender,
          grade: practitioner.grade,
          startDate: practitioner.startDate,
          authUserId: undefined,
        },
        { practitionerRepo: new MockRepo(practitioner) },
      ),
    ).rejects.toThrow(DuplicateRutError);
  });

  it("throws DuplicateAuthUserError when authUserId already exists", async () => {
    const practitioner: Practitioner = {
      id: "33333333-3333-4333-8333-333333333333",
      authUserId: "44444444-4444-4444-8444-444444444444",
      rut: "98765432-1",
      fullName: "Luis Vega",
      birthDate: "2004-05-05",
      gender: "male",
      grade: "yellow",
      dan: null,
      startDate: "2021-01-01",
      isActive: true,
      contactPhone: null,
      contactEmail: "luis@example.com",
      photoPath: null,
      qrToken: "55555555-5555-4555-8555-555555555555",
      weightKg: 60,
      heightCm: 170,
      deactivatedAt: null,
      deactivationReason: null,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      role: "alumno",
      ageCategory: "juvenil",
      addressStreet: null,
      addressCity: null,
      addressRegion: null,
      instructorId: null,
      certificatePath: null,
      martialArt: null,
      martialGrade: null,
    };

    await expect(
      registerPractitioner(
        {
          rut: "11111111-1",
          fullName: "Pedro Ramírez",
          birthDate: "2003-03-03",
          gender: "male",
          grade: "white",
          startDate: "2022-01-01",
          authUserId: practitioner.authUserId!,
        },
        { practitionerRepo: new MockRepo(null, practitioner) },
      ),
    ).rejects.toThrow(DuplicateAuthUserError);
  });
});
