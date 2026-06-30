// The pool of scoring key items in the player's slot. Clicking a pip marks a
// copy as found, filing it into its region basket and dropping that region's
// remaining points. Items are grouped by name (a few items have >1 copy).

import { For, Show, createMemo } from "solid-js";
import { ScoredItem } from "../lib/scoring";
import { scored, session, toggleFound } from "../state";

interface Group {
  item: string;
  points: number;
  copies: ScoredItem[];
}

export function KeyItemTray() {
  const groups = createMemo<Group[]>(() => {
    const m = new Map<string, Group>();
    for (const s of scored()) {
      const g = m.get(s.item) || { item: s.item, points: s.points, copies: [] };
      g.copies.push(s);
      m.set(s.item, g);
    }
    return [...m.values()].sort(
      (a, b) => b.points - a.points || a.item.localeCompare(b.item),
    );
  });

  // Clicking the row toggles the whole group: if every copy is found, clear
  // them all; otherwise mark them all found. Pips keep per-copy control.
  const toggleGroup = (g: Group) => {
    const allFound = g.copies.every((c) => session.found[c.location]);
    for (const c of g.copies) {
      if (!!session.found[c.location] === allFound) toggleFound(c.location);
    }
  };

  return (
    <div class="tray">
      <div class="panel-head">
        Key Items <span class="muted">— click when you find one</span>
      </div>
      <Show
        when={groups().length}
        fallback={<div class="empty">No scoring key items in this slot.</div>}
      >
        <div class="tray-list">
          <For each={groups()}>
            {(g) => (
              <div
                class="tray-row"
                data-done={g.copies.every((c) => session.found[c.location])}
                onClick={() => toggleGroup(g)}
              >
                <span class={`pts pts-${g.points}`}>{g.points}</span>
                <span class="tray-name">{g.item}</span>
                <span class="pips">
                  <For each={g.copies}>
                    {(c) => (
                      <button
                        class="pip"
                        data-on={!!session.found[c.location]}
                        title={session.found[c.location] ? "found — click to undo" : "mark found"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFound(c.location);
                        }}
                      />
                    )}
                  </For>
                </span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
