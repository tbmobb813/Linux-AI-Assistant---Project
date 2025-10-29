// src/lib/stores/settingsStore.ts
// Zustand store for app settings

import { create } from "zustand";
import { database as db } from "../api/database";
import { useUiStore } from "./uiStore";
import {
  registerGlobalShortcutSafe,
  unregisterAllShortcutsSafe,
  invokeSafe,
} from "../utils/tauri";
import { applyTheme } from "../utils/theme";

interface SettingsState {
  theme: "light" | "dark" | "system";
  defaultProvider: string;
  defaultModel: string;
  apiKeys: Record<string, string>;
  globalShortcut: string; // e.g., "CommandOrControl+Space"
  allowCodeExecution: boolean;
  projectRoot?: string | null;

  // Actions
  loadSettings: () => Promise<void>;
  setTheme: (theme: "light" | "dark" | "system") => Promise<void>;
  setDefaultProvider: (provider: string) => Promise<void>;
  setDefaultModel: (model: string) => Promise<void>;
  setApiKey: (provider: string, key: string) => Promise<void>;
  setGlobalShortcut: (shortcut: string) => Promise<void>;
  setAllowCodeExecution: (allow: boolean) => Promise<void>;
  registerGlobalShortcut: (shortcut?: string) => Promise<void>;
  setProjectRoot: (path: string) => Promise<void>;
  stopProjectWatch: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: "system",
  defaultProvider: "openai",
  defaultModel: "gpt-4",
  apiKeys: {},
  globalShortcut: "CommandOrControl+Space",
  allowCodeExecution: false,
  projectRoot: null,

  loadSettings: async () => {
    try {
      const theme = await db.settings.get("theme");
      const defaultProvider = await db.settings.get("defaultProvider");
      const defaultModel = await db.settings.get("defaultModel");
      const apiKeys =
        await db.settings.getJSON<Record<string, string>>("apiKeys");
      const globalShortcut =
        (await db.settings.get("globalShortcut")) || "CommandOrControl+Space";
      const allowRaw = await db.settings.get("allowCodeExecution");
      const allowCodeExecution =
        allowRaw === "true" || (typeof allowRaw === "boolean" && allowRaw);
      const projectRoot = (await db.settings.get("projectRoot")) || null;

      set({
        theme: (theme as any) || "system",
        defaultProvider: defaultProvider || "openai",
        defaultModel: defaultModel || "gpt-4",
        apiKeys: apiKeys || {},
        globalShortcut,
        allowCodeExecution,
        projectRoot,
      });

      try {
        applyTheme(((theme as any) || "system") as any);
      } catch (e) {
        // ignore theme application errors
        console.warn("applyTheme failed", e);
      }

      // If a project root is set, attempt to inform backend (best-effort)
      if (projectRoot) {
        try {
          await invokeSafe("set_project_root", { path: projectRoot });
        } catch (e) {
          // non-fatal
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  },

  setTheme: async (theme) => {
    await db.settings.set("theme", theme);
    set({ theme });
    try {
      applyTheme(theme);
    } catch (e) {
      // ignore
    }
  },

  setDefaultProvider: async (provider) => {
    await db.settings.set("defaultProvider", provider);
    set({ defaultProvider: provider });
  },

  setDefaultModel: async (model) => {
    await db.settings.set("defaultModel", model);
    set({ defaultModel: model });
  },

  setApiKey: async (provider, key) => {
    set((state) => {
      const newApiKeys = { ...state.apiKeys, [provider]: key };
      db.settings.setJSON("apiKeys", newApiKeys);
      return { apiKeys: newApiKeys } as any;
    });
  },

  setGlobalShortcut: async (shortcut) => {
    // Persist
    await db.settings.set("globalShortcut", shortcut);
    set({ globalShortcut: shortcut });
    // Attempt to re-register immediately
    await useSettingsStore.getState().registerGlobalShortcut(shortcut);
  },

  setAllowCodeExecution: async (allow) => {
    try {
      await db.settings.set("allowCodeExecution", String(allow));
    } catch (e) {
      console.error("Failed to persist allowCodeExecution", e);
    }
    set({ allowCodeExecution: allow });
  },

  registerGlobalShortcut: async (shortcutOptional) => {
    const shortcut =
      shortcutOptional || useSettingsStore.getState().globalShortcut;
    // Unregister all first to avoid duplicate binds
    await unregisterAllShortcutsSafe();
    try {
      const success = await registerGlobalShortcutSafe(shortcut, async () => {
        try {
          await db.window.toggle();
        } catch (err) {
          console.error("Failed to toggle window from shortcut:", err);
        }
      });
      if (success) {
        useUiStore.getState().addToast({
          message: `Global shortcut set to ${shortcut}`,
          type: "success",
          ttl: 2500,
        });
      }
    } catch (e) {
      console.error("Failed to register global shortcut:", e);
      useUiStore.getState().addToast({
        message: `Failed to register shortcut: ${shortcut}`,
        type: "error",
        ttl: 3500,
      });
    }
  },

  setProjectRoot: async (path) => {
    await db.settings.set("projectRoot", path);
    set({ projectRoot: path });
    try {
      await invokeSafe("set_project_root", { path });
      useUiStore.getState().addToast({
        message: `Watching project: ${path}`,
        type: "success",
        ttl: 2000,
      });
    } catch (e) {
      console.error("Failed to set project root:", e);
      useUiStore.getState().addToast({
        message: `Failed to watch project: ${path}`,
        type: "error",
        ttl: 3000,
      });
    }
  },

  stopProjectWatch: async () => {
    try {
      await invokeSafe("clear_project_root", {});
    } catch (e) {
      // ignore
    }
    await db.settings.delete("projectRoot");
    set({ projectRoot: null });
    useUiStore.getState().addToast({
      message: `Stopped watching project`,
      type: "info",
      ttl: 1400,
    });
  },
}));
