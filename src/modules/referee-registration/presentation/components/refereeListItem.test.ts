/**
 * Property-based tests for `toRefereeListItem` serialization.
 *
 * **Validates: Requisitos 2.2, 2.3**
 *
 * Propiedad 2: Serialización segura del DTO
 * Para cualquier `RefereeRegistration` válida con `status === "approved"`,
 * la conversión a `RefereeListItem` debe:
 *   1. Excluir estructuralmente los campos sensibles.
 *   2. Contener únicamente los 5 campos permitidos.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { toRefereeListItem } from "./refereeListItem";
import type { RefereeRegistration } from "../../domain/entities/refereeRegistration";

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------

/**
 * Generates a valid ISO timestamp string (e.g. "2024-03-15T10:30:00.000Z").
 * Uses integer milliseconds within a safe range to avoid invalid Date values
 * during fast-check shrinking.
 */
const isoTimestamp: fc.Arbitrary<string> = fc
  .integer({
    min: new Date("2000-01-01T00:00:00.000Z").getTime(),
    max: new Date("2099-12-31T23:59:59.999Z").getTime(),
  })
  .map((ms) => new Date(ms).toISOString());

/** Generates an arbitrary `RefereeRegistration` with `status === "approved"`. */
const approvedRegistration: fc.Arbitrary<RefereeRegistration> = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  fullName: fc.string({ minLength: 1, maxLength: 100 }),
  country: fc.string({ minLength: 1, maxLength: 60 }),
  registrationNumber: fc.string({ minLength: 1, maxLength: 50 }),
  certificatePath: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
    nil: null,
  }),
  status: fc.constant("approved" as const),
  authUserId: fc.option(fc.uuid(), { nil: null }),
  approvedAt: fc.option(isoTimestamp, { nil: null }),
  approvedBy: fc.option(fc.uuid(), { nil: null }),
  rejectedAt: fc.constant(null),
  rejectedBy: fc.constant(null),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

// ---------------------------------------------------------------------------
// Sensitive fields that must NEVER appear in the DTO
// ---------------------------------------------------------------------------

const SENSITIVE_FIELDS = [
  "email",
  "authUserId",
  "certificatePath",
  "approvedBy",
  "rejectedAt",
  "rejectedBy",
] as const;

// ---------------------------------------------------------------------------
// Allowed fields — the DTO must contain EXACTLY these keys
// ---------------------------------------------------------------------------

const ALLOWED_FIELDS = new Set([
  "id",
  "fullName",
  "country",
  "registrationNumber",
  "approvedAt",
]);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("toRefereeListItem — Propiedad 2: Serialización segura del DTO", () => {
  it("nunca incluye campos sensibles en el DTO resultante", () => {
    fc.assert(
      fc.property(approvedRegistration, (registration) => {
        const dto = toRefereeListItem(registration);

        for (const field of SENSITIVE_FIELDS) {
          expect(
            Object.prototype.hasOwnProperty.call(dto, field),
            `El DTO no debe contener el campo sensible "${field}"`,
          ).toBe(false);
        }
      }),
    );
  });

  it("contiene exactamente los 5 campos permitidos: id, fullName, country, registrationNumber, approvedAt", () => {
    fc.assert(
      fc.property(approvedRegistration, (registration) => {
        const dto = toRefereeListItem(registration);
        const keys = new Set(Object.keys(dto));

        // Every key in the DTO must be in the allowed set
        for (const key of keys) {
          expect(
            ALLOWED_FIELDS.has(key),
            `El DTO contiene un campo inesperado: "${key}"`,
          ).toBe(true);
        }

        // Every allowed key must be present in the DTO
        for (const expected of ALLOWED_FIELDS) {
          expect(
            keys.has(expected),
            `El DTO debe contener el campo "${expected}"`,
          ).toBe(true);
        }

        // Exactly 5 keys — no more, no less
        expect(keys.size).toBe(5);
      }),
    );
  });

  it("preserva correctamente los valores de los campos permitidos", () => {
    fc.assert(
      fc.property(approvedRegistration, (registration) => {
        const dto = toRefereeListItem(registration);

        expect(dto.id).toBe(registration.id);
        expect(dto.fullName).toBe(registration.fullName);
        expect(dto.country).toBe(registration.country);
        expect(dto.registrationNumber).toBe(registration.registrationNumber);
        expect(dto.approvedAt).toBe(registration.approvedAt);
      }),
    );
  });
});
