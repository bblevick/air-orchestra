import "./style.css";
import { $, clamp, saveJSON } from "./utils";
import {
  GestureMapper,
  NOTES,
  idle,
  type ControlEvent,
  type Hand,
} from "./gestures";
import { Instrument } from "./audio";
import { paint } from "./visuals";
import {
  demoPerformance,
  eventAt,
  parsePerformance,
  type Performance,
} from "./recording";
$("app").innerHTML =
  `<header><a href="./" class="brand"><span class="mark">∿</span> GHOST NOTES <small>/ AIR ORCHESTRA</small></a><span class="head-note">ONE HUMAN. TWO MOMENTS.</span><span class="local-badge"><i></i> ON-DEVICE VISION</span></header><main><section class="intro"><div><p class="eyebrow">A SMALL EXPERIMENT IN MUSICAL MEMORY</p><h1>A duet with<br>your <em>former self.</em></h1></div><div class="intro-copy"><p>Play a phrase. Leave a ghost.<br>Answer it with your hands.</p><button id="sound" class="primary">↗ Start sound</button></div></section><section class="instrument"><div class="stage-wrap"><div class="stage-top"><span id="mode-label">MOUSE INSTRUMENT</span><span id="status" role="status">Sound is off · start sound to begin</span></div><canvas id="visual" width="1100" height="600" tabindex="0" aria-label="Musical stage. In mouse mode, hold and move the pointer to play. Keyboard: hold a number 1–8 to play a note; release it to stop."></canvas><div class="stage-bottom"><span id="note-display">— <small>NOTE</small></span><span id="gate-display">○ REST</span><span id="tracking">CAMERA OFF</span><span id="latency">— MS INFERENCE</span></div></div><aside><p class="eyebrow">CHOOSE YOUR INPUT</p><div class="modes" role="group" aria-label="Input mode"><button id="mouse" aria-pressed="true">↖ Mouse instrument</button><button id="camera" aria-pressed="false">◉ Enable camera</button><button id="demo" aria-pressed="false">▷ Demo replay</button></div><p class="privacy">Camera frames stay on your device.<br>The model runs locally, in a worker.</p><label for="preset">TONE COLOR</label><select id="preset"><option value="sine">Sine · pure & soft</option><option value="triangle">Triangle · warm & bright</option></select><div class="meter"><span>EXPRESSION</span><div><i id="volume-meter"></i></div></div><div class="recording"><p class="eyebrow">LEAVE A LITTLE OF YOURSELF HERE</p><button id="record">● Record performance</button><div class="record-meta"><output id="record-time">00.0 / 30.0s</output><span id="record-state">READY</span></div><div class="record-actions"><button id="replay" disabled>▷ Replay</button><button id="export" disabled>↓ JSON</button></div><label for="performance-file" class="file-button">↑ Import performance</label><input id="performance-file" class="sr-only" type="file" accept="application/json,.json"></div><section class="ghost-room"><span>THE OTHER CHAIR</span><button id="duet" disabled>＋ Invite your former self</button><p id="ghost-status">Record a phrase first. Your ghost will remember it.</p></section><button id="stop" class="stop">■ Stop & silence</button></aside></section><section class="how"><div><p class="eyebrow">A LITTLE CHOREOGRAPHY</p><h2>You have the next note.<br>Your ghost has the last one.</h2></div><article><span>01 / RIGHT HAND</span><h3>Find your note.</h3><p>Open your hand first, then pinch thumb and index finger to play. Move left and right through eight pentatonic notes.</p></article><article><span>02 / LEFT HAND</span><h3>Shape the feeling.</h3><p>Raise your hand for volume. Move sideways to brighten the filter. Remove it for a comfortable default.</p></article><article><span>03 / THE OTHER YOU</span><h3>Keep yourself company.</h3><p>Record a phrase, invite your former self, and play over its repeating memory. The pink trace is your ghost. Mint is you. No camera? Hold keys 1–8 or use the mouse.</p></article></section></main><footer><span>BUILT WITH AI. DIRECTED BY BEN LEVICKI.</span><span>MEDIAPIPE / WEB AUDIO / HUMAN MOVEMENT</span></footer>`;
const ghostInstrument = new Instrument();
const instrument = new Instrument(),
  mapper = new GestureMapper(),
  canvas = $<HTMLCanvasElement>("visual"),
  video = document.createElement("video");
