import { useEffect, useRef, useState, useMemo } from "react";
import { useChatStore } from "../lib/stores/chatStore";
import { useUiStore } from "../lib/stores/uiStore";
import MessageBubble from "./MessageBubble";
import MessageSearch from "./MessageSearch";
import { LoadingSpinner, FadeIn } from "./Animations";
import { database } from "../lib/api/database";
import { isTauriEnvironment, invokeSafe } from "../lib/utils/tauri";
import { getProvider } from "../lib/providers/provider";
import { useProjectStore } from "../lib/stores/projectStore";
import CommandSuggestionsModal from "./CommandSuggestionsModal";
import GitContextWidget from "./GitContextWidget";
import RoutingIndicator from "./RoutingIndicator";
import { withErrorHandling } from "../lib/utils/errorHandler";
import { calculateCost, formatCost } from "./CostBadge";
import { copyConversationToClipboard } from "../lib/utils/conversationExport";
import { Copy, Check } from "lucide-react";
import {
  parseSlashCommand,
  executeSlashCommand,
  getSlashCommandSuggestions,
  type SlashCommandContext,
} from "../lib/slashCommands";

export default function ChatInterface(): JSX.Element {
  const { currentConversation, messages, sendMessage, isLoading } =
    useChatStore();
  const addToast = useUiStore((s) => s.addToast);
  const [value, setValue] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [slashSuggestions, setSlashSuggestions] = useState<any[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Handle copy conversation to clipboard
  const handleCopyConversation = async () => {
    if (!currentConversation) return;

    try {
      await copyConversationToClipboard(currentConversation, messages);
      setIsCopied(true);
      addToast({
        message: "Conversation copied to clipboard!",
        type: "success",
        ttl: 2000,
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      addToast({
        message: "Failed to copy conversation",
        type: "error",
        ttl: 3000,
      });
    }
  };

  useEffect(() => {
    if (currentConversation && currentConversation.id) {
      // focus the message input when conversation changes
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [currentConversation]);

  // Git context for current workspace (populates header)
  const [gitContext, setGitContext] = useState<{
    is_repo: boolean;
    branch?: string | null;
    dirty?: boolean;
  } | null>(null);

  useEffect(() => {
    (async () => {
      if (!isTauriEnvironment()) return;
      try {
        const res = await invokeSafe("get_git_context", {});
        if (res) setGitContext(res as any);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    // keyboard shortcut: Ctrl+K focuses the message input
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Ctrl+Shift+V to paste from clipboard
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "v"
      ) {
        e.preventDefault();
        handlePasteFromClipboard();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value]);

  // TODO: Add event listener for ContextPanel quick actions
  useEffect(() => {
    const handleInsertCommand = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { command } = customEvent.detail;
      setValue(command);
      // Auto-focus input after command insertion
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    window.addEventListener("insert-command", handleInsertCommand as any);
    return () =>
      window.removeEventListener("insert-command", handleInsertCommand as any);
  }, []);

  const handlePasteFromClipboard = async () => {
    await withErrorHandling(
      async () => {
        let clipText = "";
        try {
          if (isTauriEnvironment()) {
            const { readText } = await import(
              "@tauri-apps/plugin-clipboard-manager"
            );
            clipText = await readText();
          } else {
            clipText = await navigator.clipboard.readText();
          }
        } catch (err) {
          // Clipboard access denied - silently ignore and let user paste normally
          console.debug("Clipboard access not available:", err);
          return;
        }

        if (clipText) {
          // Auto-detect and format code blocks
          let formattedText = clipText;

          // Check if it looks like code (has typical code patterns)
          const looksLikeCode =
            clipText.includes("function") ||
            clipText.includes("const ") ||
            clipText.includes("let ") ||
            clipText.includes("import ") ||
            clipText.includes("export ") ||
            clipText.includes("class ") ||
            clipText.includes("def ") ||
            clipText.includes("=>") ||
            (clipText.includes("{") && clipText.includes("}")) ||
            (clipText.split("\n").length > 3 && clipText.includes("  ")); // Multi-line with indentation

          // If it looks like code and isn't already in code blocks, wrap it
          if (looksLikeCode && !clipText.startsWith("```")) {
            // Try to detect language
            let language = "";
            if (
              clipText.includes("function") ||
              clipText.includes("const ") ||
              clipText.includes("=>")
            ) {
              language = "javascript";
            } else if (
              clipText.includes("def ") ||
              clipText.includes("import ")
            ) {
              language = "python";
            } else if (
              clipText.includes("fn ") ||
              clipText.includes("let mut ")
            ) {
              language = "rust";
            }

            formattedText = "```" + language + "\n" + clipText + "\n```";
          }

          setValue((prev) =>
            prev ? prev + "\n\n" + formattedText : formattedText,
          );
          addToast({
            message:
              looksLikeCode && !clipText.startsWith("```")
                ? "Code pasted and formatted"
                : "Pasted from clipboard",
            type: "success",
            ttl: 1500,
          });
        } else {
          addToast({
            message: "Clipboard is empty",
            type: "info",
            ttl: 1500,
          });
        }
      },
      "ChatInterface.handlePasteFromClipboard",
      "Failed to paste from clipboard",
    );
  };

  useEffect(() => {
    if (scrollRef.current) {
      // Smooth scroll to bottom for new messages
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Ready to Chat
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Select an existing conversation from the sidebar or create a new one
            to get started.
          </p>
        </div>
      </div>
    );
  }

  // Calculate conversation cost
  const conversationCost = useMemo(() => {
    let totalTokens = 0;
    let totalCost = 0;

    messages.forEach((msg: any) => {
      const tokens = msg.tokens_used || 0;
      totalTokens += tokens;
      totalCost += calculateCost(tokens, currentConversation.model);
    });

    return { tokens: totalTokens, cost: totalCost };
  }, [messages, currentConversation.model]);

  return (
    <div className="flex-1 flex flex-col bg-white/50 dark:bg-gray-900/50">
      {/* Modern Chat Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white text-lg">🤖</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentConversation.title || "Untitled Conversation"}
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-medium">
                      {currentConversation.model}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-medium">
                      {currentConversation.provider}
                    </span>
                  </div>
                  {gitContext && gitContext.is_repo && (
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700">
                      <span className="text-xs font-medium text-green-800 dark:text-green-300">
                        {gitContext.branch || "HEAD"}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          gitContext.dirty
                            ? "bg-red-400 animate-pulse"
                            : "bg-green-400"
                        }`}
                        title={
                          gitContext.dirty
                            ? "Uncommitted changes"
                            : "Clean working directory"
                        }
                      />
                    </div>
                  )}
                  {conversationCost.tokens > 0 && (
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700">
                      <span className="text-xs font-medium text-blue-800 dark:text-blue-300">
                        {formatCost(conversationCost.cost)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Copy Conversation Button */}
            <button
              onClick={handleCopyConversation}
              disabled={messages.length === 0}
              className="
                flex items-center space-x-2 px-3 py-2 rounded-lg
                bg-[#7aa2f7] hover:bg-[#7aa2f7]/90
                disabled:opacity-50 disabled:cursor-not-allowed
                text-white transition-all duration-150 gpu-accelerated
                text-sm font-medium
              "
              title="Copy entire conversation as Markdown"
            >
              {isCopied ? (
                <>
                  <Check size={16} />
                  <span className="hidden md:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span className="hidden md:inline">Copy All</span>
                </>
              )}
            </button>

            {/* Toggle Window Button */}
            <button
              onClick={async () => {
                try {
                  await database.window.toggle();
                } catch (e) {
                  console.error("failed to toggle window", e);
                }
              }}
              className="
                flex items-center space-x-2 px-3 py-2 rounded-lg
                bg-gray-100 dark:bg-gray-800
                text-gray-700 dark:text-gray-300
                hover:bg-gray-200 dark:hover:bg-gray-700
                transition-all duration-200
                text-sm font-medium
              "
              title="Toggle window"
              aria-label="Toggle window"
            >
              <span>🪟</span>
              <span className="hidden md:inline">Toggle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Message Search */}
      {messages.length > 0 && (
        <div className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-200/50 dark:border-gray-700/50 p-3">
          <MessageSearch
            messages={messages}
            onMessageSelect={(messageId) => {
              setSelectedMessageId(messageId);
              // Scroll to the selected message
              const messageElement = document.getElementById(
                `message-${messageId}`,
              );
              if (messageElement) {
                messageElement.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }
            }}
          />
        </div>
      )}

      {/* Modern Messages Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-transparent to-gray-50/30 dark:to-gray-900/30 message-scroll"
      >
        {isLoading && messages.length === 0 && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`max-w-[70%] px-4 py-3 rounded-2xl bg-gray-200/60 dark:bg-gray-800/60 animate-pulse h-16 ${
                  i % 2 === 0 ? "ml-auto" : ""
                }`}
              />
            ))}
          </div>
        )}

        {!isLoading &&
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isHighlighted={selectedMessageId === m.id}
            />
          ))}
        {!isLoading && messages.length === 0 && (
          <FadeIn delay={300}>
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Start the Conversation
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                Ask a question, request help with code, or start a discussion.
                Your AI assistant is ready to help!
              </p>
            </div>
          </FadeIn>
        )}
        {isLoading &&
          messages.length > 0 &&
          messages.map((m) => <MessageBubble key={m.id} message={m} />)}
      </div>

      {/* Git Context Widget */}
      <div className="px-4 pb-2">
        <GitContextWidget
          onIncludeContext={(context) => {
            setValue((prev) => {
              const prefix = prev.trim() ? prev + "\n\n" : "";
              return prefix + "```\nProject Context:\n" + context + "\n```\n\n";
            });
          }}
        />
      </div>

      {/* Modern Input Area */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-700/50 p-4">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!value.trim()) return;
            const toSend = value.trim();

            // Check if this is a slash command
            const slashResult = parseSlashCommand(toSend);

            if (slashResult.isSlashCommand) {
              // Clear input immediately for slash commands
              setValue("");
              setSlashSuggestions([]);

              if (slashResult.command) {
                // Execute the slash command
                const context: SlashCommandContext = {
                  conversationId: currentConversation?.id || null,
                  currentInput: toSend,
                  addToast,
                  clearInput: () => setValue(""),
                };

                const success = await executeSlashCommand(
                  slashResult.command,
                  slashResult.args || [],
                  context,
                );

                if (!success) {
                  // If command failed, restore input
                  setValue(toSend);
                }
              } else {
                // Unknown slash command
                addToast({
                  message: `Unknown command: ${toSend}. Type /help for available commands.`,
                  type: "error",
                  ttl: 3000,
                });
              }
              return;
            }

            // Regular message handling
            // Clear input immediately for snappier UX and to satisfy tests
            setValue("");

            // Enhanced error handling for message sending
            const result = await withErrorHandling(
              () => sendMessage(toSend),
              "ChatInterface.sendMessage",
              "Failed to send message. Please try again.",
            );

            // If message failed, restore the input value
            if (result === null) {
              setValue(toSend);
            }
          }}
        >
          <div className="flex items-center gap-2">
            {/* Routing Indicator */}
            <RoutingIndicator />

            {/* Action Buttons - Compact horizontal layout */}
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="flex-shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              title="Paste from clipboard (Ctrl+Shift+V)"
              aria-label="Paste from clipboard"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={async () => {
                const lastUser = [...messages]
                  .reverse()
                  .find((m) => m.role === "user");
                const base = lastUser?.content || value.trim();
                if (!base) return;
                const provider = getProvider();
                const project = useProjectStore.getState();
                const ctx = project.getRecentSummary(8, 2 * 60 * 1000); // last 2 min, up to 8 events
                const prompt = `Suggest 3 concise shell commands relevant to the following context.\n- User intent: "${base}"\n${ctx ? `- Recent file changes:\n${ctx}\n` : ""}- Output format: one command per line, no explanations, no code fences.`;
                try {
                  const resp = await provider.generateResponse(
                    currentConversation?.id || "suggestions",
                    [{ role: "user", content: prompt }],
                  );
                  const items = resp
                    .split(/\r?\n/)
                    .map((s) => s.replace(/^[-•]\s*/, "").trim())
                    .filter(Boolean)
                    .slice(0, 5);
                  useUiStore.getState().showSuggestions(items);
                } catch (e) {
                  addToast({
                    message: "Failed to get suggestions",
                    type: "error",
                    ttl: 1600,
                  });
                }
              }}
              className="flex-shrink-0 p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 hover:text-purple-700 dark:hover:text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              title="Suggest terminal commands"
              aria-label="Suggest terminal commands"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
              </svg>
            </button>

            {/* Enhanced Input Field with inline send button */}
            <div className="flex-1 flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-400/50 transition-shadow duration-150">
              <textarea
                ref={inputRef as any}
                className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none resize-none min-h-[3rem] max-h-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                value={value}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setValue(newValue);

                  // Show slash command suggestions
                  if (newValue.startsWith("/")) {
                    const suggestions = getSlashCommandSuggestions(newValue);
                    setSlashSuggestions(suggestions);
                  } else {
                    setSlashSuggestions([]);
                  }

                  // Auto-resize textarea from 48px to 200px
                  const textarea = e.target;
                  textarea.style.height = "auto";
                  textarea.style.height =
                    Math.min(textarea.scrollHeight, 200) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    // Ctrl+Enter to send
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  } else if (e.key === "Enter" && !e.shiftKey) {
                    // Enter for new line (updated behavior)
                    // Allow default behavior
                  }
                }}
                placeholder="Type a message... (Ctrl+Enter to send, Shift+V to paste)"
                disabled={isLoading}
                aria-label="Message input"
                rows={1}
              />

              {/* Send Button - Inline within input container */}
              <button
                type="submit"
                disabled={isLoading || !value.trim()}
                className={`
                  flex-shrink-0 p-2 rounded-lg font-medium
                  transition-all duration-150 ease-out
                  transform hover:scale-105 active:scale-95
                  focus:outline-none focus:ring-2 focus:ring-blue-400/50
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  ${
                    value.trim()
                      ? "bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                  }
                `}
                aria-label="Send message"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M10.5 12.5 19 4" />
                  </svg>
                )}
              </button>
            </div>

            {/* Keyboard hint */}
            <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 font-mono text-[10px]">
                Ctrl+Enter
              </kbd>{" "}
              to send
            </div>
          </div>
        </form>

        {/* Modern Slash Command Suggestions */}
        {slashSuggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
            {slashSuggestions.map((command, index) => (
              <button
                key={command.name}
                className={`
                  w-full text-left px-4 py-3
                  hover:bg-gray-100/50 dark:hover:bg-gray-800/50
                  transition-colors duration-200
                  ${index !== slashSuggestions.length - 1 ? "border-b border-gray-200/30 dark:border-gray-700/30" : ""}
                `}
                onClick={() => {
                  setValue(command.name + " ");
                  setSlashSuggestions([]);
                  inputRef.current?.focus();
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-sm">
                      ⚡
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-blue-600 dark:text-blue-400 text-sm">
                      {command.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {command.description}
                    </div>
                    {command.parameters && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Parameters: {command.parameters}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <CommandSuggestionsModal />
    </div>
  );
}
