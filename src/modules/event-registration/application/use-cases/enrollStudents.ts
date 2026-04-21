import {
  EventRegistration,
  determineInitialStatus,
  hasCapacity,
} from "../../domain/entities/eventRegistration";
import { EventAtCapacityError } from "../../domain/errors";
import { IEventRegistrationRepository } from "../../domain/interfaces/eventRegistrationRepository";

export interface EnrollStudentsInput {
  instructorId: string;
  eventId: string;
  registrationFee: number | null;
  maxParticipants: number | null;
  practitioners: Array<{ id: string; name: string }>;
}

export interface EnrollStudentsResult {
  enrolled: string[];
  skipped: Array<{ id: string; name: string }>;
}

export async function enrollStudents(
  input: EnrollStudentsInput,
  repository: IEventRegistrationRepository,
): Promise<EnrollStudentsResult> {
  const confirmedCount = await repository.countConfirmedByEvent(input.eventId);

  if (!hasCapacity(input.maxParticipants, confirmedCount)) {
    throw new EventAtCapacityError();
  }

  const enrolled: string[] = [];
  const skipped: Array<{ id: string; name: string }> = [];

  for (const practitioner of input.practitioners) {
    const existing = await repository.findByPractitionerAndEvent(
      practitioner.id,
      input.eventId,
    );

    if (existing) {
      skipped.push({ id: practitioner.id, name: practitioner.name });
      continue;
    }

    const now = new Date().toISOString();
    const status = determineInitialStatus(input.registrationFee);

    const registration: EventRegistration = {
      id: crypto.randomUUID(),
      eventId: input.eventId,
      practitionerId: practitioner.id,
      instructorId: input.instructorId,
      status,
      registeredAt: now,
      confirmedAt: status === "confirmada" ? now : null,
      confirmedBy: status === "confirmada" ? input.instructorId : null,
      cancelledAt: null,
      cancelledBy: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    };

    await repository.save(registration);
    enrolled.push(practitioner.name);
  }

  return { enrolled, skipped };
}
