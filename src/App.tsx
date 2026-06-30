import { For, Show, createMemo } from "solid-js";
import { session, scores, pending, loadSpoilerFile, selectSlot, cancelUpload, resetAll } from "./state";
import { Dropzone } from "./components/Dropzone";
import { RegionGrid } from "./components/RegionGrid";
import { KeyItemTray } from "./components/KeyItemTray";
import { Settings } from "./components/Settings";

export function App() {
  return (
    <div class="app">
      <header class="nav">
        <div class="brand">
          crystal<span class="brand-dot">.</span>points
        </div>
        <span class="brand-sub">archipelago hint tracker</span>
        <div class="spacer" />
        <Show when={session.fileName}>
          <span class="file-chip" title={session.fileName!}>
            {session.slot || session.fileName}
          </span>
          <button class="ghost" onClick={resetAll}>
            reset
          </button>
        </Show>
      </header>

      <main>
        <Show when={session.fileName} fallback={<Landing />}>
          <Tracker />
        </Show>
      </main>

      <Show when={pending()}>{(p) => <SlotDialog slots={p().slots} />}</Show>
    </div>
  );
}

function SlotDialog(props: { slots: string[] }) {
  return (
    <div class="modal-backdrop" onClick={cancelUpload}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Which slot is yours?</h2>
        <p class="muted">This spoiler has several players. Pick your Crystal game to track.</p>
        <div class="slot-list">
          <For each={props.slots}>
            {(s) => (
              <button class="slot-btn" onClick={() => selectSlot(s)}>
                {s}
              </button>
            )}
          </For>
        </div>
        <button class="ghost" onClick={cancelUpload}>
          cancel
        </button>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <section class="landing">
      <div class="blurb">
        <h1>
          <em>Point Tracker</em> for Pokémon Crystal Archipelago
        </h1>
        <p>
          Drop in an Archipelago multiworld spoiler. Every key item in your Crystal
          slot is grouped into one of sixteen regions and scored by importance. As you
          find items, file them away and watch each region's remaining points fall.
        </p>
        <ul class="blurb-list">
          <li>Badges 9 · HMs &amp; gear 7 · majors 5 · the rest 3.</li>
          <li>Progress is saved; refresh and pick up where you left off.</li>
        </ul>
      </div>
      <div class="landing-drop">
        <Dropzone onFile={(f) => void loadSpoilerFile(f)} />
      </div>
    </section>
  );
}

function Tracker() {
  const totals = createMemo(() => {
    const s = scores();
    return {
      remaining: s.reduce((n, r) => n + r.remaining, 0),
      total: s.reduce((n, r) => n + r.total, 0),
      items: s.reduce((n, r) => n + r.count, 0),
      found: s.reduce((n, r) => n + r.found.length, 0),
    };
  });

  return (
    <section class="tracker">
      <div class="tracker-bar">
        <div class="stat">
          <span class="stat-num">{totals().remaining}</span>
          <span class="stat-label">points left</span>
        </div>
        <div class="stat">
          <span class="stat-num">
            {totals().found}/{totals().items}
          </span>
          <span class="stat-label">key items found</span>
        </div>
        <div class="spacer" />
      </div>

      <div class="tracker-body">
        <RegionGrid />
        <aside class="side">
          <KeyItemTray />
          <Settings />
        </aside>
      </div>
    </section>
  );
}
