type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
const THEMES: Theme[] = ["system", "dark", "light"];

const isTheme = (value: string | null): value is Theme =>
  value === "system" || value === "light" || value === "dark";

export const getTheme = (): Theme => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isTheme(stored) ? stored : "system";
};

export const prefersDark = (): boolean => matchMedia("(prefers-color-scheme: dark)").matches;

export const isDark = (theme: Theme = getTheme()): boolean =>
  theme === "dark" || (theme === "system" && prefersDark());

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
  document.querySelectorAll<HTMLElement>("[data-theme-icon]").forEach((el) => {
    el.classList.toggle("active", el.dataset.themeIcon === theme);
  });
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
  if (!next) return;
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme();
};

export const initTheme = (): void => {
  updateUI();

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getTheme() === "system") applyTheme();
  });

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    if (!e.target.closest("[data-theme-toggle]")) return;
    e.preventDefault();
    cycleTheme();
  });
};
