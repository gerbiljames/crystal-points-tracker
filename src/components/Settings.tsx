// Settings panel: reveal toggle plus an optional per-item point override
// editor (mirrors the original's CustomPts). Overrides persist across seeds.

import { For, Show, createSignal } from "solid-js";
import { DEFAULT_ITEM_POINTS, SCORING_ITEMS, displayName } from "../lib/data";
import { session, setOverride, setReveal, modifiers } from "../state";

export function Settings() {
  const [open, setOpen] = createSignal(false);
  const valueFor = (item: string) =>
    item in session.overrides ? session.overrides[item] : DEFAULT_ITEM_POINTS[item];
  const onInput = (item: string, e: Event) => {
    const raw = (e.target as HTMLInputElement).value.trim();
    if (raw === "") return;
    const n = Math.max(0, Math.floor(Number(raw)));
    if (!Number.isNaN(n)) setOverride(item, n === DEFAULT_ITEM_POINTS[item] ? null : n);
  };
  const clearOverrides = () => {
    for (const item of Object.keys(session.overrides)) setOverride(item, null);
  };

  return (
    <div class="settings">
      <Show when={modifiers().length}>
        <div class="modifiers">
          <div class="modifiers-head">Active seed modifiers</div>
          <For each={modifiers()}>
            {(m) => (
              <div class="modifier-row">
                <span class="modifier-name">{m.modifier}</span>
                <span class="modifier-items">
                  {m.items.map(displayName).join(", ")} +{m.amount}
                </span>
              </div>
            )}
          </For>
        </div>
      </Show>

      <label class="switch">
        <input
          type="checkbox"
          checked={session.revealPoints}
          onChange={(e) => setReveal(e.currentTarget.checked)}
        />
        <span class="switch-track">
          <span class="switch-knob" />
        </span>
        <span class="switch-text">Show region points</span>
      </label>

      <button class="ghost wide" onClick={() => setOpen(!open())}>
        {open() ? "Hide" : "Edit"} point values
      </button>

      <Show when={open()}>
        <div class="pts-editor">
          <div class="pts-editor-head">
            <span class="muted">item → points</span>
            <button class="ghost tiny" onClick={clearOverrides}>
              reset
            </button>
          </div>
          <For each={SCORING_ITEMS}>
            {(item) => (
              <label class="pts-row">
                <span class="pts-row-name">{displayName(item)}</span>
                <input
                  type="number"
                  min="0"
                  value={valueFor(item)}
                  data-custom={item in session.overrides}
                  onInput={[onInput, item] as any}
                />
              </label>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
