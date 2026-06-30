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
        <a
          class="gh-link"
          href="https://github.com/gerbiljames/crystal-points-tracker"
          target="_blank"
          rel="noopener"
          aria-label="source on github"
          title="source on github"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
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
