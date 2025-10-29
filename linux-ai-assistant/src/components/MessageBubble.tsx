import { useChatStore } from "../lib/stores/chatStore";
import { useUiStore } from "../lib/stores/uiStore";
import type { ApiMessage } from "../lib/api/types";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { isTauriEnvironment } from "../lib/utils/tauri";
import MarkdownContent from "./MarkdownContent";

function formatTime(ts?: number) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

interface Props {
  message: ApiMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const retryMessage = useChatStore((s) => s.retryMessage);
  const addToast = useUiStore((s) => s.addToast);

  const handleCopy = async () => {
    try {
      if (isTauriEnvironment()) {
        await writeText(message.content);
      } else {
        // Fallback for web preview
        await navigator.clipboard.writeText(message.content);
      }
      addToast({ message: "Copied to clipboard", type: "success", ttl: 1500 });
    } catch (e) {
      console.error("Failed to copy:", e);
      addToast({ message: "Failed to copy", type: "error", ttl: 2000 });
    }
  };

  return (
    <div className={`my-2 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-lg whitespace-pre-wrap ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
        }`}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <MarkdownContent content={message.content} />
            )}
          </div>
          {!isUser && (
            <button
              onClick={handleCopy}
              className="flex-shrink-0 p-1 rounded transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
              title="Copy to clipboard"
              aria-label="Copy message"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
          {formatTime((message as any).timestamp)}
        </div>
        {isUser && message.status === "pending" && (
          <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
            Sending…
          </div>
        )}
        {isUser && message.status === "failed" && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-red-400">Failed to send</span>
            <button
              className="text-xs px-2 py-1 rounded-md bg-gray-300 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
              onClick={() => retryMessage(message.id)}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
