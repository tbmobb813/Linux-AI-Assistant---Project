import { useChatStore } from "../lib/stores/chatStore";
import { useUiStore } from "../lib/stores/uiStore";
import type { ApiMessage } from "../lib/api/types";
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
        const { writeText } = await import(
          "@tauri-apps/plugin-clipboard-manager"
        );
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
      className={`my-4 flex ${isUser ? "justify-end" : "justify-start"} ${
        isHighlighted
          ? "bg-yellow-100/50 dark:bg-yellow-900/30 p-4 rounded-2xl transition-all duration-300 shadow-md border border-yellow-200 dark:border-yellow-800"
          : ""
      }`}
    >
      {!isUser && (
        <div className="w-8 h-8 mr-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
          <span className="text-white text-sm">🤖</span>
        </div>
      )}

      <div
        className={`max-w-[75%] group relative ${
          isUser
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
        } rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg`}
      >
        <div className="px-5 py-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="
                      w-full min-h-24 p-3
                      border border-gray-300 dark:border-gray-600
                      rounded-lg bg-white dark:bg-gray-700
                      text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      resize-none transition-all duration-200
                    "
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {isUser ? (
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownContent content={message.content} />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action Buttons */}
            {!isEditing && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {/* Edit button for user messages */}
                {isUser && (
                  <button
                    onClick={handleEdit}
                    className={`
                      p-2 rounded-lg transition-all duration-200
                      ${
                        isUser
                          ? "text-white/70 hover:text-white hover:bg-white/20"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                      }
                    `}
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
                {!isUser && (
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg transition-all duration-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
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

                {/* Branch button */}
                <button
                  onClick={() => setShowBranchDialog(true)}
                  className={`
                    p-2 rounded-lg transition-all duration-200
                    ${
                      isUser
                        ? "text-white/70 hover:text-white hover:bg-white/20"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                    }
                  `}
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
              </div>
            )}
          </div>

          {/* Message Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20 dark:border-gray-700/50">
            <div
              className={`text-xs ${isUser ? "text-white/70" : "text-gray-500 dark:text-gray-400"}`}
            >
              {formatTime((message as any).timestamp)}
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-2">
              {isUser && message.status === "pending" && (
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-white/70 rounded-full animate-pulse"></div>
                  <span className="text-xs text-white/70">Sending</span>
                </div>
              )}
              {isUser && message.status === "failed" && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-red-300">Failed</span>
                  <button
                    className="text-xs px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors duration-200"
                    onClick={() => retryMessage(message.id)}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 ml-3 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
          <span className="text-white text-sm">👤</span>
        </div>
      )}

      {/* Branch Dialog */}
      {showBranchDialog && (
        <BranchDialog
          messageId={message.id}
          onClose={() => setShowBranchDialog(false)}
          onBranchCreated={(branchId: string) => {
            console.log("Branch created:", branchId);
          }}
        />
      )}
    </div>
  );
}
