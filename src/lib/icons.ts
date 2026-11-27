// The site's two small line icons, drawn rather than set: Newsreader has no arrows, so a typed
// "→" would fall back to whatever serif each system has.

/** `→`: leads to another page here. */
export const ARROW_RIGHT = "M2.5 8h10.5M9 4l4 4-4 4";
/** `↗`: opens somewhere else, in a new tab. */
export const ARROW_OUT = "M4.5 11.5l7-7M5.5 4.5h6v6";

/** An arrow as an inline SVG element, sized and stroked by the `.arrow` styles in globals.css. */
export function arrow(kind: "right" | "out"): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", `arrow arrow-${kind}`);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", kind === "right" ? ARROW_RIGHT : ARROW_OUT);
  svg.append(path);
  return svg;
}
