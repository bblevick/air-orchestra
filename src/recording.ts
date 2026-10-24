import { idle, type ControlEvent } from "./gestures";
export interface Performance {
  version: 1;
  preset: "sine" | "triangle";
  durationMs: number;
  events: ControlEvent[];
}
export function parsePerformance(value: unknown): Performance {
  const p = value as Performance;
  if (
    !p ||
    p.version !== 1 ||
    !["sine", "triangle"].includes(p.preset) ||
    !Number.isFinite(p.durationMs) ||
    p.durationMs <= 0 ||
    p.durationMs > 30000 ||
    !Array.isArray(p.events) ||
    p.events.length > 2000
  )
    throw Error(
      "Use a version 1 performance of up to 30 seconds and 2,000 events.",
    );
  let last = -1;
  for (const e of p.events) {
    if (
      !e ||
      !Number.isFinite(e.timeMs) ||
      e.timeMs < last ||
      e.timeMs < 0 ||
      e.timeMs > p.durationMs ||
      typeof e.gate !== "boolean" ||
      !Number.isInteger(e.note) ||
      e.note < 0 ||
      e.note > 7 ||
      !Number.isFinite(e.volume) ||
      e.volume < 0 ||
      e.volume > 1 ||
      !Number.isFinite(e.filter) ||
      e.filter < 0 ||
      e.filter > 1
    )
      throw Error("Invalid or unordered control event.");
    last = e.timeMs;
  }
  return {
    version: 1,
    preset: p.preset,
    durationMs: p.durationMs,
    events: p.events.map((e) => ({ ...e })),
  };
}
export function eventAt(p: Performance, ms: number): ControlEvent {
  if (ms < 0 || ms >= p.durationMs) return { ...idle, timeMs: ms };
  let result = { ...idle };
  for (const e of p.events) {
    if (e.timeMs > ms) break;
    result = e;
  }
  return { ...result, timeMs: ms };
}
export function demoPerformance(): Performance {
  const events: ControlEvent[] = [];
  for (let i = 0; i < 480; i++) {
    const t = i * 50,
      beat = Math.floor(t / 400);
    events.push({
      timeMs: t,
      gate: t % 400 < 300,
      note: [0, 2, 3, 4, 7, 6, 4, 3, 2, 1, 3, 5][beat % 12],
      volume: 0.4 + 0.18 * Math.sin(t / 2600),
      filter: 0.5 + 0.3 * Math.sin(t / 1700),
    });
  }
  return { version: 1, preset: "sine", durationMs: 24000, events };
}
