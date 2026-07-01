// A live Archipelago connection as a data source. Mirrors what SpoilerSource
// yields (placements + options + a slot name) but sourced from a server via
// archipelago.js, plus a live feed of checked locations so finds mark
// themselves off. See src/lib/source.ts for the sibling spoiler source.

import { Client, type Item } from "archipelago.js";
import { Placement } from "./spoiler";

// The AP game names — used for login and every data-package lookup. The
// prerelease world registers under a distinct name.
export const GAME = "Pokemon Crystal";
export const GAME_PRERELEASE = "Pokemon Crystal Prerelease";

export interface ConnectParams {
  host: string;
  port: number;
  slot: string;
  password?: string;
  prerelease?: boolean;
}

export interface LiveSnapshot {
  slot: string;
  placements: Placement[];
  options: Record<string, string>; // display-name/value form (see slotDataToOptions)
  found: Record<string, boolean>; // location label -> checked
}

/**
 * Translate a slot's `slot_data` (snake_case keys, integer values) into the
 * spoiler-header display strings the modifier rules in src/data/upgrades.json
 * compare against, so src/lib/upgrades.ts consumes them unchanged. Only the
 * modifier-relevant options are mapped; a missing key defaults to its inactive
 * value, which never fires a rule.
 */
export function slotDataToOptions(sd: Record<string, unknown>): Record<string, string> {
  const num = (k: string) => Number(sd[k] ?? 0);
  return {
    Dexsanity: String(num("dexsanity")),
    Dexcountsanity: String(num("dexcountsanity")),
    "Randomize Pokemon Requests": num("randomize_pokemon_requests") === 0 ? "Off" : "On",
    "Randomize Hidden Items": num("randomize_hidden_items") === 0 ? "No" : "Yes",
    "National Park Access": num("national_park_access") === 1 ? "Bicycle" : "Vanilla",
    "Mount Mortar Access": num("mount_mortar_access") === 1 ? "Rock Smash" : "Vanilla",
    // Shopsanity is an OptionSet -> a list of enabled shop names. Join it the way
    // the spoiler header renders it so the `includes` trigger matches either source.
    Shopsanity: Array.isArray(sd.shopsanity) ? (sd.shopsanity as string[]).join(", ") : "",
  };
}

// Pick the websocket protocol explicitly. archipelago.js otherwise tries wss
// first and only falls back to ws after that attempt fails, which can burn the
// whole login timeout against a plain-ws local server. Local/LAN hosts get ws;
// everything else gets wss. A protocol typed into the host is respected.
export function liveUrl(host: string, port: number): string {
  let h = host.trim().replace(/\/+$/, "");
  let proto = "";
  const m = h.match(/^(wss?):\/\//i);
  if (m) {
    proto = m[1].toLowerCase();
    h = h.slice(m[0].length);
  }
  // Normalize the host to a bare authority host with no port, bracketing any
  // IPv6 literal so the resulting URL is valid. The port argument is always
  // authoritative, so a port pasted into the host is dropped.
  const brPort = h.match(/^\[(.+)\]:\d+$/); // [ipv6]:port
  const br = h.match(/^\[(.+)\]$/); // [ipv6]
  if (brPort) h = `[${brPort[1]}]`;
  else if (br) h = `[${br[1]}]`;
  else if ((h.match(/:/g) || []).length === 1) h = h.replace(/:\d+$/, ""); // host:port
  else if (h.includes(":")) h = `[${h}]`; // bare IPv6 -> bracket
  if (!proto) {
    const isLocal =
      /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1|\[::1\])$/i.test(h) ||
      /\.local$/i.test(h) ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h);
    proto = isLocal ? "ws" : "wss";
  }
  return `${proto}://${h}:${port}`;
}

export interface LiveHandlers {
  /** Called with the location labels of every newly-checked location. */
  onChecked: (labels: string[]) => void;
  /** Called on an UNEXPECTED socket drop (not an intentional disconnect()). */
  onDisconnected?: () => void;
}

export class LiveApSource {
  readonly kind = "live";
  private client: Client | null = null;

  /**
   * Connect, scout every location in the slot for its placement, and seed the
   * found set from already-checked locations. Handlers fire for the life of the
   * connection; onDisconnected reports only unexpected drops.
   */
  async connect(p: ConnectParams, handlers: LiveHandlers): Promise<LiveSnapshot> {
    this.disconnect();
    const client = new Client();
    this.client = client;
    // Report only drops we didn't initiate: intentional disconnect() nulls
    // this.client before closing, so this identity check is already false.
    client.socket.on("disconnected", () => {
      if (this.client === client) handlers.onDisconnected?.();
    });
    const game = p.prerelease ? GAME_PRERELEASE : GAME;
    const url = liveUrl(p.host, p.port);

    // Warn about the common mixed-content trap: an https page can't open a ws://
    // (insecure) socket, so a local server is unreachable from the deployed site.
    if (url.startsWith("ws://") && typeof location !== "undefined" && location.protocol === "https:") {
      console.warn(
        "[live] this page is https but the server URL is ws:// — the browser will block it. " +
          "Open the tracker over http to reach a local server.",
      );
    }

    // Only pass `password` when set. Passing `{ password: undefined }` overrides
    // the library default of "" with undefined, which drops the field from the
    // Connect packet — the AP server then rejects it as an invalid packet.
    const options = p.password ? { password: p.password } : {};
    const slotData = (await client.login(url, p.slot, game, options)) as Record<string, unknown>;

    const items: Item[] = await client.scout(client.room.allLocations, 0);
    const placements: Placement[] = items.map((i) => ({
      location: i.locationName,
      slot: client.name,
      item: i.name,
      receiver: i.receiver.name,
    }));

    const found: Record<string, boolean> = {};
    for (const id of client.room.checkedLocations) {
      found[client.package.lookupLocationName(game, id)] = true;
    }

    client.room.on("locationsChecked", (locations) => {
      handlers.onChecked(locations.map((id) => client.package.lookupLocationName(game, id)));
    });

    return { slot: client.name, placements, options: slotDataToOptions(slotData), found };
  }

  disconnect(): void {
    const client = this.client;
    this.client = null; // mark intentional before closing so onDisconnected is suppressed
    client?.socket.disconnect();
  }
}
