import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../lib/stores/chatStore";
import MessageBubble from "./MessageBubble";
import { database } from "../lib/api/database";

export default function ChatInterface(): JSX.Element {
  const { currentConversation, messages, sendMessage, isLoading } =
    useChatStore();
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (currentConversation && currentConversation.id) {
      // focus the message input when conversation changes
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [currentConversation]);

  useEffect(() => {
    // keyboard shortcut: Ctrl+K focuses the message input
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      <div className="border-b border-gray-800 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {currentConversation.title || "Untitled"}
          </h3>
          <div className="text-xs text-gray-400">
            {currentConversation.model} • {currentConversation.provider}
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
            className="text-sm px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded"
            title="Toggle window"
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
                className={`max-w-[60%] px-4 py-3 rounded-lg bg-gray-800 animate-pulse`}
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

      <div className="p-4 border-t border-gray-800">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!value.trim()) return;
            await sendMessage(value.trim());
            setValue("");
          }}
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 px-4 py-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    </div>
  );
}
