/**
 * Reading days off a chart by touch: a tap reads the day under it, a sideways drag reads each day
 * it crosses, and an upright drag stays a scroll (the element has `touch-action: pan-y`), so
 * scrolling past a chart never leaves a reading open. A mouse reads as it moves, elsewhere.
 */
export function touchScrub(
  el: HTMLElement,
  read: (e: PointerEvent) => void,
  putAway: () => void,
): void {
  let press: { id: number; x: number; y: number; dragging: boolean } | null = null;
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, dragging: false };
  });
  el.addEventListener("pointermove", (e) => {
    if (!press || e.pointerId !== press.id) return;
    const dx = Math.abs(e.clientX - press.x);
    const dy = Math.abs(e.clientY - press.y);
    if (!press.dragging && dx > 6 && dx > dy) {
      press.dragging = true;
      el.setPointerCapture(e.pointerId);
    }
    if (press.dragging) read(e);
  });
  el.addEventListener("pointerup", (e) => {
    if (press && e.pointerId === press.id && !press.dragging) read(e);
    press = null;
  });
  // The browser took the gesture for a scroll: a reading left open goes, as for a tap elsewhere.
  el.addEventListener("pointercancel", () => {
    press = null;
    putAway();
  });
}
