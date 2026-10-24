# Verification — October 24, 2026

## Local checks

- Node 24.22.1 LTS on Apple M4 / 24 GB RAM.
- `npm run typecheck`: passed.
- `npm test`: 4 tests passed.
- `npm run test:e2e`: 8 checks passed across actual Chromium and Playwright WebKit. WebKit compatibility checks are distinct from native Safari checks.
- `BASE_PATH=/air-orchestra/ npm run build`: passed.
- Built-site repository-path smoke evidence: [production-path-check.json](production-path-check.json). It records missing responses, page errors, and external requests.
- Screenshots visually inspected at desktop width; browser checks include a 390-pixel viewport without horizontal overflow.
- Native Safari local-development controls exercised: Labeled demo playback and Stop state.
- Three interface screenshots and a 50-second MP4 walkthrough are included. [Media manifest](media-manifest.json) records actual video dimensions, duration and frames.
- [performance.json](performance.json) records a 120-frame headless scheduling sample with its context. It is not a camera or interaction latency benchmark.

## Specific acceptance

Gate hysteresis, note stabilization, tracking loss/reacquisition, recording validation, replay release, camera denial, and mouse recording/export/replay are covered. The real local MediaPipe model initializes and infers on a blank image in both browser engines. This checks loading/execution, not hand-detection accuracy.

A real-hand Chrome check was performed by the user at the local URL: open hand → pinch → horizontal movement → hand removed. The user replied **“it worked!”** on October 24, 2026. Record this as user-confirmed device behavior; no camera footage or measured latency was collected.

## Material limits

The local model and WASM assets total about 29 MB. First loading needs those static assets; runtime does not require an inference service.

The demonstration videos are scripted recordings of the actual apps. Air Orchestra’s demo mode is explicitly prerecorded control data and its video does not imply live camera detection.

## Release verification

Public deployment and clean-checkout verification are recorded after publication. No employer or hiring outcome is implied by these checks.

Clean-checkout verification: a fresh local Git clone passed `npm ci`, type checking, unit checks, production build with the repository base path, and the full Chromium/WebKit browser suite. The base-path preview exercised real interactions and bundled model assets with no page errors, HTTP failures, or external application requests. See `production-path-check.json`.
