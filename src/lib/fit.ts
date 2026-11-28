/**
 * Puts as much of `text` in `el` as its box has room for, ending in "…" when it's cut. CSS's
 * ellipsis keeps the whole box and leaves its end empty past the last letter that fits, so a mark
 * after it (a name's arrow) would stand off from the text; cut here, the box ends where the text
 * does. The box's room is what it has with the whole text in it.
 */
export function fitText(el: HTMLElement, text: string): void {
  el.textContent = text;
  const room = el.clientWidth;
  if (el.scrollWidth <= room) return;
  let fits = 0;
  let over = text.length;
  // Cut after a whole letter: no space, hyphen or stop just before the "…".
  const cut = (n: number) => `${text.slice(0, n).replace(/[\s\-–—_.,:;]+$/, "")}…`;
  while (over - fits > 1) {
    const mid = Math.floor((fits + over) / 2);
    el.textContent = cut(mid);
    if (el.scrollWidth <= room) fits = mid;
    else over = mid;
  }
  el.textContent = cut(fits);
}
