import { randomBytes } from "crypto";

export class EntryCodeCollision extends Error {
  constructor() {
    super("Entry code collision");
    this.name = "EntryCodeCollision";
  }
}

export function createEntryCode(): string {
  const value = randomBytes(4).toString("hex").toUpperCase();
  return `DRD-${value.slice(0, 4)}-${value.slice(4)}`;
}
