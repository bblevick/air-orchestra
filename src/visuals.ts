import { NOTES, type ControlEvent, type Hand } from "./gestures";
const connections = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [5, 9, 10, 11, 12],
  [9, 13, 14, 15, 16],
  [13, 17, 18, 19, 20],
  [0, 17],
];
export function paint(
  canvas: HTMLCanvasElement,
  event: ControlEvent,
  timeMs: number,
  hands: Hand[],
  reduced: boolean,
  ghost?: ControlEvent,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = (canvas.width = 1100),
    h = (canvas.height = 600);
  ctx.fillStyle = "#080e14";
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2,
    cy = h / 2;
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 440);
  glow.addColorStop(0, event.gate ? "#12303e" : "#0d1c2b");
  glow.addColorStop(1, "#080e14");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#20303d";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const x = 80 + (i * (w - 160)) / 7;
    ctx.beginPath();
    ctx.moveTo(x, 100);
    ctx.lineTo(x, h - 80);
    ctx.stroke();
    ctx.font = "10px monospace";
    ctx.fillStyle = event.note === i ? "#a6f7e8" : "#667c90";
    ctx.fillText(NOTES[i], x - 7, h - 50);
  }
  const noteX = 80 + (event.note * (w - 160)) / 7,
    now = reduced ? 1000 : timeMs;
  for (let ring = 0; ring < 5; ring++) {
    ctx.beginPath();
    for (let j = 0; j <= 200; j++) {
      const a = (j / 200) * Math.PI * 2,
        r =
          75 +
          ring * 25 +
          (event.gate ? 18 : 6) * Math.sin(a * 5 + now / 600 + ring * 0.8) +
          event.volume * 18;
      const x = cx + Math.cos(a) * r * 1.5,
        y = cy + Math.sin(a) * r * 0.8;
      j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = ring % 2 ? "#b374ac" : "#71dacd";
    ctx.globalAlpha = 0.2 + ring * 0.11;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 100; i++) {
    const age = (now / 2200 + i * 0.618) % 1,
      a = i * 2.399 + now / 6000;
    const radius = 40 + age * 310,
      x = cx + Math.cos(a) * radius * 1.45,
      y = cy + Math.sin(a) * radius * 0.7;
    ctx.fillStyle = i % 3 ? "#91f4df" : "#e39fc8";
    ctx.globalAlpha = (1 - age) * (event.gate ? 0.8 : 0.18);
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + (event.gate ? event.volume * 3 : 0), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#b8f8e6";
  ctx.font = "italic 62px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(
    event.gate ? NOTES[event.note] : "Leave a little echo.",
    cx,
    event.gate ? cy + 17 : cy + 8,
  );
  if (!event.gate) {
    ctx.font = "12px monospace";
    ctx.fillStyle = "#8dabb7";
    ctx.fillText("YOUR NEXT NOTE IS STILL YOURS", cx, cy + 44);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#82e6d3";
  ctx.fillRect(noteX - 15, h - 91, 30, event.gate ? 5 : 2);
  if (ghost) {
    const gx = 80 + (ghost.note * (w - 160)) / 7;
    ctx.strokeStyle = "#e2a3cf";
    ctx.lineWidth = 2;
    ctx.globalAlpha = ghost.gate ? 0.9 : 0.25;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const y =
        h * 0.77 +
        Math.sin(x * 0.025 + now * 0.005) *
          (ghost.gate ? 18 + ghost.volume * 30 : 3);
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(gx, h * 0.77, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = "11px monospace";
    ctx.fillStyle = "#e2a3cf";
    ctx.fillText(
      `FORMER YOU / ${ghost.gate ? NOTES[ghost.note] : "REST"}`,
      30,
      h - 20,
    );
    ctx.fillStyle = "#91f4df";
    ctx.fillText(
      `PRESENT YOU / ${event.gate ? NOTES[event.note] : "LISTENING"}`,
      w - 280,
      h - 20,
    );
  }
  for (const hand of hands) {
    ctx.strokeStyle = hand.label === "Right" ? "#88eddd" : "#dd9bcf";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.85;
    for (const line of connections) {
      ctx.beginPath();
      line.forEach((index, i) => {
        const p = hand.landmarks[index],
          x = (1 - p.x) * w,
          y = p.y * h;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
    for (const p of hand.landmarks) {
      ctx.beginPath();
      ctx.arc((1 - p.x) * w, p.y * h, 3, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.font = "10px monospace";
  ctx.fillStyle = "#829bae";
  ctx.fillText("C MAJOR PENTATONIC / 8 NOTES", 30, 35);
  ctx.textAlign = "right";
  ctx.fillText("VISION + SOUND + MOTION", w - 30, 35);
  ctx.textAlign = "left";
}
