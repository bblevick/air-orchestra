# Air Orchestra — implementation specification

## Goal and audience

A recruiter can understand the result in 30 seconds, try it without an account, and inspect a reproducible, compact AI-assisted implementation. The application is a standalone static browser project; it uses no paid service or application backend.

## Required behavior

- A local MediaPipe hand model running in a dedicated classic worker, with one frame in flight and stale-frame dropping.
- Right-hand pinch gates eight C-major pentatonic notes; a left hand controls volume and filter. Sine and triangle presets.
- Mouse and keyboard alternatives, explicitly prerecorded demo mode, 30-second control recording, replay, and validated JSON transfer.

## Runtime interfaces

Worker initialization receives `{type: "init", base}`. A ready response enables capture. Frame messages transfer an `ImageBitmap` with a monotonic timestamp; every bitmap is closed in the worker. Results contain landmarks, handedness, and measured inference duration. There is at most one frame in flight. Startup timeout is 30 seconds; stalled frames time out after 10 seconds. The application terminates its worker and stops camera tracks when leaving camera mode.

`GestureMapper.mapLandmarks(hands, timeMs)` produces a `ControlEvent`: relative timestamp, gate, note index (0–7), normalized volume and filter. Notes are C4, D4, E4, G4, A4, C5, D5, E5. Pinch distance is divided by palm width; gate thresholds are 0.28/0.45. After loss of tracking for 250 ms, the gate releases and an open hand is required before a new pinch. Left-hand absence uses a comfortable fixed volume and an open filter.

`Performance` version 1 stores `preset`, `durationMs`, and ordered `ControlEvent[]`. Imports are capped at 1 MB, 30 seconds, and 2,000 events. Negative, non-finite, out-of-range, or unordered values are rejected. Performance files contain controls, not webcam frames. There is no network upload.

## Input and sound

Click Start sound or an input action to enable Web Audio. In mouse mode, hold the primary pointer button on the stage and move it. Alternatively focus the stage and hold a key from 1–8. Escape or Stop releases the instrument and disables the camera. Tab hiding stops capture and releases sound. Preset selection is disabled during recording so replay retains the correct timbre.

`window.airOrchestra` exposes capture/diagnostic state without triggering camera access. The prerecorded demo is generated control data, not a saved camera session.

## Local assets

```sh
npm run assets:prepare
```

This bundles the classic worker and copies WASM from the exact locked MediaPipe package. The model is downloaded only if missing. The command runs automatically before development and production builds. `public/model-provenance.json` records package version, source and SHA-256 checksums. Runtime assets are served locally; no external CDN is used.

## Architecture and presentation

Local camera frame → classic inference worker → landmarks → gesture controls → synthesizer + particles + recording.

A dark performance stage: pale mint notes, magenta expression, and a restrained luminous field. The signature is a living contour that responds to the same controls that drive the synthesizer.

Keep logic, rendering, I/O, and interface orchestration separate. Use the exact locked dependencies. Test Chrome/Chromium first, WebKit for automated compatibility, and native Safari for visible control checks. Support keyboard focus, viewport resizing, visible errors, reset, and reduced motion. Only measured or directly verified behavior may be described as validated.

## Exclusions

Two bounded monophonic voices with a pretrained model, not custom-trained gesture recognition. Real tracking depends on lighting, framing, and camera hardware. The demonstration video shows labeled demo replay and mouse input; it is not evidence of live webcam tracking. Real-hand Chrome behavior was separately confirmed by the user on October 24, 2026; no quantitative camera-latency benchmark is claimed.

## Acceptance

Run type checking, unit tests, browser tests, and a production build. Verify project-base asset paths with the built output. Inspect three screenshots and a 50-second video. Record source/model notices and actual verification results. A public URL is considered live only after an HTTP check and a browser smoke check.

## Originality revision requested by the user

## The other chair

After recording, invite your former self. A second monophonic synthesizer replays a snapshot of that phrase, with a 400 ms rest between loops, while your camera/mouse/keyboard controls the present voice. The ghost is pink, the present voice is mint. Dismiss the ghost or Stop to release it. Recording captures the present voice only; portable version 1 performances are single-voice controls, not a multitrack score. Camera frames are never recorded.
