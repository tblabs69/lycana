/* eslint-disable @typescript-eslint/no-explicit-any */
const isDev = process.env.NODE_ENV === "development";

/** Debug log — only prints in development mode */
export function debugLog(...args: unknown[]) {
  if (isDev) console.log(...args);
}

/** Debug warn — only prints in development mode */
export function debugWarn(...args: unknown[]) {
  if (isDev) console.warn(...args);
}
