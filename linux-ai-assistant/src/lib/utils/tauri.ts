// src/lib/utils/tauri.ts
// Utilities for detecting and safely using Tauri APIs

/**
 * Check if we're running in a Tauri environment.
 * Returns false for web preview builds (Vite dev/preview).
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Lazily import and register a global shortcut only when in Tauri.
 * Returns true if registration succeeded, false otherwise.
 */
export async function registerGlobalShortcutSafe(
  shortcut: string,
  handler: () => void | Promise<void>,
): Promise<boolean> {
  if (!isTauriEnvironment()) {
    console.warn(
      "Global shortcut registration skipped (not in Tauri environment)",
    );
    return false;
  }

  try {
    const { register } = await import("@tauri-apps/plugin-global-shortcut");
    await register(shortcut, handler);
    return true;
  } catch (e) {
    console.error("Failed to register global shortcut:", e);
    return false;
  }
}

/**
 * Lazily import and unregister all global shortcuts only when in Tauri.
 */
export async function unregisterAllShortcutsSafe(): Promise<void> {
  if (!isTauriEnvironment()) {
    return;
  }

  try {
    const { unregisterAll } = await import(
      "@tauri-apps/plugin-global-shortcut"
    );
    await unregisterAll();
  } catch (e) {
    // ignore
  }
}
