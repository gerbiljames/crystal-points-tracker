// Connect to a live Archipelago slot. On success the board populates from the
// server (via scout) and finds mark themselves off as locations are checked.

import { createSignal, Show } from "solid-js";
import { connectLive } from "../state";

export function ConnectForm() {
  const [host, setHost] = createSignal("archipelago.gg");
  const [port, setPort] = createSignal("38281");
  const [slot, setSlot] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [prerelease, setPrerelease] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy()) return;
    setError(null);
    setBusy(true);
    try {
      await connectLive({
        host: host().trim(),
        port: Number(port()) || 38281,
        slot: slot().trim(),
        password: password() || undefined,
        prerelease: prerelease(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <form class="connect-form" onSubmit={submit}>
      <div class="connect-row">
        <input
          class="connect-host"
          type="text"
          placeholder="host"
          value={host()}
          onInput={(e) => setHost(e.currentTarget.value)}
        />
        <input
          class="connect-port"
          type="text"
          inputmode="numeric"
          placeholder="port"
          value={port()}
          onInput={(e) => setPort(e.currentTarget.value)}
        />
      </div>
      <input
        type="text"
        placeholder="slot name"
        value={slot()}
        onInput={(e) => setSlot(e.currentTarget.value)}
      />
      <input
        type="password"
        placeholder="password (optional)"
        value={password()}
        onInput={(e) => setPassword(e.currentTarget.value)}
      />
      <label class="switch connect-switch">
        <input
          type="checkbox"
          checked={prerelease()}
          onChange={(e) => setPrerelease(e.currentTarget.checked)}
        />
        <span class="switch-track">
          <span class="switch-knob" />
        </span>
        <span class="switch-text">Prerelease world</span>
      </label>
      <button class="connect-btn" type="submit" disabled={busy() || !host().trim() || !slot().trim()}>
        {busy() ? "connecting…" : "connect"}
      </button>
      <Show when={error()}>
        <div class="connect-error">{error()}</div>
      </Show>
    </form>
  );
}
