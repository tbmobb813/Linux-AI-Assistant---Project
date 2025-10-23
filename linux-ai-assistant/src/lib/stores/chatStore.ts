// src/lib/stores/chatStore.ts
// Zustand store for managing chat state with database integration

import { create } from 'zustand';
import { database as db } from '../api/database';
import type { ApiConversation as Conversation, ApiMessage as Message } from '../api/types';

interface ChatState {
    // Current state
    currentConversation: Conversation | null;
    conversations: Conversation[];
    messages: Message[];
    isLoading: boolean;
    error: string | null;

    // Actions
    loadConversations: () => Promise<void>;
    createConversation: (title: string, model: string, provider: string) => Promise<Conversation>;
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
                throw new Error('Conversation not found');
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
                currentConversation: state.currentConversation?.id === id ? null : state.currentConversation,
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
            throw new Error('No conversation selected');
        }

        try {
            set({ isLoading: true, error: null });

            // Create user message
            const userMessage = await db.messages.create({
                conversation_id: currentConversation.id,
                role: 'user',
                content,
            });

            set((state) => ({
                messages: [...state.messages, userMessage],
            }));

            // TODO: Call AI API and get response
            // For now, we'll create a placeholder assistant message
            const assistantMessage = await db.messages.create({
                conversation_id: currentConversation.id,
                role: 'assistant',
                content: 'AI response will go here once we implement the AI provider integration.',
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
