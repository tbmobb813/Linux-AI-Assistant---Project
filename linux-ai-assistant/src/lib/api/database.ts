// src/lib/api/database.ts
// Frontend API wrapper for Tauri commands

import { invoke } from "@tauri-apps/api/core";
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

  try {
    const result = await invoke<T>(cmd as any, args as any);

    // Log slow queries in development
    const duration = Date.now() - startTime;
    if (
      duration > 1000 &&
      typeof window !== "undefined" &&
      window.location.hostname === "localhost"
    ) {
      console.warn(`Slow database operation: ${cmd} took ${duration}ms`);
    }

    return result;
  } catch (e: any) {
    // Enhanced error normalization and context
    const msg = e?.message || (typeof e === "string" ? e : JSON.stringify(e));
    const error = new Error(`Database operation failed: ${cmd} - ${msg}`);

    // Add context about the operation
    (error as any).operation = cmd;
    (error as any).args = args;
    (error as any).duration = Date.now() - startTime;

    // Handle critical database errors
    if (msg.includes("database is locked") || msg.includes("disk I/O error")) {
      handleDatabaseError(error, `Database.${cmd}`);
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
};
