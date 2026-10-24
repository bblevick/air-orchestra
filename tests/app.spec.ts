import { test, expect } from "@playwright/test";
test("mouse input, recording, replay and stop release sound", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#sound").click();
  await expect(page.locator("#sound")).toHaveText("✓ Sound enabled");
  await page.locator("#record").click();
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.35);
  await page.mouse.down();
  await expect(page.locator("#gate-display")).toHaveText("● PLAYING");
  await page.waitForTimeout(200);
  await page.mouse.up();
  await expect(page.locator("#gate-display")).toHaveText("○ REST");
  await page.locator("#record").click();
  await expect(page.locator("#replay")).toBeEnabled();
  const d = page.waitForEvent("download");
  await page.locator("#export").click();
  expect((await d).suggestedFilename()).toContain(".json");
  await page.locator("#replay").click();
  await expect(page.locator("#mode-label")).toContainText("REPLAY");
  await page.locator("#stop").click();
  await expect(page.locator("#gate-display")).toHaveText("○ REST");
  await page.locator("#demo").click();
  await expect(page.locator("#mode-label")).toContainText("PRERECORDED");
  await page.locator("#stop").click();
  expect(errors).toEqual([]);
});
test("camera denial and invalid imports keep alternatives usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        throw new DOMException("Permission denied", "NotAllowedError");
      },
    });
  });
  await page.goto("/");
  await page.locator("#camera").click();
  await expect(page.locator("#status")).toContainText("Camera unavailable");
  await page.locator("#performance-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":3}'),
  });
  await expect(page.locator("#status")).toContainText("version 1");
  await page.locator("#demo").click();
  await expect(page.locator("#mode-label")).toContainText("DEMO");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("real local model initializes in a classic worker and handles an actual image", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(
    () =>
      new Promise<{ hands: number; ms: number }>((resolve, reject) => {
        const w = new Worker("/inference-worker.js");
        const timeout = setTimeout(() => {
          w.terminate();
          reject(Error("Model timed out"));
        }, 60000);
        w.onerror = (e) => reject(Error(e.message));
        w.onmessage = async (e) => {
          if (e.data.type === "ready") {
            const c = document.createElement("canvas");
            c.width = 256;
            c.height = 256;
            c.getContext("2d")!.fillRect(0, 0, 256, 256);
            const bitmap = await createImageBitmap(c);
            w.postMessage({ type: "frame", frame: bitmap, timestamp: 1 }, [
              bitmap,
            ]);
          }
          if (e.data.type === "result") {
            clearTimeout(timeout);
            w.terminate();
            resolve({ hands: e.data.hands.length, ms: e.data.inferenceMs });
          }
          if (e.data.type === "error") {
            clearTimeout(timeout);
            w.terminate();
            reject(Error(e.data.message));
          }
        };
        w.postMessage({ type: "init", base: location.origin + "/" });
      }),
  );
  expect(result.hands).toBe(0);
  expect(result.ms).toBeGreaterThan(0);
});

test("a recorded former self plays alongside live input and stops cleanly", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#duet")).toBeDisabled();
  await page.locator("#record").click();
  await page.locator("canvas").focus();
  await page.keyboard.down("3");
  await page.waitForTimeout(200);
  await page.keyboard.up("3");
  await page.locator("#record").click();
  await page.locator("#duet").click();
  await expect(page.locator("#duet")).toHaveAttribute("aria-pressed", "true");
  await page.locator("canvas").focus();
  await page.keyboard.down("7");
  expect(
    await page.evaluate(() => (window as any).airOrchestra.current.note),
  ).toBe(6);
  expect(
    await page.evaluate(() => Boolean((window as any).airOrchestra.ghost)),
  ).toBe(true);
  await page.keyboard.up("7");
  await page.locator("#stop").click();
  expect(await page.evaluate(() => (window as any).airOrchestra.ghost)).toBe(
    null,
  );
});
