// A DataSource yields the item placements for one Crystal slot. Today the
// only implementation reads an uploaded spoiler; a future LiveApSource can
// satisfy the same interface from a server connection without touching the UI.

import { Placement, parseSpoiler, slotsIn } from "./spoiler";

export interface DataSource {
  readonly kind: string;
  /** Slot names the source can offer (for the slot picker). */
  slots(): string[];
  /** Every placement the source knows about, across all slots. */
  allPlacements(): Placement[];
  /** All placements belonging to the given slot. */
  placementsForSlot(slot: string): Placement[];
}

export class SpoilerSource implements DataSource {
  readonly kind = "spoiler";
  readonly fileName: string;
  private readonly all: Placement[];

  constructor(fileName: string, text: string) {
    this.fileName = fileName;
    this.all = parseSpoiler(text);
  }

  slots(): string[] {
    return slotsIn(this.all);
  }

  allPlacements(): Placement[] {
    return this.all;
  }

  placementsForSlot(slot: string): Placement[] {
    return this.all.filter((p) => p.slot === slot);
  }
}
