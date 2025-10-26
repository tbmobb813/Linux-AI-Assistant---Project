// provider.ts - provider interface and factory
import type { ApiMessage as Message } from "../api/types";
import { mockProvider } from "./mockProvider";
import {
  getInvoke as getTauriInvoke,
  getListen as getTauriListen,
} from "../tauri-shim";

export type ProviderMessage = {
  role: "user" | "assistant" | "system";
  content: string;
} & Partial<Message>;

export interface Provider {
  // onChunk is an optional callback used for streaming partial responses. If provided,
  // the provider should call onChunk for each partial chunk and still resolve to the
  // final combined string.
  generateResponse(
    conversationId: string,
    messages: ProviderMessage[],
    onChunk?: (chunk: string) => void
  ): Promise<string>;
}

export function getProvider(): Provider {
  try {
    const isDev =
      typeof import.meta !== "undefined" &&
      (import.meta as any).env &&
      (import.meta as any).env.DEV;
    const openaiEnabled =
      (typeof import.meta !== "undefined" &&
        (import.meta as any).env &&
        (import.meta as any).env.VITE_OPENAI_ENABLED) === "true";

    if (!isDev && openaiEnabled) {
      return {
        async generateResponse(conversationId: string, messages, onChunk?) {
          try {
            // Prefer the shim helpers. The shim does dynamic imports internally
            // so bundlers won't try to resolve '@tauri-apps/api' at build time.
            const invokeFn = await getTauriInvoke();
            const listenFn = await getTauriListen();

            if (onChunk && invokeFn && listenFn) {
              const sessionId: string = await invokeFn(
                "provider_openai_stream",
                {
                  conversation_id: conversationId,
                  messages,
                  model: (import.meta as any).env?.VITE_OPENAI_MODEL || null,
                }
              );

              let buffer = "";

              const unlistenChunkP = listenFn(
                "provider-stream-chunk",
                (e: any) => {
                  const payload: any = e.payload;
                  if (payload?.session_id === sessionId) {
                    const chunk = payload.chunk as string;
                    buffer += chunk;
                    try {
                      onChunk(chunk);
                    } catch (_) {}
                  }
                }
              );

              const unlistenEndP = listenFn("provider-stream-end", (e: any) => {
                const payload: any = e.payload;
                if (payload?.session_id === sessionId) {
                  Promise.all([unlistenChunkP, unlistenEndP]).then(
                    (fns: any[]) => fns.forEach((fn) => fn && fn())
                  );
                }
              });

              await new Promise((r) => setTimeout(r, 200));
              return buffer;
            }

            if (!invokeFn) throw new Error("Tauri `invoke` not available");

            const resp = await invokeFn("provider_openai_generate", {
              conversation_id: conversationId,
              messages,
              model: (import.meta as any).env?.VITE_OPENAI_MODEL || null,
            });
            return resp;
          } catch (e: any) {
            throw new Error(e?.message || String(e));
          }
        },
      };
    }
  } catch (e) {
    // fallthrough to mock provider
  }

  return mockProvider;
}
