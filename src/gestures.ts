import { clamp } from "./utils";
export const NOTES = ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5"] as const;
export const MIDI = [60, 62, 64, 67, 69, 72, 74, 76];
export interface Landmark {
  x: number;
  y: number;
  z?: number;
}
export interface Hand {
  label: "Left" | "Right";
  landmarks: Landmark[];
}
export interface ControlEvent {
  timeMs: number;
  gate: boolean;
  note: number;
  volume: number;
  filter: number;
}
export const idle: ControlEvent = {
  timeMs: 0,
  gate: false,
  note: 0,
  volume: 0.35,
  filter: 1,
};
export class GestureMapper {
  state = { ...idle };
  lastSeen = -Infinity;
  requiresOpen = true;
  candidate = -1;
  candidateSince = 0;
  reset() {
    this.state = { ...idle };
    this.lastSeen = -Infinity;
    this.requiresOpen = true;
    this.candidate = -1;
  }
  mapLandmarks(hands: Hand[], timeMs: number): ControlEvent {
    const right = hands.find(
        (h) => h.label === "Right" && h.landmarks.length === 21,
      ),
      left = hands.find((h) => h.label === "Left" && h.landmarks.length === 21);
    const elapsed = Math.max(0, timeMs - this.state.timeMs);
    if (!right) {
      if (timeMs - this.lastSeen >= 250) {
        this.state.gate = false;
        this.requiresOpen = true;
        this.candidate = -1;
      }
      return { ...this.state, timeMs };
    }
    if (timeMs - this.lastSeen >= 250) {
      this.state.gate = false;
      this.requiresOpen = true;
      this.candidate = -1;
    }
    this.lastSeen = timeMs;
    const p = right.landmarks,
      dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y),
      scale = Math.max(0.02, dist(p[5], p[17])),
      pinch = dist(p[4], p[8]) / scale;
    if (pinch > 0.45) {
      this.requiresOpen = false;
      this.state.gate = false;
    } else if (pinch < 0.28 && !this.requiresOpen) this.state.gate = true;
    const target = clamp(Math.floor((1 - p[8].x) * 8), 0, 7);
    if (target !== this.candidate) {
      this.candidate = target;
      this.candidateSince = timeMs;
    }
    if (timeMs - this.candidateSince >= 70) this.state.note = target;
    const volume = left ? clamp(1 - left.landmarks[9].y, 0, 1) : 0.35,
      filter = left ? clamp(1 - left.landmarks[9].x, 0, 1) : 1,
      alpha = 1 - Math.exp(-Math.min(100, elapsed) / 60);
    this.state.volume += (volume - this.state.volume) * alpha;
    this.state.filter += (filter - this.state.filter) * alpha;
    this.state.timeMs = timeMs;
    return { ...this.state };
  }
}
