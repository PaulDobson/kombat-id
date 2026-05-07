import type { RefereeEventRegistration } from "../entities/refereeEventRegistration";

export interface RefereeEventRegistrationWithRefereeInfo extends RefereeEventRegistration {
  refereeName: string;
  refereeEmail: string;
}

export interface RefereeEventRegistrationRepository {
  findById(id: string): Promise<RefereeEventRegistration | null>;
  findByPublicationAndReferee(
    publicationId: string,
    refereeUserId: string,
  ): Promise<RefereeEventRegistration | null>;
  findByPublication(
    publicationId: string,
  ): Promise<RefereeEventRegistrationWithRefereeInfo[]>;
  findByReferee(refereeUserId: string): Promise<RefereeEventRegistration[]>;
  countByPublication(publicationId: string): Promise<number>;
  save(registration: RefereeEventRegistration): Promise<void>;
  delete(id: string): Promise<void>;
}
