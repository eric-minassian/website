import { moonPhase, sunDirection, type MoonPhase } from "../lib/moon";
import type { MoonScene, Rgb } from "./moon-scene";

const TEXTURE_URL = "/textures/moon.jpg";
const DAY_MS = 86_400_000;
const MAX_OFFSET_DAYS = 30;
const DRAG_PX_PER_DAY = 10;
const HOLD_AFTER_DRAG_MS = 700;
const HOLD_AFTER_KEY_MS = 2_500;
const CAPTION_REFRESH_MS = 600_000;
// The moon is decoration: fetch three.js once the visitor interacts, or after the page has been
// quiet for a few seconds, so it never competes with the page's own loading.
const LOAD_FALLBACK_MS = 4_000;
const INTERACTIONS = ["pointermove", "pointerdown", "keydown", "scroll", "touchstart"] as const;
const IDLE_OPACITY = 0.8;
// Real libration reaches about ±6.7° in latitude and ±7.9° in longitude.
const MAX_TILT_X = 0.1;
const MAX_TILT_Y = 0.12;
const ARROW_STEPS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };

const shortDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const clampDays = (days: number): number =>
  Math.max(-MAX_OFFSET_DAYS, Math.min(MAX_OFFSET_DAYS, days));

// Canvas 2D understands every CSS colour syntax (oklch included), so use it to resolve tokens.
const toRgb = (color: string): Rgb => {
  const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!context) return [0.5, 0.5, 0.5];
  // Mid grey stays if the browser can't parse the colour.
  context.fillStyle = "#808080";
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r = 128, g = 128, b = 128] = context.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
};

// Run after load, on the first interaction or the fallback delay, once the main thread is quiet.
const whenSettled = (callback: () => void): void => {
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    for (const type of INTERACTIONS) window.removeEventListener(type, start);
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(callback, { timeout: 1_000 });
    } else {
      callback();
    }
  };
  const arm = () => {
    for (const type of INTERACTIONS) window.addEventListener(type, start, { passive: true });
    window.setTimeout(start, LOAD_FALLBACK_MS);
  };

  if (document.readyState === "complete") arm();
  else window.addEventListener("load", arm, { once: true });
};

const describeWhen = (offsetDays: number, ms: number): string =>
  Math.abs(offsetDays) < 0.5 ? "Tonight" : longDate.format(ms);

const ariaLabel = (when: string, phase: MoonPhase, lit: number): string =>
  `Moon ${when === "Tonight" ? "tonight" : `on ${when}`}: ${phase.name.toLowerCase()}, ${lit}% lit. ` +
  "Use the arrow keys to see other nights.";

