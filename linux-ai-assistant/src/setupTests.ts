import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock the Tauri invoke API used in the frontend database wrapper so tests run in Node/jsdom
vi.mock('@tauri-apps/api/tauri', () => ({
    invoke: vi.fn(async (cmd: string, args?: any) => {
        // Basic noop mock that returns reasonable defaults for commands used by tests
        if (cmd === 'get_all_conversations') return []
        if (cmd === 'get_conversation') return null
        if (cmd === 'create_conversation') return {
            id: 'mock-c',
            title: args?.title || 'mock',
            model: args?.model || 'gpt',
            provider: args?.provider || 'local',
            created_at: Date.now(),
            updated_at: Date.now(),
        }
        if (cmd === 'get_conversation_messages') return []
        return null
    }),
}))
