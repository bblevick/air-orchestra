import { describe, it, expect } from "vitest";
import { GestureMapper, type Hand } from "../src/gestures";
import { parsePerformance, eventAt, demoPerformance } from "../src/recording";
function hand(pinched: boolean, x = 0.3): Hand {
  const landmarks = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  landmarks[5] = { x: 0.3, y: 0.5 };
  landmarks[17] = { x: 0.7, y: 0.5 };
  landmarks[8] = { x, y: 0.2 };
  landmarks[4] = { x: x + (pinched ? 0.03 : 0.3), y: 0.2 };
  return { label: "Right", landmarks };
}
describe("gesture safety and performance data", () => {
  it("requires an open hand before the first pinch and after tracking loss", () => {
    const m = new GestureMapper();
    expect(m.mapLandmarks([hand(true)], 0).gate).toBe(false);
    m.mapLandmarks([hand(false)], 50);
    expect(m.mapLandmarks([hand(true)], 100).gate).toBe(true);
    expect(m.mapLandmarks([], 349).gate).toBe(true);
    expect(m.mapLandmarks([], 350).gate).toBe(false);
    expect(m.mapLandmarks([hand(true)], 400).gate).toBe(false);
    m.mapLandmarks([hand(false)], 450);
    expect(m.mapLandmarks([hand(true)], 500).gate).toBe(true);
  });
  it("debounces notes and resets input state", () => {
    const m = new GestureMapper();
    m.mapLandmarks([hand(false, 0.02)], 0);
    expect(m.mapLandmarks([hand(true, 0.02)], 40).note).toBe(0);
    expect(m.mapLandmarks([hand(true, 0.02)], 80).note).toBe(7);
    m.reset();
    expect(m.state.gate).toBe(false);
    expect(m.requiresOpen).toBe(true);
  });
  it("rejects malformed or unordered recordings", () => {
    const p = demoPerformance();
    expect(parsePerformance(p)).toEqual(p);
    expect(() => parsePerformance({ ...p, durationMs: 40000 })).toThrow();
    expect(() =>
      parsePerformance({ ...p, events: [p.events[1], p.events[0]] }),
    ).toThrow();
    expect(() =>
      parsePerformance({ ...p, events: [{ ...p.events[0], note: 99 }] }),
    ).toThrow();
  });
  it("replay gates are silent outside the recorded interval", () => {
    const p = demoPerformance();
    expect(eventAt(p, 0).gate).toBe(true);
    expect(eventAt(p, 350).gate).toBe(false);
    expect(eventAt(p, 24000).gate).toBe(false);
    expect(eventAt(p, -1).gate).toBe(false);
  });
});