export const initMoon = (): void => {
  const root = document.querySelector<HTMLElement>("[data-moon]");
  const canvas = root?.querySelector("canvas");
  const hit = root?.querySelector<HTMLButtonElement>("[data-moon-hit]");
  const title = root?.querySelector("[data-moon-title]");
  const detail = root?.querySelector("[data-moon-detail]");
  const next = root?.querySelector("[data-moon-next]");
  if (!root || !canvas || !hit || !title || !detail || !next) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const tilt = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let scene: MoonScene | null = null;
  let phase = moonPhase(Date.now());
  let captionKey = Number.NaN;
  let offsetDays = 0;
  let drag: { x: number; start: number; moved: boolean } | null = null;
  let holdUntil = 0;
  let hovering = false;
  let opacity = IDLE_OPACITY;
  let frame = 0;
  let lastFrame = performance.now();

  // Recompute the phase whenever the shown moment moves by ten minutes or more.
  const refreshCaption = () => {
    const ms = Date.now() + offsetDays * DAY_MS;
    const key = Math.round(ms / CAPTION_REFRESH_MS);
    if (key === captionKey) return;
    captionKey = key;

    phase = moonPhase(ms);
    const when = describeWhen(offsetDays, ms);
    const lit = Math.round(phase.illumination * 100);
    title.textContent = `${when} · ${phase.name}`;
    detail.textContent = `${lit}% lit · ${phase.ageDays.toFixed(1)} days old`;
    next.textContent = `${phase.next.name} ${shortDate.format(phase.next.at)}`;
    hit.setAttribute("aria-label", ariaLabel(when, phase, lit));
  };

  const tick = (now: number) => {
    frame = 0;
    if (!scene) return;

    const dt = Math.min(0.1, Math.max(0, now - lastFrame) / 1000);
    lastFrame = now;
    const still = reducedMotion.matches;

    // After a drag or key press, ease back to tonight.
    if (!drag && offsetDays !== 0 && now >= holdUntil) {
      offsetDays = still || Math.abs(offsetDays) < 0.01 ? 0 : offsetDays * Math.exp(-5 * dt);
    }
    root.toggleAttribute("data-scrubbing", drag !== null || offsetDays !== 0);
    refreshCaption();

    const ease = still ? 1 : 1 - Math.exp(-6 * dt);
    const targetX = still ? 0 : tilt.targetX;
    const targetY = still ? 0 : tilt.targetY;
    const targetOpacity = hovering || drag ? 1 : IDLE_OPACITY;
    tilt.x += (targetX - tilt.x) * ease;
    tilt.y += (targetY - tilt.y) * ease;
    opacity += (targetOpacity - opacity) * ease;

    scene.render({ sun: sunDirection(phase.elongation), tilt: [tilt.x, tilt.y], opacity });

    const settled =
      !drag &&
      offsetDays === 0 &&
      Math.abs(targetX - tilt.x) < 1e-4 &&
      Math.abs(targetY - tilt.y) < 1e-4 &&
      Math.abs(targetOpacity - opacity) < 1e-3;
    if (!settled) requestFrame();
  };

  const requestFrame = () => {
    if (!frame && scene) frame = requestAnimationFrame(tick);
  };

  const applyColor = () => {
    scene?.setColor(toRgb(getComputedStyle(root).color));
    requestFrame();
  };

  hit.addEventListener("pointerenter", () => {
    hovering = true;
    requestFrame();
  });
  hit.addEventListener("pointerleave", () => {
    hovering = false;
    requestFrame();
  });
  hit.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    hit.setPointerCapture(event.pointerId);
    drag = { x: event.clientX, start: offsetDays, moved: false };
    requestFrame();
  });
  hit.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) > 3) drag.moved = true;
    offsetDays = clampDays(drag.start + dx / DRAG_PX_PER_DAY);
    requestFrame();
  });
  const endDrag = (event: PointerEvent) => {
    if (!drag) return;
    // Touch screens have no hover, so a tap toggles the caption instead.
    if (!drag.moved && event.pointerType !== "mouse") root.toggleAttribute("data-reveal");
    drag = null;
    holdUntil = performance.now() + HOLD_AFTER_DRAG_MS;
    requestFrame();
  };
  hit.addEventListener("pointerup", endDrag);
  hit.addEventListener("pointercancel", endDrag);
  hit.addEventListener("keydown", (event) => {
    const step = ARROW_STEPS[event.key];
    if (step) {
      event.preventDefault();
      offsetDays = clampDays(Math.round(offsetDays) + step * (event.shiftKey ? 7 : 1));
      holdUntil = performance.now() + HOLD_AFTER_KEY_MS;
    } else if (event.key === "Escape") {
      holdUntil = 0;
      root.removeAttribute("data-reveal");
    } else {
      return;
    }
    requestFrame();
  });
  hit.addEventListener("blur", () => {
    holdUntil = 0;
    requestFrame();
  });
  document.addEventListener("pointerdown", (event) => {
    if (event.target !== hit) root.removeAttribute("data-reveal");
  });
  window.addEventListener(
    "pointermove",
    (event) => {
      tilt.targetX = ((event.clientY / window.innerHeight) * 2 - 1) * MAX_TILT_X;
      tilt.targetY = ((event.clientX / window.innerWidth) * 2 - 1) * MAX_TILT_Y;
      requestFrame();
    },
    { passive: true },
  );
  reducedMotion.addEventListener("change", requestFrame);
  // The theme script toggles `.dark` on <html>; follow it so the dots match `--color-muted`.
  new MutationObserver(applyColor).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  window.setInterval(requestFrame, CAPTION_REFRESH_MS);

  refreshCaption();

  whenSettled(async () => {
    try {
      const { createMoonScene } = await import("./moon-scene");
      scene = await createMoonScene(canvas, TEXTURE_URL);
    } catch {
      // No WebGL (or the texture failed): leave the page exactly as it was.
      root.dataset.state = "unavailable";
      return;
    }

    scene.resize(canvas.clientWidth, canvas.clientHeight);
    new ResizeObserver(() => {
      scene?.resize(canvas.clientWidth, canvas.clientHeight);
      requestFrame();
    }).observe(canvas);
    scene.setColor(toRgb(getComputedStyle(root).color));
    tick(performance.now());
    root.dataset.state = "ready";
  });
};
