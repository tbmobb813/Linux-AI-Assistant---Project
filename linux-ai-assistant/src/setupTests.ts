import { vi } from "vitest";
import "@testing-library/jest-dom";

// Mock the Tauri core invoke API used in the frontend database wrapper so tests run in Node/jsdom
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, args?: any) => {
    // Database-related commands
    if (cmd === "get_all_conversations") return [];
    if (cmd === "get_conversation") return null;
    if (cmd === "create_conversation")
      return {
        id: "mock-c",
        title: args?.title || "mock",
        model: args?.model || "gpt",
        provider: args?.provider || "local",
        created_at: Date.now(),
        updated_at: Date.now(),
      };
    if (cmd === "get_conversation_messages") return [];
    // Settings
    if (cmd === "get_setting") return null;
    if (cmd === "set_setting") return null;
    if (cmd === "get_all_settings") return [];
    // Window
    if (cmd === "toggle_main_window") return null;
    return null;
  }),
}));

// Mock the global shortcut plugin to avoid errors during tests
vi.mock("@tauri-apps/plugin-global-shortcut", () => ({
  register: vi.fn(async (_shortcut: string, _cb: () => void) => {
    // no-op in tests
  }),
  unregisterAll: vi.fn(async () => {
    // no-op in tests
  }),
}));

// Provide a basic matchMedia mock for theme tests and components that rely on it
if (typeof window !== "undefined" && !window.matchMedia) {
  // @ts-ignore
  window.matchMedia = (query: string) => {
    const mql: MediaQueryList = {
      media: query,
      matches: false,
      onchange: null,
      addEventListener: function (
        _type: string,
        _listener: (this: MediaQueryList, ev: MediaQueryListEvent) => any,
      ) {
        // no-op
      },
      removeEventListener: function (
        _type: string,
        _listener: (this: MediaQueryList, ev: MediaQueryListEvent) => any,
      ) {
        // no-op
      },
      dispatchEvent: () => false,
      // legacy
      addListener: function (
        _listener: (this: MediaQueryList, ev: MediaQueryListEvent) => any,
      ) {
        // no-op
      },
      removeListener: function (
        _listener: (this: MediaQueryList, ev: MediaQueryListEvent) => any,
      ) {
        // no-op
      },
    } as unknown as MediaQueryList;
    return mql;
  };
}
