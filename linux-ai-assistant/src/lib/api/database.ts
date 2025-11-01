// src/lib/api/database.ts
// Frontend API wrapper for Tauri commands

import { isTauriEnvironment } from "../utils/tauri";
import { getInvoke as getTauriInvoke } from "../tauri-shim";
import type {
  NewConversation,
  NewMessage,
  ApiConversation,
  ApiMessage,
  Setting,
} from "./types";
import { handleDatabaseError } from "../utils/errorHandler";

// Enhanced invoke wrapper with better error handling and recovery
async function callInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const startTime = Date.now();
  // Simple in-memory settings store for web preview to support tests
  // and allow basic persistence during a session.
  // Note: module scope ensures a single instance per page.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wps: any =
    (globalThis as any).__WEB_PREVIEW_SETTINGS__ ||
    ((globalThis as any).__WEB_PREVIEW_SETTINGS__ = {
      map: new Map<string, { value: string; updated_at: number }>(),
    });
  // Provide safe fallbacks when running in web preview (non-Tauri) so
  // the app can render and E2E tests can run without native backend.
  if (!isTauriEnvironment()) {
    switch (cmd) {
      // Conversations
      case "get_all_conversations":
        return [] as unknown as T;
      case "get_conversation":
        return null as unknown as T;
      case "create_conversation":
        return {
          id: `preview-${Date.now()}`,
          title: (args as any)?.title ?? "New conversation",
          created_at: Date.now(),
          updated_at: Date.now(),
          model: (args as any)?.model ?? "gpt-4",
          provider: (args as any)?.provider ?? "local",
        } as unknown as T;
      case "delete_conversation":
      case "update_conversation_title":
      case "restore_conversation":
        return undefined as unknown as T;

      // Messages
      case "get_conversation_messages":
      case "get_last_messages":
      case "search_messages":
        return [] as unknown as T;
      case "create_message":
        return {
          id: `preview-msg-${Date.now()}`,
          conversation_id: (args as any)?.conversation_id,
          role: (args as any)?.role ?? "user",
          content: (args as any)?.content ?? "",
          timestamp: Date.now(),
        } as unknown as T;
      case "delete_message":
      case "get_conversation_token_count":
        return 0 as unknown as T;

      // Settings
      case "set_setting": {
        const key = (args as any)?.key as string;
        const value = String((args as any)?.value ?? "");
        const updated_at = Date.now();
        wps.map.set(key, { value, updated_at });
        return undefined as unknown as T;
      }
      case "get_setting": {
        const key = (args as any)?.key as string;
        const entry = wps.map.get(key);
        return (entry ? entry.value : null) as unknown as T;
      }
      case "get_all_settings": {
        const items: Array<{ key: string; value: string; updated_at: number }> =
          [];
        wps.map.forEach(
          (v: { value: string; updated_at: number }, key: string) => {
            items.push({ key, value: v.value, updated_at: v.updated_at });
          },
        );
        return items as unknown as T;
      }

      // Window
      case "toggle_main_window":
        return undefined as unknown as T;

      default:
        throw new Error(`Command '${cmd}' not available in web preview`);
    }
  }

  try {
    const invokeFn = await getTauriInvoke();
    if (!invokeFn) {
      throw new Error("Tauri invoke not available at runtime");
    }
    return await invokeFn<T>(cmd as any, args as any);
  } catch (e: any) {
    const msg = e?.message || (typeof e === "string" ? e : JSON.stringify(e));
    const error = new Error(`Database operation failed: ${cmd} - ${msg}`);

    // Add context about the operation
    (error as any).operation = cmd;
    (error as any).args = args;
    (error as any).duration = Date.now() - startTime;

    // Handle critical database errors
    if (msg.includes("database is locked") || msg.includes("disk I/O error")) {
      handleDatabaseError(error, `Database.${cmd}`);
      return null as unknown as T; // Return early for critical errors
    }

    throw error;
  }
}

export type Conversation = ApiConversation;
export type Message = ApiMessage;

