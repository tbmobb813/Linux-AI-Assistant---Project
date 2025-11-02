import { useChatStore } from "../lib/stores/chatStore";
import { useUiStore } from "../lib/stores/uiStore";
import type { ApiMessage } from "../lib/api/types";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { isTauriEnvironment } from "../lib/utils/tauri";
import { useState } from "react";
import MarkdownContent from "./MarkdownContent";
import BranchDialog from "./BranchDialog";

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
  isHighlighted?: boolean;
}

export default function MessageBubble({
  message,
  isHighlighted = false,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const isUser = message.role === "user";
  const retryMessage = useChatStore((s) => s.retryMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const addToast = useUiStore((s) => s.addToast);

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };

  const handleSave = async () => {
    if (editContent.trim() === message.content.trim()) {
      setIsEditing(false);
      return;
    }

    try {
      await updateMessage(message.id, editContent.trim());
      addToast({
        message: "Message updated successfully",
        type: "success",
        ttl: 2000,
      });
      setIsEditing(false);
    } catch (error) {
      addToast({
        message: "Failed to update message",
        type: "error",
        ttl: 3000,
      });
    }
  };

  const handleCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

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
    <div
      id={`message-${message.id}`}
      className={`my-2 flex ${isUser ? "justify-end" : "justify-start"} ${
        isHighlighted
          ? "bg-yellow-100 dark:bg-yellow-900 p-2 rounded-lg transition-colors"
          : ""
      }`}
    >
      <div
        className={`max-w-[80%] px-4 py-2 rounded-lg whitespace-pre-wrap ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
        }`}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-20 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                {isUser ? (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  <MarkdownContent content={message.content} />
                )}
              </>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {/* Edit button for user messages when not editing */}
            {isUser && !isEditing && (
              <button
                onClick={handleEdit}
                className="flex-shrink-0 p-1 rounded transition-colors text-gray-300 hover:text-white hover:bg-blue-700"
                title="Edit message"
                aria-label="Edit message"
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
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            {/* Copy button for assistant messages */}
            {!isUser && !isEditing && (
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
            {/* Branch button for all messages when not editing */}
            {!isEditing && (
              <button
                onClick={() => setShowBranchDialog(true)}
                className={`flex-shrink-0 p-1 rounded transition-colors ${
                  isUser
                    ? "text-gray-300 hover:text-white hover:bg-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                }`}
                title="Create branch from this message"
                aria-label="Create branch"
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
                  <line x1="6" y1="3" x2="6" y2="15" />
                  <circle cx="18" cy="6" r="3" />
                  <circle cx="6" cy="18" r="3" />
                  <path d="m18 9-1.5 1.5L18 12" />
                </svg>
              </button>
            )}
          </div>
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

      {/* Branch Dialog */}
      {showBranchDialog && (
        <BranchDialog
          messageId={message.id}
          onClose={() => setShowBranchDialog(false)}
          onBranchCreated={(branchId: string) => {
            // Could navigate to the new branch here if desired
            console.log("Branch created:", branchId);
          }}
        />
      )}
    </div>
  );
}
