import { AIClient, ContextBuilder, type ProviderType } from "@lai/core";
import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";

interface LAISettings {
  provider: ProviderType;
  model: string;
  temperature?: number;
  maxTokens?: number;
  privacy?: {
    localFirst: boolean;
    auditEnabled: boolean;
    encryptConversations: boolean;
  };
}

interface FileContext {
  path: string;
  content?: string;
  lastModified?: number;
}

export class LAIClient {
  private core: AIClient | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Get settings from Tauri backend
      const settings = await invoke<LAISettings>("get_settings");

      // Get API key from system keyring via Tauri
      let apiKey: string | undefined;
      if (settings.provider !== "ollama") {
        apiKey = await invoke<string>("get_api_key", {
          provider: settings.provider,
        });
      }

      // Get data directory path
      const dataPath = await appDataDir();
      const dbPath = `${dataPath}/lai.db`;

      // Initialize @lai/core
      this.core = new AIClient({
        provider: {
          type: settings.provider,
          apiKey,
          model: settings.model,
        },
        storagePath: dbPath,
        privacy: settings.privacy,
      });

      this.initialized = true;
      console.log("✅ LAI Core initialized with provider:", settings.provider);
    } catch (error) {
      console.error("❌ Failed to initialize LAI Core:", error);
      throw error;
    }
  }

  private ensureInitialized(): AIClient {
    if (!this.core || !this.initialized) {
      throw new Error("LAI Client not initialized. Call initialize() first.");
    }
    return this.core;
  }

  /**
   * Send a message and get a response
   */
  async sendMessage(message: string, conversationId?: string): Promise<string> {
    const core = this.ensureInitialized();

    // Get file context from file watcher if available
    const fileContext = await this.getFileContext();

    if (fileContext && fileContext.length > 0) {
      // Send with file context paths
      return await core.withContext(message, {
        files: fileContext.map((f) => f.path),
      });
    } else {
      // Simple message without context
      return await core.ask(message, conversationId);
    }
  }

  /**
   * Stream a message response
   */
  async *streamMessage(
    message: string,
    conversationId?: string,
  ): AsyncGenerator<string> {
    const core = this.ensureInitialized();

    // Get file context
    const fileContext = await this.getFileContext();
    let contextObj;

    if (fileContext && fileContext.length > 0) {
      const builder = new ContextBuilder();
      builder.addFiles(fileContext.map((f) => f.path));
      contextObj = await builder.build();
    }

    // Stream from core
    const stream = await core.stream({
      prompt: message,
      context: contextObj,
      conversationId,
    });

    for await (const chunk of stream) {
      yield chunk;
    }
  }

  /**
   * Switch AI provider
   */
  async switchProvider(
    provider: ProviderType,
    model?: string,
    apiKey?: string,
  ): Promise<void> {
    const core = this.ensureInitialized();

    await core.switchProvider({
      type: provider,
      apiKey,
      model,
    });

    // Save to Rust backend settings
    await invoke("save_provider_settings", {
      provider,
      model: model || "default",
    });

    if (apiKey && provider !== "ollama") {
      await invoke("save_api_key", { provider, apiKey });
    }

    console.log(`✅ Switched to provider: ${provider}`);
  }

  /**
   * Get current provider info
   */
  getCurrentProvider(): ProviderType | null {
    if (!this.core) return null;
    return this.core.getCurrentProvider();
  }

  /**
   * Create a new conversation
   */
  async createConversation(title: string): Promise<string> {
    const core = this.ensureInitialized();
    return await core.createConversation(title);
  }

  /**
   * Get conversation by ID
   */
  async getConversation(id: string) {
    const core = this.ensureInitialized();
    return await core.getConversation(id);
  }

  /**
   * Search conversations
   */
  async searchConversations(query: string) {
    const core = this.ensureInitialized();
    return await core.searchConversations(query);
  }

  /**
   * Get file context from Tauri file watcher
   */
  private async getFileContext(): Promise<FileContext[]> {
    try {
      const files = await invoke<FileContext[]>("get_watched_files");
      return files || [];
    } catch (error) {
      console.warn("Could not get watched files:", error);
      return [];
    }
  }
}

// Singleton instance
export const laiClient = new LAIClient();

// Export for use in components
export default laiClient;
