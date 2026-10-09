/**
 * The CRM's light / dark switch. Dark is the default, like DB Search.
 * THEME_BOOT runs inline before paint so the page never flashes the wrong theme.
 */
export type CrmTheme = "light" | "dark";
export const THEME_KEY = "crm:theme";

export const THEME_BOOT = `try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.dataset.theme=t==="light"?"light":"dark";}catch(e){document.documentElement.dataset.theme="dark";}`;

export function setCrmTheme(t: CrmTheme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(THEME_KEY, t); } catch {}
}
