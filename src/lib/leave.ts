/**
 * Fades a placeholder out over the content arriving in its place (`leaving` in globals.css), row by
 * row a step ahead of the rows that take over from them, so each is nearly gone before its
 * replacement shows, without a blank between; then hides it.
 */
export function leave(placeholder: HTMLElement): void {
  if (placeholder.hidden) return;
  const done = () => {
    placeholder.hidden = true;
    placeholder.classList.remove("leaving");
  };
  const last = placeholder.lastElementChild;
  placeholder.addEventListener("animationend", (e) => {
    if (e.target === last) done();
  });
  // Should the animation never run (a hidden tab), the placeholder still goes.
  setTimeout(done, 800);
  placeholder.classList.add("leaving");
}
