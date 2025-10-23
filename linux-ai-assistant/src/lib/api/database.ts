// src/lib/api/database.ts
// Frontend API wrapper for Tauri commands

import { invoke } from '@tauri-apps/api/tauri';
import type { NewConversation, NewMessage, ApiConversation, ApiMessage, Setting } from './types';

export type Conversation = ApiConversation;
export type Message = ApiMessage;

export const database = {
    // Conversation operations
    conversations: {
        create: async (data: NewConversation): Promise<Conversation> => {
            return invoke<Conversation>('create_conversation', {
                title: data.title,
                model: data.model,
                provider: data.provider,
                system_prompt: data.system_prompt,
            });
        },

        get: async (id: string): Promise<Conversation | null> => {
            return invoke<Conversation | null>('get_conversation', { id });
        },

        getAll: async (limit: number = 50): Promise<Conversation[]> => {
            return invoke<Conversation[]>('get_all_conversations', { limit });
        },

        updateTitle: async (id: string, title: string): Promise<void> => {
            return invoke<void>('update_conversation_title', { id, title });
        },

        delete: async (id: string): Promise<void> => {
            return invoke<void>('delete_conversation', { id });
        },

        search: async (query: string, limit: number = 20): Promise<Conversation[]> => {
            return invoke<Conversation[]>('search_conversations', { query, limit });
        },
    },

    // Message operations
    messages: {
        create: async (data: NewMessage): Promise<Message> => {
            return invoke<Message>('create_message', {
                conversation_id: data.conversation_id,
                role: data.role,
                content: data.content,
                tokens_used: data.tokens_used,
            });
        },

        getByConversation: async (conversationId: string): Promise<Message[]> => {
            return invoke<Message[]>('get_conversation_messages', { conversation_id: conversationId });
        },

        getLastN: async (conversationId: string, n: number): Promise<Message[]> => {
            return invoke<Message[]>('get_last_messages', { conversation_id: conversationId, n });
        },

        search: async (query: string, limit: number = 50): Promise<Message[]> => {
            return invoke<Message[]>('search_messages', { query, limit });
        },

        delete: async (id: string): Promise<void> => {
            return invoke<void>('delete_message', { id });
        },

        getTokenCount: async (conversationId: string): Promise<number> => {
            return invoke<number>('get_conversation_token_count', { conversation_id: conversationId });
        },
    },

    // Settings operations
    settings: {
        set: async (key: string, value: string): Promise<void> => {
            return invoke<void>('set_setting', { key, value });
        },

        get: async (key: string): Promise<string | null> => {
            return invoke<string | null>('get_setting', { key });
        },

        getAll: async (): Promise<Setting[]> => {
            return invoke<Setting[]>('get_all_settings');
        },

        delete: async (key: string): Promise<void> => {
            return invoke<void>('delete_setting', { key });
        },

        // Convenience methods for JSON storage
        setJSON: async <T>(key: string, value: T): Promise<void> => {
            return invoke<void>('set_setting', { key, value: JSON.stringify(value) });
        },

        getJSON: async <T>(key: string): Promise<T | null> => {
            const value = await invoke<string | null>('get_setting', { key });
            return value ? JSON.parse(value) : null;
        },
    },
};