video.muted = true;
video.playsInline = true;
let loadTimeout: ReturnType<typeof setTimeout> | undefined;
let stream: MediaStream | null = null,
  worker: Worker | null = null,
  frameBusy = false,
  cameraStarting = false,
  generation = 0,
  workerReady = false,
  mode: "mouse" | "camera" | "demo" | "replay" = "mouse",
  current: ControlEvent = { ...idle },
  hands: Hand[] = [],
  mouseDown = false,
  lastInference = 0,
  lastResult = -Infinity,
  inferenceTimes: number[] = [],
  recording = false,
  recordStart = 0,
  recordedEvents: ControlEvent[] = [],
  saved: Performance | null = null,
  replay: Performance | null = null,
  replayStart = 0,
  lastRecord = -Infinity;
let ghost: Performance | null = null,
  ghostStart = 0,
  ghostCurrent: ControlEvent = { ...idle };
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
async function startAudio() {
  await Promise.all([instrument.start(), ghostInstrument.start()]);
  $("sound").textContent = "✓ Sound enabled";
}
function status(s: string, error = false) {
  $("status").textContent = s;
  $("status").classList.toggle("error", error);
}
function setMode(next: typeof mode) {
  mode = next;
  mouseDown = false;
  current = { ...idle };
  mapper.reset();
  hands = [];
  instrument.silence();
  $("mode-label").textContent = {
    mouse: "MOUSE INSTRUMENT",
    camera: "LIVE HAND TRACKING",
    demo: "DEMO REPLAY · PRERECORDED",
    replay: "YOUR PERFORMANCE · REPLAY",
  }[mode];
  for (const key of ["mouse", "camera", "demo"])
    $(key).setAttribute("aria-pressed", String(mode === key));
}
function stopCamera() {
  clearTimeout(loadTimeout);
  generation++;
  cameraStarting = false;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  video.srcObject = null;
  worker?.terminate();
  worker = null;
  workerReady = false;
  frameBusy = false;
  hands = [];
  mapper.reset();
  $("camera").textContent = "◉ Enable camera";
  $("tracking").textContent = "CAMERA OFF";
}
function finishRecording() {
  if (!recording) return;
  const duration = Math.min(
    30000,
    Math.max(1, performance.now() - recordStart),
  );
  recording = false;
  $<HTMLSelectElement>("preset").disabled = false;
  saved = {
    version: 1,
    preset: $<HTMLSelectElement>("preset").value as "sine" | "triangle",
    durationMs: duration,
    events: recordedEvents.filter((e) => e.timeMs <= duration),
  };
  $("record").textContent = "● Record performance";
  $("record-state").textContent = "SAVED";
  $<HTMLButtonElement>("duet").disabled = false;
  $<HTMLButtonElement>("replay").disabled = false;
  $<HTMLButtonElement>("export").disabled = false;
}
function dismissGhost() {
  ghost = null;
  ghostCurrent = { ...idle };
  ghostInstrument.silence();
  $("duet").textContent = "＋ Invite your former self";
  $("duet").setAttribute("aria-pressed", "false");
  $("ghost-status").textContent = saved
    ? "Your last phrase is waiting in the other chair."
    : "Record a phrase first. Your ghost will remember it.";
}
$("duet").onclick = async () => {
  if (ghost) {
    dismissGhost();
    return;
  }
  if (!saved) return;
  try {
    finishRecording();
    await startAudio();
    if (mode === "demo" || mode === "replay") {
      replay = null;
      setMode("mouse");
    }
    ghost = structuredClone(saved);
    ghostStart = performance.now();
    ghostInstrument.setPreset(ghost.preset);
    $("duet").textContent = "− Dismiss the ghost";
    $("duet").setAttribute("aria-pressed", "true");
    $("ghost-status").textContent =
      "A recorded you, looping in pink. Play a new phrase in mint.";
    status("Duet ready · your recorded phrase + your live input");
  } catch (e) {
    status(String(e), true);
  }
};
function silence() {
  dismissGhost();
  finishRecording();
  mouseDown = false;
  replay = null;
  current = { ...idle };
  mapper.reset();
  stopCamera();
  setMode("mouse");
  instrument.silence();
  status("Stopped · sound released · camera off");
}
async function enableSound() {
  await startAudio();
  $("sound").textContent = "✓ Sound enabled";
  status("Sound ready · hold and move on the stage, or enable your camera");
}
$("sound").onclick = () => {
  void enableSound().catch((e) => status(String(e), true));
};
$("mouse").onclick = () => {
  finishRecording();
  stopCamera();
  replay = null;
  setMode("mouse");
  status("Mouse instrument · hold and move on the stage");
};
$("camera").onclick = async () => {
  if (stream || cameraStarting) {
    silence();
    return;
  }
  finishRecording();
  replay = null;
  stopCamera();
  setMode("camera");
  cameraStarting = true;
  const token = generation;
  status("Requesting camera permission…");
  $("camera").textContent = "◉ Cancel camera";
  try {
    await startAudio();
    const acquired = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
      audio: false,
    });
    if (token !== generation) {
      acquired.getTracks().forEach((t) => t.stop());
      return;
    }
    stream = acquired;
    video.srcObject = stream;
    await video.play();
    if (token !== generation) return;
    status("Loading the local hand model…");
    loadTimeout = setTimeout(() => {
      if (token === generation && !workerReady) {
        silence();
        status("Hand model loading timed out. Use mouse mode or retry.", true);
      }
    }, 30000);
    worker = new Worker(import.meta.env.BASE_URL + "inference-worker.js");
    worker.onerror = (e) => {
      if (token !== generation) return;
      silence();
      status(
        `Hand model error: ${e.message}. Use the mouse instrument or retry.`,
        true,
      );
    };
    worker.onmessage = (e) => {
      if (token !== generation) return;
      const d = e.data;
      if (d.type === "ready") {
        clearTimeout(loadTimeout);
        cameraStarting = false;
        workerReady = true;
        lastResult = performance.now();
        $("camera").textContent = "■ Camera off";
        status("Live model ready · open your right hand, then pinch to play");
      } else if (d.type === "result") {
        frameBusy = false;
        lastResult = performance.now();
        hands = d.hands;
        current = mapper.mapLandmarks(hands, lastResult);
        inferenceTimes.push(d.inferenceMs);
        if (inferenceTimes.length > 300) inferenceTimes.shift();
        $("latency").textContent = `${d.inferenceMs.toFixed(0)} MS INFERENCE`;
        $("tracking").textContent =
          `${hands.length} HAND${hands.length === 1 ? "" : "S"} TRACKED`;
      } else if (d.type === "error") {
        silence();
        status(
          `Hand model failed: ${d.message}. Use the mouse instrument or retry.`,
          true,
        );
      }
    };
    worker.postMessage({
      type: "init",
      base: new URL(import.meta.env.BASE_URL, location.origin).href,
    });
  } catch (e) {
    if (token !== generation) return;
    silence();
    status(
      `Camera unavailable: ${(e as Error).message}. Mouse and demo modes are available.`,
      true,
    );
  }
};
async function startReplay(p: Performance, isDemo: boolean) {
  dismissGhost();
  finishRecording();
  stopCamera();
  await startAudio();
  setMode(isDemo ? "demo" : "replay");
  replay = p;
  replayStart = performance.now();
  instrument.setPreset(p.preset);
  $<HTMLSelectElement>("preset").value = p.preset;
  status(
    isDemo
      ? "Demo replay · generated control events, not live tracking"
      : "Replaying your recorded controls",
  );
}
$("demo").onclick = () => {
  void startReplay(demoPerformance(), true).catch((e) =>
    status(String(e), true),
  );
};
$("replay").onclick = () => {
  if (saved)
    void startReplay(saved, false).catch((e) => status(String(e), true));
};
$("stop").onclick = silence;
$<HTMLSelectElement>("preset").onchange = () =>
  instrument.setPreset(
    $<HTMLSelectElement>("preset").value as "sine" | "triangle",
  );