export const database = {
  // Conversation operations
  conversations: {
    create: async (data: NewConversation): Promise<Conversation> => {
      return callInvoke<Conversation>("create_conversation", {
        title: data.title,
        model: data.model,
        provider: data.provider,
        system_prompt: data.system_prompt,
      });
    },

    get: async (id: string): Promise<Conversation | null> => {
      return callInvoke<Conversation | null>("get_conversation", { id });
    },

    getAll: async (limit: number = 50): Promise<Conversation[]> => {
      return callInvoke<Conversation[]>("get_all_conversations", { limit });
    },

    updateTitle: async (id: string, title: string): Promise<void> => {
      return callInvoke<void>("update_conversation_title", { id, title });
    },

    delete: async (id: string): Promise<void> => {
      return callInvoke<void>("delete_conversation", { id });
    },
    restore: async (id: string): Promise<void> => {
      return callInvoke<void>("restore_conversation", { id });
    },

    search: async (
      query: string,
      limit: number = 20,
    ): Promise<Conversation[]> => {
      return callInvoke<Conversation[]>("search_conversations", {
        query,
        limit,
      });
    },
  },
  // Window / app-level commands
  window: {
    toggle: async (): Promise<void> => {
      return callInvoke<void>("toggle_main_window");
    },

    saveState: async (): Promise<void> => {
      return callInvoke<void>("save_window_state");
    },

    restoreState: async (): Promise<void> => {
      return callInvoke<void>("restore_window_state");
    },

    getState: async () => {
      return callInvoke("get_window_state");
    },

    resetState: async (): Promise<void> => {
      return callInvoke<void>("reset_window_state");
    },
  },

  // Message operations
  messages: {
    create: async (data: NewMessage): Promise<Message> => {
      return callInvoke<Message>("create_message", {
        conversation_id: data.conversation_id,
        role: data.role,
        content: data.content,
        tokens_used: data.tokens_used,
      });
    },

    getByConversation: async (conversationId: string): Promise<Message[]> => {
      return callInvoke<Message[]>("get_conversation_messages", {
        conversation_id: conversationId,
      });
    },

    getLastN: async (conversationId: string, n: number): Promise<Message[]> => {
      return callInvoke<Message[]>("get_last_messages", {
        conversation_id: conversationId,
        n,
      });
    },

    search: async (query: string, limit: number = 50): Promise<Message[]> => {
      return callInvoke<Message[]>("search_messages", { query, limit });
    },

    delete: async (id: string): Promise<void> => {
      return callInvoke<void>("delete_message", { id });
    },

    getTokenCount: async (conversationId: string): Promise<number> => {
      return callInvoke<number>("get_conversation_token_count", {
        conversation_id: conversationId,
      });
    },
  },

  // Settings operations
  settings: {
    set: async (key: string, value: string): Promise<void> => {
      return callInvoke<void>("set_setting", { key, value });
    },

    get: async (key: string): Promise<string | null> => {
      return callInvoke<string | null>("get_setting", { key });
    },

    getAll: async (): Promise<Setting[]> => {
      return callInvoke<Setting[]>("get_all_settings");
    },

    delete: async (key: string): Promise<void> => {
      return callInvoke<void>("delete_setting", { key });
    },

    // Convenience methods for JSON storage
    setJSON: async <T>(key: string, value: T): Promise<void> => {
      return callInvoke<void>("set_setting", {
        key,
        value: JSON.stringify(value),
      });
    },

    getJSON: async <T>(key: string): Promise<T | null> => {
      const value = await callInvoke<string | null>("get_setting", { key });
      return value ? JSON.parse(value) : null;
    },
  },

  // Performance monitoring
  performance: {
    getSystemMetrics: async () => {
      return callInvoke("get_performance_metrics");
    },

    getDatabaseMetrics: async () => {
      return callInvoke("get_database_metrics");
    },

    getFullSnapshot: async () => {
      return callInvoke("get_full_performance_snapshot");
    },
  },

  // Shortcuts management
  shortcuts: {
    getConfig: async () => {
      return callInvoke("get_shortcut_config");
    },

    updateConfig: async (config: any) => {
      return callInvoke("update_shortcut_config", { config });
    },

    validateShortcut: async (shortcut: string) => {
      return callInvoke("validate_shortcut", { shortcut });
    },

    getAvailableActions: async () => {
      return callInvoke("get_available_actions");
    },
  },
};
