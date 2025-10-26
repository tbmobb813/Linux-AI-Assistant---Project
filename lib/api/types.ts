// src/lib/api/types.ts
// TypeScript types matching the Rust structs

export interface ApiConversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  model: string;
  provider: string;
  system_prompt?: string;
}

export interface ApiMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  tokens_used?: number;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: number;
}

export interface NewConversation {
  title: string;
  model: string;
  provider: string;
  system_prompt?: string;
}

export interface NewMessage {
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tokens_used?: number;
}

// src/lib/api/database.ts
// Frontend API wrapper for Tauri commands

import { invoke } from "@tauri-apps/api/tauri";
type Conversation = ApiConversation;
type Message = ApiMessage;

export const db = {
  // Conversation operations
  conversations: {
    create: async (data: NewConversation): Promise<Conversation> => {
      return invoke("create_conversation", {
        title: data.title,
        model: data.model,
        provider: data.provider,
        systemPrompt: data.system_prompt,
      });
    },

    get: async (id: string): Promise<Conversation | null> => {
      return invoke("get_conversation", { id });
    },

    getAll: async (limit: number = 50): Promise<Conversation[]> => {
      return invoke("get_all_conversations", { limit });
    },

    updateTitle: async (id: string, title: string): Promise<void> => {
      return invoke("update_conversation_title", { id, title });
    },

    delete: async (id: string): Promise<void> => {
      return invoke("delete_conversation", { id });
    },

    search: async (
      query: string,
      limit: number = 20
    ): Promise<Conversation[]> => {
      return invoke("search_conversations", { query, limit });
    },
  },

  // Message operations
  messages: {
    create: async (data: NewMessage): Promise<Message> => {
      return invoke("create_message", {
        conversationId: data.conversation_id,
        role: data.role,
        content: data.content,
        tokensUsed: data.tokens_used,
      });
    },

    getByConversation: async (conversationId: string): Promise<Message[]> => {
      return invoke("get_conversation_messages", { conversationId });
    },

    getLastN: async (conversationId: string, n: number): Promise<Message[]> => {
      return invoke("get_last_messages", { conversationId, n });
    },

    search: async (query: string, limit: number = 50): Promise<Message[]> => {
      return invoke("search_messages", { query, limit });
    },

    delete: async (id: string): Promise<void> => {
      return invoke("delete_message", { id });
    },

    getTokenCount: async (conversationId: string): Promise<number> => {
      return invoke("get_conversation_token_count", { conversationId });
    },
  },

  // Settings operations
  settings: {
    set: async (key: string, value: string): Promise<void> => {
      return invoke("set_setting", { key, value });
    },

    get: async (key: string): Promise<string | null> => {
      return invoke("get_setting", { key });
    },

    getAll: async (): Promise<Setting[]> => {
      return invoke("get_all_settings");
    },

    delete: async (key: string): Promise<void> => {
      return invoke("delete_setting", { key });
    },

    // Convenience methods for JSON storage
    setJSON: async <T>(key: string, value: T): Promise<void> => {
      return invoke("set_setting", { key, value: JSON.stringify(value) });
    },

    getJSON: async <T>(key: string): Promise<T | null> => {
      const value = await invoke<string | null>("get_setting", { key });
      return value ? JSON.parse(value) : null;
    },
  },
};

// src/lib/stores/chatStore.ts
// Zustand store for managing chat state with database integration

import { create } from "zustand";
import { db } from "../api/database";
import type {
  ApiConversation as Conversation,
  ApiMessage as Message,
} from "../api/types";

interface ChatState {
  // Current state
  currentConversation: Conversation | null;
  conversations: Conversation[];
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  createConversation: (
    title: string,
    model: string,
    provider: string
  ) => Promise<Conversation>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;

  sendMessage: (content: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;

  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentConversation: null,
  conversations: [],
  messages: [],
  isLoading: false,
  error: null,

  loadConversations: async () => {
    try {
      set({ isLoading: true, error: null });
      const conversations = await db.conversations.getAll(50);
      set({ conversations, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  createConversation: async (title, model, provider) => {
    try {
      set({ isLoading: true, error: null });
      const conversation = await db.conversations.create({
        title,
        model,
        provider,
      });

      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversation: conversation,
        messages: [],
        isLoading: false,
      }));

      return conversation;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  selectConversation: async (id) => {
    try {
      set({ isLoading: true, error: null });

      const conversation = await db.conversations.get(id);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      const messages = await db.messages.getByConversation(id);

      set({
        currentConversation: conversation,
        messages,
        isLoading: false,
      });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  deleteConversation: async (id) => {
    try {
      set({ isLoading: true, error: null });
      await db.conversations.delete(id);

      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        currentConversation:
          state.currentConversation?.id === id
            ? null
            : state.currentConversation,
        messages: state.currentConversation?.id === id ? [] : state.messages,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  updateConversationTitle: async (id, title) => {
    try {
      await db.conversations.updateTitle(id, title);

      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, title } : c
        ),
        currentConversation:
          state.currentConversation?.id === id
            ? { ...state.currentConversation, title }
            : state.currentConversation,
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  sendMessage: async (content) => {
    const { currentConversation } = get();
    if (!currentConversation) {
      throw new Error("No conversation selected");
    }

    try {
      set({ isLoading: true, error: null });

      // Create user message
      const userMessage = await db.messages.create({
        conversation_id: currentConversation.id,
        role: "user",
        content,
      });

      set((state) => ({
        messages: [...state.messages, userMessage],
      }));

      // TODO: Call AI API and get response
      // For now, we'll create a placeholder assistant message
      const assistantMessage = await db.messages.create({
        conversation_id: currentConversation.id,
        role: "assistant",
        content:
          "AI response will go here once we implement the AI provider integration.",
      });

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  deleteMessage: async (id) => {
    try {
      await db.messages.delete(id);

      set((state) => ({
        messages: state.messages.filter((m) => m.id !== id),
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  clearError: () => set({ error: null }),
}));

// src/lib/stores/settingsStore.ts
// Zustand store for app settings

import { create } from "zustand";
import { db } from "../api/database";

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
      const apiKeys = await db.settings.getJSON<Record<string, string>>(
        "apiKeys"
      );

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
