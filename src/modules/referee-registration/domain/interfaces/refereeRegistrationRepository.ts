import type {
  RefereeRegistration,
  RefereeRegistrationStatus,
} from "../entities/refereeRegistration";

export interface RefereeRegistrationFilter {
  status?: RefereeRegistrationStatus;
  page?: number;
  pageSize?: number;
}

export interface RefereeRegistrationRepository {
  findById(id: string): Promise<RefereeRegistration | null>;
  findByEmail(email: string): Promise<RefereeRegistration | null>;
  findByAuthUserId(authUserId: string): Promise<RefereeRegistration | null>;
  findByRegistrationNumber(
    registrationNumber: string,
  ): Promise<RefereeRegistration | null>;
  list(
    filter: RefereeRegistrationFilter,
  ): Promise<{ items: RefereeRegistration[]; total: number }>;
  save(registration: RefereeRegistration): Promise<void>;
  updateStatus(
    id: string,
    status: RefereeRegistrationStatus,
    meta: {
      adminId: string;
      authUserId?: string;
      timestamp: string;
    },
  ): Promise<void>;
}
