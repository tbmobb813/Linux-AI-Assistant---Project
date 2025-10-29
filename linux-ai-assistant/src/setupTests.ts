import { vi } from "vitest";
import "@testing-library/jest-dom";

// Provide a lightweight mock for '@tauri-apps/api/core' that tests can spy on
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
    // Messages
    if (cmd === "create_message")
      return {
        id: `m-${Date.now()}`,
        conversation_id: args?.conversation_id || "mock-c",
        role: args?.role || "user",
        content: args?.content || "",
        timestamp: Date.now(),
      };
    if (cmd === "get_last_messages") return [];
    if (cmd === "search_messages") return [];
    if (cmd === "delete_message") return null;
    if (cmd === "get_conversation_token_count") return 0;
    // Window
    if (cmd === "toggle_main_window") return null;
    return null;
  }),
}));

// Mock the Tauri core invoke API used in the frontend so tests run in Node/jsdom
vi.mock("@tauri-apps/api/tauri", () => ({
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
    // Providers (non-streaming path used in tests)
    if (
      cmd === "provider_openai_generate" ||
      cmd === "provider_anthropic_generate" ||
      cmd === "provider_gemini_generate"
    ) {
      return "AI response will go here";
    }
    // If a streaming session is accidentally requested in tests, just return a session id
    if (cmd === "provider_openai_stream") return "test-session";
    // Window
    if (cmd === "toggle_main_window") return null;
    return null;
  }),
}));

// Ensure that importing '@tauri-apps/api/event' does not try to wire real Tauri internals
// We intentionally do NOT provide a listen function here so code paths treat it as unavailable
// and fall back to non-streaming provider behavior during tests.
vi.mock("@tauri-apps/api/event", () => ({}));

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
