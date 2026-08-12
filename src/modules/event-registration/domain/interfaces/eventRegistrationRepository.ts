import {
  EventRegistration,
  RegistrationStatus,
} from "../entities/eventRegistration";

export interface RegistrationFilters {
  status?: RegistrationStatus;
}

export interface RegistrationWithDetails extends EventRegistration {
  practitionerName: string;
  instructorName: string;
}

export interface StatusCounts {
  pendiente_pago: number;
  confirmada: number;
  cancelada: number;
}

export interface IEventRegistrationRepository {
  findById(id: string): Promise<EventRegistration | null>;
  findByEvent(
    eventId: string,
    filters?: RegistrationFilters,
  ): Promise<RegistrationWithDetails[]>;
  findByPractitionerAndEvent(
    practitionerId: string,
    eventId: string,
  ): Promise<EventRegistration | null>;
  /**
   * Finds an active (non-cancelled) registration for a practitioner in a specific event.
   * Only returns registrations where status is not "cancelada".
   *
   * @param practitionerId - The ID of the practitioner
   * @param eventId - The ID of the event
   * @returns The active registration if found, or null if no registration exists or if the existing registration is cancelled
   */
  findActiveByPractitionerAndEvent(
    practitionerId: string,
    eventId: string,
  ): Promise<EventRegistration | null>;
  countConfirmedByEvent(eventId: string): Promise<number>;
  countByEventGroupedByStatus(eventId: string): Promise<StatusCounts>;
  save(registration: EventRegistration): Promise<void>;
  update(registration: EventRegistration): Promise<void>;
}
