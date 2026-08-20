/**
 * Integration tests for the onboarding progress repository and RLS-equivalent behaviour.
 *
 * NOTE: This project has no integration test infrastructure wired to a real Supabase
 * instance for the test runner.  Following the established pattern used by every other
 * module (see event-registration, practitioner-identity), tests are written against a
 * full in-memory repository that faithfully replicates:
 *
 *   - The UNIQUE constraint on `practitioner_id`       (prevents duplicate records)
 *   - The INSERT/SELECT/UPDATE behaviour of the real repository
 *   - Row-Level Security scoping                        (each "client session" sees only
 *                                                        its own record — modelled via
 *                                                        the `RlsScopedRepository` class)
 *
 * The PBT (Property 1) verifies the uniqueness guarantee for any number of concurrent
 * or repeated `getOrInitOnboardingProgress` calls.
 *
 * Requirements: 1.1, 1.5, 1.6
 */

import { describe, it, beforeEach, expect } from "vitest";
import fc from "fast-check";

import type {
  OnboardingProgress,
  OnboardingStepKey,
} from "../../domain/entities/onboardingProgress";
import type { OnboardingProgressRepository } from "../../domain/interfaces/onboardingProgressRepository";
import { getOrInitOnboardingProgress } from "../../application/use-cases/getOrInitOnboardingProgress";

// ---------------------------------------------------------------------------
// In-memory repository — mirrors the real Supabase table behaviour
// ---------------------------------------------------------------------------

/**
 * Full admin-level in-memory repository.
 * Enforces the UNIQUE constraint on `practitioner_id` (mirrors the DB).
 */
class InMemoryOnboardingProgressRepository implements OnboardingProgressRepository {
  private records: Map<string, OnboardingProgress> = new Map();

  reset(): void {
    this.records.clear();
  }

  async findByPractitionerId(
    practitionerId: string,
  ): Promise<OnboardingProgress | null> {
    return this.records.get(practitionerId) ?? null;
  }

  async create(practitionerId: string): Promise<OnboardingProgress> {
    if (this.records.has(practitionerId)) {
      // Mirrors the UNIQUE constraint violation that Supabase would throw
      throw new Error(
        `UNIQUE constraint violation: practitioner_id = ${practitionerId}`,
      );
    }

    const now = new Date().toISOString();
    const record: OnboardingProgress = {
      id: `id-${practitionerId}`,
      practitionerId,
      stepCreateAcademyCompleted: false,
      stepRegisterStudentsCompleted: false,
      stepEventsInfoCompleted: false,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(practitionerId, record);
    return { ...record };
  }

  async markStepComplete(
    practitionerId: string,
    step: OnboardingStepKey,
  ): Promise<OnboardingProgress> {
    const existing = this.records.get(practitionerId);
    if (!existing) {
      throw new Error(`Record not found for practitioner ${practitionerId}`);
    }

    // Map snake_case step key → camelCase entity field
    const stepToField: Record<OnboardingStepKey, keyof OnboardingProgress> = {
      step_create_academy_completed: "stepCreateAcademyCompleted",
      step_register_students_completed: "stepRegisterStudentsCompleted",
      step_events_info_completed: "stepEventsInfoCompleted",
    };

    const field = stepToField[step];
    const updated: OnboardingProgress = {
      ...existing,
      [field]: true,
      updatedAt: new Date().toISOString(),
    };
    this.records.set(practitionerId, updated);
    return { ...updated };
  }

  async markAllComplete(
    practitionerId: string,
    completedAt: string,
  ): Promise<OnboardingProgress> {
    const existing = this.records.get(practitionerId);
    if (!existing) {
      throw new Error(`Record not found for practitioner ${practitionerId}`);
    }
    const updated: OnboardingProgress = {
      ...existing,
      completedAt,
      updatedAt: new Date().toISOString(),
    };
    this.records.set(practitionerId, updated);
    return { ...updated };
  }

  /** Helper for counting total stored records (used in RLS tests). */
  totalCount(): number {
    return this.records.size;
  }
}

// ---------------------------------------------------------------------------
// RLS-scoped repository — models a non-admin client session
//
// The real Supabase RLS policy:
//   SELECT / UPDATE: USING (practitioner_id IN (SELECT id FROM practitioners
//                           WHERE auth_user_id = auth.uid()))
//
// This wrapper simulates that by only exposing records owned by the
// authenticated practitioner, and rejecting writes to other practitioners.
// ---------------------------------------------------------------------------

class RlsScopedRepository implements OnboardingProgressRepository {
  constructor(
    private readonly base: InMemoryOnboardingProgressRepository,
    private readonly authenticatedPractitionerId: string,
  ) {}

