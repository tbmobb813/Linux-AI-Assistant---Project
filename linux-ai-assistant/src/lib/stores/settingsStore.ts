// src/lib/stores/settingsStore.ts
// Zustand store for app settings

import { create } from "zustand";
import { database as db } from "../api/database";

interface SettingsState {
  theme: "light" | "dark" | "system";
  defaultProvider: string;
  defaultModel: string;
  apiKeys: Record<string, string>;

  // Actions
  loadSettings: () => Promise<void>;
  setTheme: (theme: "light" | "dark" | "system") => Promise<void>;
  setDefaultProvider: (provider: string) => Promise<void>;
  setDefaultModel: (model: string) => Promise<void>;
  setApiKey: (provider: string, key: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: "system",
  defaultProvider: "openai",
  defaultModel: "gpt-4",
  apiKeys: {},

  loadSettings: async () => {
    try {
      const theme = await db.settings.get("theme");
      const defaultProvider = await db.settings.get("defaultProvider");
      const defaultModel = await db.settings.get("defaultModel");
      const apiKeys =
        await db.settings.getJSON<Record<string, string>>("apiKeys");

      set({
        theme: (theme as any) || "system",
        defaultProvider: defaultProvider || "openai",
        defaultModel: defaultModel || "gpt-4",
        apiKeys: apiKeys || {},
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  },

  setTheme: async (theme) => {
    await db.settings.set("theme", theme);
    set({ theme });
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
      return { apiKeys: newApiKeys };
    });
  },
}));
