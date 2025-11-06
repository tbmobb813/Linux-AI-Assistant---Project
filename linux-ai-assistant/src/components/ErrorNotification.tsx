import { ParsedError, getErrorIcon } from "../types/errors";
import { useChatStore } from "../lib/stores/chatStore";
import { useUiStore } from "../lib/stores/uiStore";
import { createFixRequest } from "../types/errors";

interface ErrorNotificationProps {
  error: ParsedError;
  onDismiss: () => void;
}

export default function ErrorNotification({
  error,
  onDismiss,
}: ErrorNotificationProps) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const currentConversation = useChatStore((s) => s.currentConversation);
  const createConversation = useChatStore((s) => s.createConversation);
  const addToast = useUiStore((s) => s.addToast);

  const handleFixError = async () => {
    try {
      // Ensure we have a conversation
      if (!currentConversation) {
        await createConversation(
          `Fix ${error.source} error`,
          "gpt-4",
          "openai",
        );
      }

      // Send fix request
      const fixMessage = createFixRequest(error);
      await sendMessage(fixMessage);

      addToast({
        message: "Error sent to AI for analysis",
        type: "success",
        ttl: 2000,
      });

      onDismiss();
    } catch (err) {
      console.error("Failed to send error to AI:", err);
      addToast({
        message: "Failed to send error to AI",
        type: "error",
        ttl: 3000,
      });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(error.raw);
    addToast({
      message: "Error copied to clipboard",
      type: "success",
      ttl: 1500,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 border-red-500 p-4 max-w-md">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getErrorIcon(error.severity)}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {error.source.toUpperCase()} Error Detected
            </h3>
            {error.code && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {error.code}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Error Message */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
          {error.message}
        </p>
        {error.file && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
            {error.file}
            {error.line && `:${error.line}`}
            {error.column && `:${error.column}`}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleFixError}
          className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Fix This Error
        </button>
        <button
          onClick={handleCopy}
          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors"
          title="Copy error"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
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
      </div>
    </div>
  );
}
