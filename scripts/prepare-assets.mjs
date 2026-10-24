import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
await mkdir("public/wasm", { recursive: true });
await cp("node_modules/@mediapipe/tasks-vision/wasm", "public/wasm", {
  recursive: true,
});
await build({
  entryPoints: ["src/inference.worker.ts"],
  outfile: "public/inference-worker.js",
  bundle: true,
  format: "iife",
  target: "es2022",
  minify: true,
  legalComments: "eof",
});
const url =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
try {
  await access("public/hand_landmarker.task");
} catch {
  const response = await fetch(url);
  if (!response.ok) throw Error(`Model download failed: ${response.status}`);
  await writeFile(
    "public/hand_landmarker.task",
    Buffer.from(await response.arrayBuffer()),
  );
}
const files = [
  "hand_landmarker.task",
  "inference-worker.js",
  "wasm/vision_wasm_internal.js",
  "wasm/vision_wasm_internal.wasm",
  "wasm/vision_wasm_nosimd_internal.js",
  "wasm/vision_wasm_nosimd_internal.wasm",
];
const hashes = {};
for (const f of files)
  hashes[f] = createHash("sha256")
    .update(await readFile("public/" + f))
    .digest("hex");
await writeFile(
  "public/model-provenance.json",
  JSON.stringify(
    {
      modelSource: url,
      package: "@mediapipe/tasks-vision",
      version: JSON.parse(
        await readFile(
          "node_modules/@mediapipe/tasks-vision/package.json",
          "utf8",
        ),
      ).version,
      license: "Apache-2.0; see THIRD_PARTY_NOTICES.md",
      sha256: hashes,
    },
    null,
    2,
  ),
);
console.log(
  "Bundled classic inference worker, local WASM, and model checksums.",
);
