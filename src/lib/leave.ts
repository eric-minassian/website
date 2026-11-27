/**
 * Fades a placeholder out over the content arriving in its place (`leaving` in globals.css), so the
 * two cross rather than one blinking into the other, then hides it.
 */
export function leave(placeholder: HTMLElement): void {
  if (placeholder.hidden) return;
  const done = () => {
    placeholder.hidden = true;
    placeholder.classList.remove("leaving");
  };
  placeholder.addEventListener("animationend", done, { once: true });
  // Should the animation never run (a hidden tab), the placeholder still goes.
  setTimeout(done, 600);
  placeholder.classList.add("leaving");
}
