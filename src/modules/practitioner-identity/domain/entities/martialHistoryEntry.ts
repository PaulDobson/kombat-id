export type EventType = "competition" | "seminar" | "exam";
export type EventScope = "national" | "international";

export interface MartialHistoryEntry {
  id: string;
  practitionerId: string;
  eventId: string | null;
  eventType: EventType;
  eventDate: string; // ISO date string (YYYY-MM-DD)
  result: string | null;
  notes: string | null;
  isCorrected: boolean;
  correctionNote: string | null;
  correctedAt: string | null;
  correctedBy: string | null;
  recordedBy: string; // admin UUID que registró la entrada
  createdAt: string;
  // Ranking internacional (Req 11.1, 11.6)
  eventScope: EventScope | null;
  eventCountry: string | null; // obligatorio cuando eventScope = 'international'
}