$("record").onclick = async () => {
  if (recording) {
    finishRecording();
    return;
  }
  try {
    if (mode === "demo" || mode === "replay")
      throw Error("Switch to mouse or camera mode before recording.");
    await startAudio();
    recording = true;
    $<HTMLSelectElement>("preset").disabled = true;
    recordStart = performance.now();
    lastRecord = -Infinity;
    recordedEvents = [];
    $("record").textContent = "■ Finish recording";
    $("record-state").textContent = "RECORDING";
  } catch (e) {
    status((e as Error).message, true);
  }
};
$("export").onclick = () => {
  if (saved) saveJSON(saved, "air-orchestra-performance.json");
};
$<HTMLInputElement>("performance-file").onchange = async () => {
  try {
    const file = $<HTMLInputElement>("performance-file").files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) throw Error("Performance exceeds 1 MB.");
    const next = parsePerformance(JSON.parse(await file.text()));
    silence();
    saved = next;
    $<HTMLButtonElement>("duet").disabled = false;
    $<HTMLButtonElement>("replay").disabled = false;
    $<HTMLButtonElement>("export").disabled = false;
    $("record-state").textContent = "IMPORTED";
    status("Performance imported · press Replay to listen");
  } catch (e) {
    status((e as Error).message, true);
  } finally {
    $<HTMLInputElement>("performance-file").value = "";
  }
};
function mouse(e: PointerEvent) {
  if (mode !== "mouse") return;
  const rect = canvas.getBoundingClientRect();
  current = {
    timeMs: performance.now(),
    gate: mouseDown,
    note: clamp(Math.floor(((e.clientX - rect.left) / rect.width) * 8), 0, 7),
    volume: clamp(1 - (e.clientY - rect.top) / rect.height, 0, 1),
    filter: 0.8,
  };
}
canvas.onpointerdown = (e) => {
  if (mode !== "mouse") return;
  mouseDown = true;
  canvas.setPointerCapture(e.pointerId);
  mouse(e);
};
canvas.onpointermove = mouse;
canvas.onpointerup = canvas.onpointercancel = () => {
  mouseDown = false;
  current.gate = false;
  instrument.silence();
};
canvas.onlostpointercapture = () => {
  mouseDown = false;
  current.gate = false;
  instrument.silence();
};
canvas.onkeydown = (e) => {
  if (mode === "mouse" && /^[1-8]$/.test(e.key)) {
    e.preventDefault();
    current = {
      timeMs: performance.now(),
      gate: true,
      note: Number(e.key) - 1,
      volume: 0.4,
      filter: 0.8,
    };
  }
};
canvas.onkeyup = (e) => {
  if (/^[1-8]$/.test(e.key)) {
    current.gate = false;
    instrument.silence();
  }
};
canvas.onblur = () => {
  mouseDown = false;
  current.gate = false;
  instrument.silence();
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) silence();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") silence();
});
window.addEventListener("blur", () => {
  if (mode === "mouse") {
    mouseDown = false;
    current.gate = false;
    instrument.silence();
  }
});
let lastPaint = 0;
function tick(now: number) {
  if (mode === "camera" && workerReady) {
    if (now - lastResult > 250) {
      hands = [];
      current = mapper.mapLandmarks([], now);
    }
    if (now - lastResult > 10000) {
      silence();
      status(
        "Camera frames timed out. Retry camera mode or use the mouse.",
        true,
      );
    } else if (
      !frameBusy &&
      video.readyState >= 2 &&
      now - lastInference >= 33
    ) {
      frameBusy = true;
      lastInference = now;
      const token = generation;
      void createImageBitmap(video)
        .then((frame) => {
          if (token !== generation || !worker) {
            frame.close();
            return;
          }
          worker.postMessage({ type: "frame", frame, timestamp: now }, [frame]);
        })
        .catch((e) => {
          if (token !== generation) return;
          silence();
          status(`Camera frame failed: ${String(e)}`, true);
        });
    }
  }
  if (replay) {
    const elapsed = now - replayStart;
    current = eventAt(replay, elapsed);
    if (elapsed >= replay.durationMs) {
      replay = null;
      current = { ...idle };
      instrument.silence();
      status("Replay finished · press Demo replay or Replay to play again");
    }
  }
  if (ghost) {
    ghostCurrent = eventAt(
      ghost,
      (now - ghostStart) % (ghost.durationMs + 400),
    );
    ghostInstrument.apply({
      ...ghostCurrent,
      volume: ghostCurrent.volume * 0.6,
    });
  }
  instrument.apply(current);
  if (recording && now - lastRecord >= 33) {
    lastRecord = now;
    const t = Math.min(30000, now - recordStart);
    recordedEvents.push({ ...current, timeMs: t });
    $("record-time").textContent = `${(t / 1000).toFixed(1)} / 30.0s`;
    if (t >= 30000) finishRecording();
  }
  if (now - lastPaint >= 33) {
    paint(
      canvas,
      current,
      now,
      hands,
      reduced,
      ghost ? ghostCurrent : undefined,
    );
    lastPaint = now;
    $("note-display").replaceChildren(
      document.createTextNode(current.gate ? NOTES[current.note] : "—"),
    );
    const label = document.createElement("small");
    label.textContent = " NOTE";
    $("note-display").append(label);
    $("gate-display").textContent = current.gate ? "● PLAYING" : "○ REST";
    $("volume-meter").style.width = `${current.volume * 100}%`;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
(window as any).airOrchestra = {
  get mode() {
    return mode;
  },
  get current() {
    return current;
  },
  get saved() {
    return saved;
  },
  get ghost() {
    return ghost;
  },
  get ghostCurrent() {
    return ghostCurrent;
  },
  get modelReady() {
    return workerReady;
  },
  get inferenceTimes() {
    return inferenceTimes;
  },
  paintAt: (ms: number) => {
    const e = eventAt(demoPerformance(), ms % 24000);
    paint(canvas, e, ms, [], reduced);
  },
  stop: silence,
};
