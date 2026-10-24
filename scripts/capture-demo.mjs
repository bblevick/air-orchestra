import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
if (spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status !== 0)
  throw Error("Install FFmpeg and ensure it is on PATH.");
await mkdir(".artifacts/demo", { recursive: true });
await mkdir("docs/media", { recursive: true });
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "4203",
    "--strictPort",
  ],
  { stdio: "ignore" },
);
let browser, context;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:4203")).ok) break;
    } catch {}
    await wait(100);
    if (i === 99) throw Error("Demo server failed to start.");
  }
  browser = await chromium.launch({ channel: "chromium", headless: true });
  context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: { dir: ".artifacts/demo", size: { width: 1280, height: 900 } },
  });
  const page = await context.newPage(),
    video = page.video(),
    start = performance.now();
  await page.goto("http://127.0.0.1:4203");
  await page.evaluate(() => {
    window.captureAudioStart = performance.now();
    window.captureAudio = [];
    window.captureAudioTimer = setInterval(
      () =>
        window.captureAudio.push({
          timeMs: performance.now() - window.captureAudioStart,
          live: { ...window.airOrchestra.current },
          ghost: { ...window.airOrchestra.ghostCurrent },
          livePreset: document.getElementById("preset").value,
          ghostPreset: window.airOrchestra.ghost?.preset || "sine",
          ghostActive: Boolean(window.airOrchestra.ghost),
        }),
      40,
    );
  });

  await page.waitForFunction(() => Boolean(window.airOrchestra));
  await wait(1800);
  await page.locator(".instrument").scrollIntoViewIfNeeded();
  await page.locator("#record").click();
  const box = await page.locator("canvas").boundingBox();
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(
      box.x + (box.width * (i + 0.5)) / 8,
      box.y + box.height * (0.3 + (i % 3) * 0.1),
    );
    await page.mouse.down();
    await wait(550);
    await page.mouse.up();
    await wait(150);
  }
  await page.locator("#record").click();
  await page.locator("#duet").click();
  for (let i = 0; i < 10; i++) {
    await page.locator("canvas").focus();
    await page.keyboard.down(String(8 - (i % 8)));
    await wait(900);
    await page.keyboard.up(String(8 - (i % 8)));
    await wait(300);
  }
  await page.locator("#duet").click();
  await page.locator("#replay").click();
  await wait(6000);
  await page.locator("#demo").click();
  await wait(18000);
  await wait(Math.max(0, 51000 - (performance.now() - start)));

  const soundtrack = await page.evaluate(async () => {
    clearInterval(window.captureAudioTimer);
    const rate = 22050,
      duration = 51,
      ctx = new OfflineAudioContext(1, rate * duration, rate),
      midi = [60, 62, 64, 67, 69, 72, 74, 76];
    for (const stream of ["live", "ghost"])
      for (const preset of ["sine", "triangle"]) {
        const osc = ctx.createOscillator(),
          filter = ctx.createBiquadFilter(),
          gain = ctx.createGain();
        osc.type = preset;
        filter.type = "lowpass";
        osc.connect(filter).connect(gain).connect(ctx.destination);
        gain.gain.value = 0;
        for (const event of window.captureAudio) {
          const e = event[stream],
            t = Math.min(50.99, event.timeMs / 1000),
            enabled = stream === "live" || event.ghostActive;
          osc.frequency.setTargetAtTime(
            440 * 2 ** ((midi[e.note] - 69) / 12),
            t,
            0.015,
          );
          filter.frequency.setTargetAtTime(180 * 100 ** e.filter, t, 0.025);
          gain.gain.setTargetAtTime(
            enabled && e.gate && event[stream + "Preset"] === preset
              ? e.volume * 0.22 * (stream === "ghost" ? 0.6 : 1)
              : 0,
            t,
            0.02,
          );
        }
        osc.start();
      }
    const audio = await ctx.startRendering(),
      samples = audio.getChannelData(0),
      buffer = new ArrayBuffer(44 + samples.length * 2),
      v = new DataView(buffer);
    const str = (p, s) => {
      for (let i = 0; i < s.length; i++) v.setUint8(p + i, s.charCodeAt(i));
    };
    str(0, "RIFF");
    v.setUint32(4, 36 + samples.length * 2, true);
    str(8, "WAVE");
    str(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    str(36, "data");
    v.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++)
      v.setInt16(
        44 + i * 2,
        Math.max(-1, Math.min(1, samples[i])) * 32767,
        true,
      );
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  });
  await writeFile(
    ".artifacts/demo/audio.wav",
    Buffer.from(soundtrack, "base64"),
  );
  await context.close();
  context = null;
  const source = await video.path();
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      source,
      "-i",
      ".artifacts/demo/audio.wav",
      "-t",
      "50",
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "21",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      "docs/media/demo.mp4",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw Error(result.stderr);
  console.log("Created docs/media/demo.mp4 (50 seconds).");
} finally {
  await context?.close();
  await browser?.close();
  server.kill();
}
