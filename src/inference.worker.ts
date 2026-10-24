import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
let model: HandLandmarker | null = null;
self.onmessage = async (event: MessageEvent) => {
  const d = event.data;
  if (d.type === "init") {
    try {
      const vision = await FilesetResolver.forVisionTasks(d.base + "wasm");
      model = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: d.base + "hand_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      self.postMessage({ type: "ready" });
    } catch (e) {
      self.postMessage({ type: "error", message: String(e) });
    }
    return;
  }
  if (d.type === "frame") {
    try {
      if (!model) throw Error("The hand model is not ready.");
      const t = performance.now(),
        result = model.detectForVideo(d.frame, d.timestamp);
      self.postMessage({
        type: "result",
        timestamp: d.timestamp,
        inferenceMs: performance.now() - t,
        hands: result.landmarks.map((landmarks, i) => ({
          landmarks,
          label: result.handedness[i][0].categoryName,
        })),
      });
    } catch (e) {
      self.postMessage({ type: "error", message: String(e) });
    } finally {
      d.frame.close();
    }
  }
};
