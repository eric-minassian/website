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
  while (over - fits > 1) {
    const mid = Math.floor((fits + over) / 2);
    el.textContent = `${text.slice(0, mid).trimEnd()}…`;
    if (el.scrollWidth <= room) fits = mid;
    else over = mid;
  }
  el.textContent = `${text.slice(0, fits).trimEnd()}…`;
}
