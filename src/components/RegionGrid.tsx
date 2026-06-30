// The 16 hint regions. Each card shows the region's remaining/total point
// value (the hint) and a basket of the key items the player has found there.

import { For, Show } from "solid-js";
import { scores, session } from "../state";

export function RegionGrid() {
  return (
    <div class="region-grid">
      <For each={scores()}>
        {(r) => (
          <div
            class="region-card"
            data-empty={r.count === 0}
            data-clear={r.count > 0 && r.remaining === 0}
          >
            <div class="region-top">
              <span class="region-name">{r.name}</span>
              <Show when={session.revealPoints}>
                <span class="region-pts" title={`${r.remaining} of ${r.total} points remaining`}>
                  <span class="rp-remaining">{r.remaining}</span>
                  <Show when={r.total !== r.remaining}>
                    <span class="rp-total">/{r.total}</span>
                  </Show>
                </span>
              </Show>
            </div>
            <div class="region-basket">
              <Show
                when={r.found.length}
                fallback={<span class="basket-empty">no finds yet</span>}
              >
                <For each={r.found}>
                  {(f) => (
                    <span class="basket-item" title={f.location}>
                      {f.item}
                    </span>
                  )}
                </For>
              </Show>
            </div>
          </div>
        )}
      </For>
    </div>
  );
}
