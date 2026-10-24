# Air Orchestra — bounded implementation tickets

## Instruction for the implementing model

Implement only the next uncompleted ticket. Read SPEC.md and existing code first. Preserve documented interfaces. Do not add out-of-scope features or dependencies. Run the ticket checks and relevant existing checks. Report changed behavior, evidence, and unresolved failures. Report a missing dependency or inconsistent specification explicitly; do not substitute simulated behavior for a required capability.

Tickets are ordered; each depends on the preceding ticket. Check marks record implemented work; release and device evidence are tracked separately in docs/VERIFICATION.md.

## [x] A1 — Synthesizer and mouse instrument

Build a reusable oscillator/filter/gain engine. Pointer capture and keyboard release must silence notes; an explicit user action enables audio.

Verification: `npm run test:e2e`.

## [x] A2 — Local model in a worker

Bundle classic worker, model, WASM, checksums, and license notices. Initialize on camera activation only; test real model inference on a blank image. Do not represent that as a hand-detection test.

Verification: `npm run assets:prepare && npm run test:e2e`.

## [x] A3 — Gesture mapping and safety

Use palm-normalized pinch hysteresis, 70 ms note stabilization, expression smoothing, and 250 ms tracking loss. Require an open hand after initialization/reacquisition.

Verification: `npm test`.

## [x] A4 — Particle stage and tone presets

Render particles from actual control state. Respect reduced-motion preference. Keep vision off the rendering thread.

Verification: `npm run typecheck && npm run build`.

## [x] A5 — Recordings and replay

Record normalized controls up to 30 seconds; validate version, timestamps, ordering, bounds, duration and event count. Fix the preset during recording; release sound at replay completion.

Verification: `npm test && npm run test:e2e`.

## [x] A6 — Failure modes, device check and presentation

Handle denial, stopped camera, canceled startup, model errors, loading timeout, stale frames, tab hiding, and Escape. Verify real webcam behavior separately from replay. User confirmed the Chrome hand-tracking/sound-release check on October 24, 2026.

Verification: `npm run typecheck && npm test && npm run test:e2e && npm run build`.

## [x] Originality revision

## The other chair

After recording, invite your former self. A second monophonic synthesizer replays a snapshot of that phrase, with a 400 ms rest between loops, while your camera/mouse/keyboard controls the present voice. The ghost is pink, the present voice is mint. Dismiss the ghost or Stop to release it. Recording captures the present voice only; portable version 1 performances are single-voice controls, not a multitrack score. Camera frames are never recorded.

Verification: `npm run typecheck && npm run test:e2e && npm run build`.
