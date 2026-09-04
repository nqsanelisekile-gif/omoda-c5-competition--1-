// The functions package is deployed independently of the frontend, so it
// keeps its own minimal copies of the types it actually uses rather than
// importing across the frontend/backend boundary. Keep these in sync with
// src/types/index.ts in the frontend when the schema changes.

export interface Competition {
  id: string;
  title: string;
  name?: string;
  prize?: string;
  entryFeeCents: number;
  entryPrice?: number;
  currency?: string;
  startDate?: number;
  closingAt: number;
  endDate?: number;
  totalEntries?: number;
  status: "draft" | "active" | "closed" | "winner_announced";
  isActive?: boolean;
}

export interface Entry {
  id: string;
  userId: string;
  competitionId: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  entryMethod: "paid" | "free_postal" | "free_sms";
  paymentId: string | null;
}
