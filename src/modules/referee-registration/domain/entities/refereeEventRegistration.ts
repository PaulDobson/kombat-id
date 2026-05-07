// Domain entity — zero framework imports

export interface RefereeEventRegistration {
  id: string; // UUID
  publicationId: string; // UUID → referee_portal_publications.id
  refereeUserId: string; // UUID → auth.users.id (role: referee)
  registeredAt: string; // ISO timestamp
  createdAt: string; // ISO timestamp
}
