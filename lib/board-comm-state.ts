/**
 * Board v2 (?v2=1) — In-Progress card communication-state machine.
 *
 * Hayk 2026-07-01: designers request info from customers, then 5-15 messages
 * of back-and-forth follow. Cards STAY IN the In Progress column while this
 * happens; only the card's visual state changes.
 *
 * Three states:
 *   - "active"             — designer working. Timer running. Normal styling.
 *   - "awaiting-customer"  — request sent, waiting. Timer paused. Dimmed card.
 *   - "customer-replied"   — customer sent something. Timer paused. Amber
 *                            pulsing border + chime.
 *
 * Client-side only, in-memory. No Supabase migration.
 */

export type CommState =
  | "active"
  | "awaiting-customer"
  | "customer-replied";

/** Per-order communication metadata for cards in the In Progress column. */
export interface CommStateEntry {
  state: CommState;
  /** When did the current state begin (unix ms)? */
  stateChangedAt: number;
  /** For awaiting: comma-separated list of items requested from customer. */
  requestedItems?: string;
  /** For customer-replied: preview of latest customer message. */
  replyPreview?: string;
  /** Accumulated seconds the card has been in the "active" state. */
  workedSecondsAccumulated: number;
  /** When did the current active segment start? null if not currently active. */
  activeSegmentStartedAt: number | null;
}

export function defaultCommEntry(now: number = Date.now()): CommStateEntry {
  return {
    state: "active",
    stateChangedAt: now,
    workedSecondsAccumulated: 0,
    activeSegmentStartedAt: now,
  };
}

/** Compute total worked seconds for display (includes current active segment). */
export function totalWorkedSeconds(
  entry: CommStateEntry,
  now: number = Date.now()
): number {
  const segment =
    entry.activeSegmentStartedAt !== null
      ? Math.max(0, Math.floor((now - entry.activeSegmentStartedAt) / 1000))
      : 0;
  return entry.workedSecondsAccumulated + segment;
}

/** Transition an entry to a new state, updating timer bookkeeping. */
export function transitionCommState(
  entry: CommStateEntry,
  next: CommState,
  patch: Partial<
    Pick<CommStateEntry, "requestedItems" | "replyPreview">
  > = {},
  now: number = Date.now()
): CommStateEntry {
  // Pause the active segment when leaving "active".
  let workedSecondsAccumulated = entry.workedSecondsAccumulated;
  let activeSegmentStartedAt = entry.activeSegmentStartedAt;

  if (entry.state === "active" && next !== "active") {
    if (activeSegmentStartedAt !== null) {
      workedSecondsAccumulated += Math.max(
        0,
        Math.floor((now - activeSegmentStartedAt) / 1000)
      );
    }
    activeSegmentStartedAt = null;
  }
  if (entry.state !== "active" && next === "active") {
    activeSegmentStartedAt = now;
  }

  return {
    ...entry,
    ...patch,
    state: next,
    stateChangedAt: now,
    workedSecondsAccumulated,
    activeSegmentStartedAt,
  };
}

/** Format a duration in seconds → "42s", "12m", "2h 15m", "1d 4h". */
export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mRem = m % 60;
  if (h < 24) return mRem ? `${h}h ${mRem}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const hRem = h % 24;
  return hRem ? `${d}d ${hRem}h` : `${d}d`;
}

/** Format a "how long ago" string from an anchor unix-ms → "5m", "2h 10m". */
export function fmtSince(anchor: number, now: number = Date.now()): string {
  return fmtDuration(Math.max(0, Math.floor((now - anchor) / 1000)));
}

// ─── Chime (Web Audio, synth two-tone) ────────────────────────────────
let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedAudioCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      sharedAudioCtx = new Ctx();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/** Play a soft two-tone chime (E5 → G5). Silently no-ops if blocked. */
export function playChime(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const tone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    };
    tone(659.25, 0, 0.22); // E5
    tone(783.99, 0.18, 0.28); // G5
  } catch {
    // ignore
  }
}

// ─── Sound on/off toggle ─────────────────────────────────────────────
const SOUND_STORAGE_KEY = "workflow.board.chimeOn";

export function loadSoundOn(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(SOUND_STORAGE_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function saveSoundOn(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, on ? "1" : "0");
  } catch {
    // ignore
  }
}

// ─── Mock payloads for the demo simulate button ──────────────────────
export const MOCK_REQUEST_PAYLOADS = [
  "Updated artwork, Pantone ref",
  "Final logo file (vector), spot color confirmation",
  "Approved mockup, bleed marks",
  "High-res product photo, brand style guide",
  "Client sign-off, corrected copy",
];

export const MOCK_REPLY_PAYLOADS = [
  "Attached the updated file — please confirm the bleed matches the die line I sent last week.",
  "Pantone 347C is the correct green. Also can we bump the logo 10% larger?",
  "Approved on the mockup, one small tweak — swap the tagline to the new one below.",
  "Here's the vector file and our brand guide. Let me know if anything's missing.",
  "Sign-off attached. Please proceed with production and send tracking when it ships.",
  "Great, one question — can we do a foil accent on the front panel instead of matte?",
];

export function pickMockRequest(): string {
  return MOCK_REQUEST_PAYLOADS[
    Math.floor(Math.random() * MOCK_REQUEST_PAYLOADS.length)
  ];
}

export function pickMockReply(): string {
  return MOCK_REPLY_PAYLOADS[
    Math.floor(Math.random() * MOCK_REPLY_PAYLOADS.length)
  ];
}
