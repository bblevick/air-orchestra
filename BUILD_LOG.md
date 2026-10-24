# Build log

## 2026-10-24 — initial implementation

- User approved the three-project creative portfolio, local/free runtime, TypeScript/Vite stack, fully specified tickets, and selective runtime AI.
- Codex implemented the application in this repository, separating calculations/control mapping from rendering and browser orchestration.
- Used Node 24.22.1 LTS, committed exact dependency resolutions, and added checks and GitHub Pages deployment.
- Formatted source modules for maintainability; no shared framework, backend, or agent orchestration layer.
- Captured actual interface screenshots, a scripted browser demonstration, and a bounded frame-scheduling sample on the M4 / 24 GB development machine.

## Verification findings and corrections

- Used a bundled classic worker to support MediaPipe’s WASM loader without running inference on the UI thread.
- Real model initialization and inference on a blank image pass independently of demo replay; the blank image is not a hand-detection benchmark.
- Added cancellation generations, loading/stall timeouts, camera-track cleanup, open-hand reacquisition, and fixed recording presets.
- User tested Chrome with a real hand (pinch, horizontal movement, and removing the hand) and replied “it worked!” on 2026-10-24. This is user-confirmed device evidence; no camera frame or biometric recording was collected.
- Native Safari exercised labeled demo playback and stop-state release.

## Evidence boundaries

Automated Chromium/WebKit checks, native Safari control checks, and user-reported device checks are distinct. Performance JSON is a 120-frame headless scheduling sample, not an end-to-end latency measurement. Public deployment status is recorded after publication in docs/VERIFICATION.md.

## 2026-10-24 — user-directed originality revision

Record a phrase, invite your former self, and play a duet across two moments.

Implemented the interaction described in the README, updated the visual identity, and added a browser regression for the new behavior. The two additional portfolio projects were explicitly requested by the user.

First public CI found Linux WebKit’s missing worker GL context. Kept real inference coverage on Chromium and local macOS WebKit, explicitly excluded only that incompatible Linux/WebKit test, and retained all WebKit interface checks.
