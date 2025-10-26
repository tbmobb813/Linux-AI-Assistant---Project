// src/lib/stores/chatStore.ts
// Zustand store for managing chat state with database integration

import { create } from "zustand";
import { database as db } from "../api/database";
import type {
  ApiConversation as Conversation,
  ApiMessage as Message,
} from "../api/types";
import { getProvider } from "../providers/provider";

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
  retryMessage: (id: string) => Promise<void>;
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

    // Optimistic UI: append a temporary user message immediately with pending status
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      conversation_id: currentConversation.id,
      role: "user",
      content,
      // ApiMessage requires `timestamp`
      timestamp: Date.now(),
      status: "pending",
    } as unknown as Message;

    try {
      set((state) => ({
        messages: [...state.messages, optimisticMsg],
        isLoading: true,
        error: null,
      }));

      // Persist user message
      const userMessage = await db.messages.create({
        conversation_id: currentConversation.id,
        role: "user",
        content,
      });

      // Replace optimistic message with the one returned from DB and mark sent
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === optimisticId ? { ...userMessage, status: "sent" } : m
        ),
      }));

      // Call provider to generate assistant response with streaming support and persist it
      const provider = getProvider();
      const messagesForProvider = get().messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));
      // include the just persisted user message as last
      messagesForProvider.push({ role: "user", content });

      // Add an optimistic assistant message which we will stream into
      const optimisticAssistantId = `optimistic-assistant-${Date.now()}`;
      const optimisticAssistant = {
        id: optimisticAssistantId,
        conversation_id: currentConversation.id,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        status: "streaming",
      } as unknown as Message;

      set((state) => ({ messages: [...state.messages, optimisticAssistant] }));

      try {
        let finalContent = "";
        // onChunk will be called by providers that support streaming
        const onChunk = (chunk: string) => {
          finalContent += chunk;
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === optimisticAssistantId
                ? { ...m, content: (m.content || "") + chunk }
                : m
            ),
          }));
        };

        const assistantContent = await provider.generateResponse(
          currentConversation.id,
          messagesForProvider as any,
          onChunk
        );
        // if provider didn't stream, assistantContent will hold final string
        if (!finalContent) finalContent = assistantContent;

        const assistantMessage = await db.messages.create({
          conversation_id: currentConversation.id,
          role: "assistant",
          content: finalContent,
        });

        // replace optimistic assistant with persisted message
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === optimisticAssistantId
              ? { ...assistantMessage, status: "sent" }
              : m
          ),
          isLoading: false,
        }));
      } catch (err) {
        // mark assistant message as failed
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === optimisticAssistantId ? { ...m, status: "failed" } : m
          ),
          error: String(err),
          isLoading: false,
        }));
      }
    } catch (error) {
      // Mark optimistic message as failed on failure
      set((state) => ({
        messages: state.messages.map((m) =>
          typeof m.id === "string" && m.id === optimisticId
            ? { ...m, status: "failed" }
            : m
        ),
        error: String(error),
        isLoading: false,
      }));
    }
  },

  retryMessage: async (id) => {
    const { currentConversation } = get();
    if (!currentConversation) {
      throw new Error("No conversation selected");
    }

    const msg = get().messages.find((m) => m.id === id);
    if (!msg || msg.role !== "user" || msg.status !== "failed") return;

    try {
      set({ isLoading: true, error: null });

      // mark pending
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === id ? { ...m, status: "pending" } : m
        ),
      }));

      // persist user message again
      const userMessage = await db.messages.create({
        conversation_id: currentConversation.id,
        role: "user",
        content: msg.content,
      });

      // replace failed message with persisted one
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === id ? { ...userMessage, status: "sent" } : m
        ),
      }));

      // create assistant message using provider with streaming support
      const provider = getProvider();
      const messagesForProvider = get().messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));
      messagesForProvider.push({ role: "user", content: msg.content });

      const optimisticAssistantId = `optimistic-assistant-${Date.now()}`;
      const optimisticAssistant = {
        id: optimisticAssistantId,
        conversation_id: currentConversation.id,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        status: "streaming",
      } as unknown as Message;

      set((state) => ({ messages: [...state.messages, optimisticAssistant] }));

      try {
        let finalContent = "";
        const onChunk = (chunk: string) => {
          finalContent += chunk;
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === optimisticAssistantId
                ? { ...m, content: (m.content || "") + chunk }
                : m
            ),
          }));
        };

        const assistantContent = await provider.generateResponse(
          currentConversation.id,
          messagesForProvider as any,
          onChunk
        );
        if (!finalContent) finalContent = assistantContent;

        const assistantMessage = await db.messages.create({
          conversation_id: currentConversation.id,
          role: "assistant",
          content: finalContent,
        });

        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === optimisticAssistantId
              ? { ...assistantMessage, status: "sent" }
              : m
          ),
          isLoading: false,
        }));
      } catch (err) {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === optimisticAssistantId ? { ...m, status: "failed" } : m
          ),
          error: String(err),
          isLoading: false,
        }));
      }
    } catch (error) {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === id ? { ...m, status: "failed" } : m
        ),
        error: String(error),
        isLoading: false,
      }));
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