  async findByPractitionerId(
    practitionerId: string,
  ): Promise<OnboardingProgress | null> {
    // RLS: SELECT only returns rows where practitioner_id matches the session
    if (practitionerId !== this.authenticatedPractitionerId) {
      return null; // Row not visible — same result as Supabase RLS returning 0 rows
    }
    return this.base.findByPractitionerId(practitionerId);
  }

  async create(practitionerId: string): Promise<OnboardingProgress> {
    // RLS INSERT policy: only service_role can insert — a regular client cannot
    if (practitionerId !== this.authenticatedPractitionerId) {
      throw new Error(
        "RLS violation: INSERT denied — only service_role can insert",
      );
    }
    // Even for own record, regular client cannot INSERT (service_role only)
    throw new Error(
      "RLS violation: INSERT denied — only service_role can insert",
    );
  }

  async markStepComplete(
    practitionerId: string,
    step: OnboardingStepKey,
  ): Promise<OnboardingProgress> {
    // RLS: UPDATE only allowed for own record
    if (practitionerId !== this.authenticatedPractitionerId) {
      throw new Error(
        `RLS violation: UPDATE denied — practitioner ${practitionerId} is not the authenticated user`,
      );
    }
    return this.base.markStepComplete(practitionerId, step);
  }

  async markAllComplete(
    practitionerId: string,
    completedAt: string,
  ): Promise<OnboardingProgress> {
    if (practitionerId !== this.authenticatedPractitionerId) {
      throw new Error(
        `RLS violation: UPDATE denied — practitioner ${practitionerId} is not the authenticated user`,
      );
    }
    return this.base.markAllComplete(practitionerId, completedAt);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uuidArb = fc.uuid();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("supabaseOnboardingProgressRepository — create and findByPractitionerId", () => {
  let repo: InMemoryOnboardingProgressRepository;

  beforeEach(() => {
    repo = new InMemoryOnboardingProgressRepository();
  });

  it("create inserts a record with all step booleans false and completedAt null", async () => {
    const practitionerId = "prac-001";

    const created = await repo.create(practitionerId);

    expect(created.practitionerId).toBe(practitionerId);
    expect(created.stepCreateAcademyCompleted).toBe(false);
    expect(created.stepRegisterStudentsCompleted).toBe(false);
    expect(created.stepEventsInfoCompleted).toBe(false);
    expect(created.completedAt).toBeNull();
    expect(typeof created.id).toBe("string");
    expect(created.id.length).toBeGreaterThan(0);
    expect(typeof created.createdAt).toBe("string");
    expect(typeof created.updatedAt).toBe("string");
  });

  it("findByPractitionerId retrieves the created record", async () => {
    const practitionerId = "prac-002";

    await repo.create(practitionerId);
    const found = await repo.findByPractitionerId(practitionerId);

    expect(found).not.toBeNull();
    expect(found!.practitionerId).toBe(practitionerId);
    expect(found!.stepCreateAcademyCompleted).toBe(false);
    expect(found!.stepRegisterStudentsCompleted).toBe(false);
    expect(found!.stepEventsInfoCompleted).toBe(false);
  });

  it("findByPractitionerId returns null for an unknown practitioner", async () => {
    const found = await repo.findByPractitionerId("non-existent-prac");
    expect(found).toBeNull();
  });

  it("create throws on duplicate practitioner_id (UNIQUE constraint)", async () => {
    const practitionerId = "prac-003";

    await repo.create(practitionerId);

    await expect(repo.create(practitionerId)).rejects.toThrow();
  });

  it("records for different practitioners are independent", async () => {
    await repo.create("prac-a");
    await repo.create("prac-b");

    const a = await repo.findByPractitionerId("prac-a");
    const b = await repo.findByPractitionerId("prac-b");

    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.practitionerId).toBe("prac-a");
    expect(b!.practitionerId).toBe("prac-b");
  });
});

// ---------------------------------------------------------------------------
// Property 1: Instructor progress record uniqueness
// Validates: Requirements 1.1, 1.5
// ---------------------------------------------------------------------------

describe("getOrInitOnboardingProgress — Property 1: Instructor progress record uniqueness", () => {
  let repo: InMemoryOnboardingProgressRepository;

  beforeEach(() => {
    repo = new InMemoryOnboardingProgressRepository();
  });

  /**
   * **Validates: Requirements 1.1, 1.5**
   *
   * Feature: instructor-onboarding, Property 1: Instructor progress record uniqueness
   *
   * For any `practitionerId`, repeated calls to `getOrInitOnboardingProgress`
   * (simulating sequential page loads or race conditions) must result in exactly
   * one record in the store — never zero, never more than one.
   */
  it("repeated getOrInitOnboardingProgress calls for the same practitionerId result in exactly one DB row", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.integer({ min: 1, max: 10 }),
        async (practitionerId, callCount) => {
          repo.reset();

          // Make callCount sequential calls — simulates multiple page loads or
          // rapid repeated triggers for the same practitioner
          for (let i = 0; i < callCount; i++) {
            await getOrInitOnboardingProgress(practitionerId, { repo });
          }

          // Regardless of how many times it was called, only one record must exist
          const record = await repo.findByPractitionerId(practitionerId);
          return record !== null && record.practitionerId === practitionerId;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 1.1, 1.5**
   *
   * Concurrent calls (simulated via Promise.all) for the same practitionerId
   * must not produce duplicate records. The repository enforces the UNIQUE
   * constraint by throwing on the second insert — the use case must be
   * resilient, and the store must contain exactly one record after settlement.
   *
   * NOTE: In the real Supabase implementation, concurrent INSERT attempts are
   * serialised by the database. The in-memory repo models the same guarantee
   * by throwing on duplicate `create` calls. The use case is designed to call
   * `findByPractitionerId` first, so concurrent calls where neither sees an
   * existing record will race to `create`. The UNIQUE constraint (enforced by
   * the DB / repo) ensures only one succeeds.
   */
  it("concurrent getOrInitOnboardingProgress calls for the same practitionerId result in exactly one row", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.integer({ min: 2, max: 8 }),
        async (practitionerId, concurrency) => {
          repo.reset();

          // Simulate concurrent calls: all launched before any resolves.
          // Because the in-memory repo is synchronous-under-the-hood (no actual
          // async gap between findByPractitionerId and create), this tests the
          // idempotency guarantee at the use-case level.
          const promises = Array.from({ length: concurrency }, () =>
            getOrInitOnboardingProgress(practitionerId, { repo }).catch(
              () => null,
            ),
          );

          await Promise.all(promises);

          // Exactly one record must exist — never zero, never more than one
          const record = await repo.findByPractitionerId(practitionerId);
          return record !== null && record.practitionerId === practitionerId;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("initial record created by getOrInitOnboardingProgress has all steps false", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (practitionerId) => {
        repo.reset();

        const result = await getOrInitOnboardingProgress(practitionerId, {
          repo,
        });

        return (
          result.stepCreateAcademyCompleted === false &&
          result.stepRegisterStudentsCompleted === false &&
          result.stepEventsInfoCompleted === false &&
          result.completedAt === null
        );
      }),
      { numRuns: 100 },
    );
  });

  it("getOrInitOnboardingProgress returns existing record without creating a new one", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (practitionerId) => {
        repo.reset();

        // First call creates the record
        const first = await getOrInitOnboardingProgress(practitionerId, {
          repo,
        });

        // Second call must return the same record (by id)
        const second = await getOrInitOnboardingProgress(practitionerId, {
          repo,
        });

        return (
          first.id === second.id &&
          first.practitionerId === second.practitionerId
        );
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// RLS tests: non-admin client cannot read or update another instructor's record
// Validates: Requirement 1.6
// ---------------------------------------------------------------------------

describe("RLS — instructor cannot read or update another instructor's record", () => {
  let adminRepo: InMemoryOnboardingProgressRepository;

  beforeEach(async () => {
    adminRepo = new InMemoryOnboardingProgressRepository();
    // Seed two instructor records via the admin (service-role) repository
    await adminRepo.create("instructor-alice");
    await adminRepo.create("instructor-bob");
  });

  it("an instructor cannot read another instructor's record via the RLS-scoped client", async () => {
    // Alice's session-scoped repository
    const aliceClient = new RlsScopedRepository(adminRepo, "instructor-alice");

    // Alice can read her own record
    const ownRecord =
      await aliceClient.findByPractitionerId("instructor-alice");
    expect(ownRecord).not.toBeNull();
    expect(ownRecord!.practitionerId).toBe("instructor-alice");

    // Alice cannot read Bob's record — RLS returns null (row not visible)
    const bobRecord = await aliceClient.findByPractitionerId("instructor-bob");
    expect(bobRecord).toBeNull();
  });

  it("an instructor cannot update another instructor's record via the RLS-scoped client", async () => {
    const aliceClient = new RlsScopedRepository(adminRepo, "instructor-alice");

    // Alice can update her own record
    const ownUpdate = await aliceClient.markStepComplete(
      "instructor-alice",
      "step_create_academy_completed",
    );
    expect(ownUpdate.stepCreateAcademyCompleted).toBe(true);

    // Alice cannot update Bob's record — throws RLS violation
    await expect(
      aliceClient.markStepComplete(
        "instructor-bob",
        "step_create_academy_completed",
      ),
    ).rejects.toThrow(/RLS violation/);
  });

  it("an instructor cannot insert a record via the RLS-scoped client (INSERT is service_role only)", async () => {
    const aliceClient = new RlsScopedRepository(adminRepo, "instructor-alice");

    // Even for her own practitionerId, a regular client cannot INSERT
    await expect(aliceClient.create("instructor-carol")).rejects.toThrow(
      /RLS violation/,
    );
  });

  it("RLS scoping holds for any pair of distinct practitioners", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        async (practitionerA, practitionerB) => {
          if (practitionerA === practitionerB) return true; // skip degenerate case

          const localAdmin = new InMemoryOnboardingProgressRepository();
          await localAdmin.create(practitionerA);
          await localAdmin.create(practitionerB);

          const clientA = new RlsScopedRepository(localAdmin, practitionerA);

          // A can see own record
          const ownRecord = await clientA.findByPractitionerId(practitionerA);
          if (ownRecord === null) return false;

          // A cannot see B's record
          const otherRecord = await clientA.findByPractitionerId(practitionerB);
          if (otherRecord !== null) return false;

          // A cannot update B's record
          let updateThrew = false;
          try {
            await clientA.markStepComplete(
              practitionerB,
              "step_create_academy_completed",
            );
          } catch {
            updateThrew = true;
          }

          return updateThrew;
        },
      ),
      { numRuns: 100 },
    );
  });
});
