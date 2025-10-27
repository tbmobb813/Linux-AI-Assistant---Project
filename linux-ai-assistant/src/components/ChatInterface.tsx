import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../lib/stores/chatStore";
import { useUiStore } from "../lib/stores/uiStore";
import MessageBubble from "./MessageBubble";
import { database } from "../lib/api/database";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { isTauriEnvironment, invokeSafe } from "../lib/utils/tauri";
import { getProvider } from "../lib/providers/provider";
import { useProjectStore } from "../lib/stores/projectStore";
import CommandSuggestionsModal from "./CommandSuggestionsModal";

export default function ChatInterface() {
  const { currentConversation, messages, sendMessage, isLoading } =
    useChatStore();
  const addToast = useUiStore((s) => s.addToast);
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
  const handlePasteFromClipboard = async () => {
    try {
      let clipText = "";
      if (isTauriEnvironment()) {
        clipText = await readText();
      } else {
        clipText = await navigator.clipboard.readText();
      }
      if (clipText) {
        setValue((prev) => (prev ? prev + "\n\n" + clipText : clipText));
        addToast({
          message: "Pasted from clipboard",
          type: "success",
          ttl: 1500,
        });
      } else {
        addToast({ message: "Clipboard is empty", type: "info", ttl: 1500 });
      }
    } catch (e) {
      console.error("Failed to paste:", e);
      addToast({ message: "Failed to paste", type: "error", ttl: 2000 });
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select or create a conversation to get started.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-gray-300 dark:border-gray-800 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {currentConversation.title || "Untitled"}
          </h3>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {currentConversation.model} • {currentConversation.provider}
            </div>
            {gitContext && gitContext.is_repo && (
              <div className="text-xs text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                <strong className="mr-1">{gitContext.branch || "HEAD"}</strong>
                {gitContext.dirty ? (
                  <span className="text-red-400">●</span>
                ) : (
                  <span className="text-green-400">●</span>
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <button
            onClick={async () => {
              try {
                await database.window.toggle();
              } catch (e) {
                console.error("failed to toggle window", e);
              }
            }}
            className="text-sm px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white"
            title="Toggle window"
            aria-label="Toggle window"
          >
            Toggle Window
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {isLoading && messages.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`max-w-[60%] px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse`}
              />
            ))}
          </div>
        )}

        {!isLoading &&
          messages.map((m) => <MessageBubble key={m.id} message={m} />)}
        {!isLoading && messages.length === 0 && (
          <div className="text-sm text-gray-400">
            No messages yet — send the first message!
          </div>
        )}
        {isLoading &&
          messages.length > 0 &&
          messages.map((m) => <MessageBubble key={m.id} message={m} />)}
      </div>

      <div className="p-4 border-t border-gray-300 dark:border-gray-800">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!value.trim()) return;
            const toSend = value.trim();
            // Clear input immediately for snappier UX and to satisfy tests
            setValue("");
            await sendMessage(toSend);
          }}
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="px-3 py-2 rounded-md flex items-center gap-1 bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white"
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
              className="px-3 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white"
              disabled={isLoading}
              title="Suggest terminal commands"
              aria-label="Suggest terminal commands"
            >
              Suggest
            </button>
            <input
              ref={inputRef}
              className="flex-1 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Type a message..."
              disabled={isLoading}
              aria-label="Message input"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
              disabled={isLoading}
              aria-label="Send message"
            >
              {isLoading && (
                <svg
                  className="w-4 h-4 animate-spin text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              )}
              <span>{isLoading ? "Sending..." : "Send"}</span>
            </button>
          </div>
        </form>
      </div>
      <CommandSuggestionsModal />
    </div>
  );
}
