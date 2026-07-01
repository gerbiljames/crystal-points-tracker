// Settings dialog: seed-modifier readout, the reveal toggle, and the per-item
// point-override editor. Reveal + overrides are global (persist across seeds).

import { For, Show, createEffect, onCleanup } from "solid-js";
import { DEFAULT_ITEM_POINTS, SCORING_ITEMS, displayName } from "../lib/data";
import { CONDITIONAL_ITEMS } from "../lib/upgrades";
import {
  itemOverrides,
  setItemOverride,
  clearItemOverrides,
  revealPoints,
  setReveal,
  conditional,
  settingsOpen,
  setSettingsOpen,
} from "../state";

export function Settings() {
  // Default scorers, plus conditional items (Sweet Scent, Headbutt) which read 0
  // unless their seed setting is active — always listed so they can be tuned.
  const defaultFor = (item: string) => DEFAULT_ITEM_POINTS[item] ?? conditional()[item] ?? 0;
  const editorItems = () => {
    const extra = CONDITIONAL_ITEMS.filter((i) => !(i in DEFAULT_ITEM_POINTS));
    return [...SCORING_ITEMS, ...extra].sort(
      (a, b) => defaultFor(b) - defaultFor(a) || displayName(a).localeCompare(displayName(b)),
    );
  };

  const valueFor = (item: string) =>
    item in itemOverrides() ? itemOverrides()[item] : defaultFor(item);
  // "custom" only when the stored override differs from the current effective
  // default — otherwise an override that matches a seed-activated default (e.g.
  // Sweet Scent at 5 under dexsanity) would keep a stale highlight.
  const isCustom = (item: string) =>
    item in itemOverrides() && itemOverrides()[item] !== defaultFor(item);
  const onInput = (item: string, e: Event) => {
    const raw = (e.target as HTMLInputElement).value.trim();
    if (raw === "") return;
    const n = Math.max(0, Math.floor(Number(raw)));
    if (!Number.isNaN(n)) setItemOverride(item, n === defaultFor(item) ? null : n);
  };

  const onBackdrop = (e: MouseEvent) => {
    if (e.target === e.currentTarget) setSettingsOpen(false);
  };

  createEffect(() => {
    if (!settingsOpen()) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  return (
    <Show when={settingsOpen()}>
      <div class="modal-backdrop" onClick={onBackdrop}>
        <div class="modal settings-modal" role="dialog" aria-modal="true" aria-label="settings">
          <div class="modal-head">
            <h2>Settings</h2>
            <button class="modal-close" onClick={() => setSettingsOpen(false)} aria-label="close">
              ✕
            </button>
          </div>

          <div class="modal-body settings">
            <label class="switch">
              <input
                type="checkbox"
                checked={revealPoints()}
                onChange={(e) => setReveal(e.currentTarget.checked)}
              />
              <span class="switch-track">
                <span class="switch-knob" />
              </span>
              <span class="switch-text">Show region points</span>
            </label>

            <div class="pts-editor">
              <div class="pts-editor-head">
                <span class="muted">item → points</span>
                <button class="ghost tiny" onClick={clearItemOverrides}>
                  reset
                </button>
              </div>
              <For each={editorItems()}>
                {(item) => (
                  <label class="pts-row">
                    <span class="pts-row-name">{displayName(item)}</span>
                    <input
                      type="number"
                      min="0"
                      value={valueFor(item)}
                      data-custom={isCustom(item)}
                      onInput={[onInput, item] as any}
                    />
                  </label>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
