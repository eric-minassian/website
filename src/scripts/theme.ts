// The page follows the system's light or dark setting until the visitor flips it. A flip always
// changes what's on screen, and flipping back to what the system wants forgets the choice, so the
// page follows the system again.
type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
/** Each theme's canvas (globals.css), for the browser's own chrome. */
const CANVAS: Record<Theme, string> = { light: "#f8f5ed", dark: "#1a1917" };

const stored = (): Theme | null => {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
};

const system = (): Theme => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

/** The theme on screen. */
export const currentTheme = (): Theme => stored() ?? system();

/** Runs in the head before the first paint, so the page never flashes the other theme. */
export const getThemeScript = (): string => `
{
  document.documentElement.classList.remove("no-js");
  const t = localStorage.getItem("${STORAGE_KEY}");
  const d = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  if (d) document.documentElement.classList.add("dark");
  if (t === "light" || t === "dark") {
    const c = ${JSON.stringify(CANVAS)}[t];
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", c));
  }
}
`;

/**
 * The toggle names what it will do, and its icon shows it (CSS, from the `dark` class); the
 * browser's chrome takes the chosen canvas, or each scheme's own while the page follows the system.
 */
const updateUI = (): void => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.querySelectorAll<HTMLElement>("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-label", `Switch to ${next} theme`);
    btn.title = `Switch to ${next} theme`;
  });
  const chosen = stored();
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = CANVAS[chosen ?? (meta.media.includes("dark") ? "dark" : "light")];
  });
};

const applyTheme = (): void => {
  document.documentElement.classList.toggle("dark", currentTheme() === "dark");
  updateUI();
};

/**
 * Flips the theme at once: the toggle's icon turning is the only motion. Transitions are held off
 * for the frame of the swap (`flipping` in globals.css), so nothing fades through the new
 * background on its way to its new colour.
 */
const flipTheme = (): void => {
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";
  if (next === system()) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, next);
  const root = document.documentElement;
  root.classList.add("flipping");
  applyTheme();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("flipping")));
};

export const initTheme = (): void => {
  updateUI();

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!stored()) applyTheme();
  });

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    if (!e.target.closest("[data-theme-toggle]")) return;
    e.preventDefault();
    flipTheme();
  });
};
