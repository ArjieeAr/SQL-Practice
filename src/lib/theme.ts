// Server-safe theme constants. The React hook lives in use-theme.ts (Client Components only).

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "sql-practice:theme";

/**
 * Runs in <head> before the page paints, so a user who chose light mode never sees a dark flash.
 * Dark is the default: the server always renders <html class="dark">.
 */
export const themeInitScript = `try{if(localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})==="light")document.documentElement.classList.remove("dark")}catch(e){}`;
