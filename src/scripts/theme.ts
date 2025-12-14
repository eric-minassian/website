/**
 * Theme toggle logic
 * Supports three modes: 'system' | 'light' | 'dark'
 */

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
const THEMES: Theme[] = ["system", "dark", "light"];

export const getTheme = (): Theme =>
  (localStorage.getItem(STORAGE_KEY) as Theme) || "system";

export const prefersDark = (): boolean =>
  matchMedia("(prefers-color-scheme: dark)").matches;

export const isDark = (theme: Theme = getTheme()): boolean =>
  theme === "dark" || (theme === "system" && prefersDark());

/** Inline script to prevent FOUC - must be called before page render */
export const getThemeScript = (): string => `
{
  const t = localStorage.getItem("${STORAGE_KEY}") || "system";
  const d = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  if (d) document.documentElement.classList.add("dark");
}
`;

export const applyDarkClass = (): void => {
  document.documentElement.classList.toggle("dark", isDark());
};

const updateUI = (): void => {
  const theme = getTheme();
  // Update icons
  document.querySelectorAll<HTMLElement>("[data-theme-icon]").forEach((el) => {
    el.classList.toggle("active", el.dataset.themeIcon === theme);
  });
  // Update aria labels
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-label", `Theme: ${theme} (click to change)`);
  });
};

export const applyTheme = (): void => {
  applyDarkClass();
  updateUI();
};

const cycleTheme = (): void => {
  const next = THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length];
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme();
};

/** Initialize theme system - call once on page load */
export const initTheme = (): void => {
  // Update UI (dark class already applied by inline script)
  updateUI();

  // Listen for system preference changes
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getTheme() === "system") applyTheme();
  });

  // Handle Astro view transitions
  document.addEventListener("astro:after-swap", applyTheme);

  // Event delegation for toggle clicks
  document.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-theme-toggle]")) {
      e.preventDefault();
      cycleTheme();
    }
  });
};
