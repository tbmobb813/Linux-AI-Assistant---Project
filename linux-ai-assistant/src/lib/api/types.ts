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
  role: 'user' | 'assistant' | 'system';
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
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used?: number;
}
