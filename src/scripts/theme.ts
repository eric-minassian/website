/**
 * Theme toggle logic
 * Supports two modes: 'light' | 'dark'
 */

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const THEMES: Theme[] = ["dark", "light"];

export const getTheme = (): Theme =>
  (localStorage.getItem(STORAGE_KEY) as Theme) || "dark";

export const isDark = (theme: Theme = getTheme()): boolean =>
  theme === "dark";

/** Inline script to prevent FOUC - must be called before page render */
export const getThemeScript = (): string => `
{
  const t = localStorage.getItem("${STORAGE_KEY}") || "dark";
  const d = t === "dark";
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
