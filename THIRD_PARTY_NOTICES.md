# Third-party notices

Original application code is MIT licensed (see LICENSE).

## MediaPipe

The bundled inference worker incorporates @mediapipe/tasks-vision 0.10.32, from Google MediaPipe, licensed under Apache License 2.0. The WASM loaders/binaries are copied from that exact package. The Apache license is retained at public/licenses/mediapipe-LICENSE.txt and remains available in deployed builds. Upstream: https://github.com/google-ai-edge/mediapipe .

The Hand Landmarker task model is the official Google-distributed float16 version 1 asset at https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task . Official task documentation: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker . The official Hand Tracking model card lists Apache License 2.0: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf . Retain this notice and the model provenance when redistributing the supplied task asset. This repository does not imply Google endorsement.

public/model-provenance.json records source, package version, and SHA-256 checksums for model/worker/WASM files. The generated worker retains dependency legal comments; application-specific integration changes are in src/inference.worker.ts.

No camera footage or user-imported performance files are bundled. The demo performance is generated control data written for this application. The demonstration soundtrack is synthesized from control events. Development dependencies retain their upstream licenses in their installed packages.
