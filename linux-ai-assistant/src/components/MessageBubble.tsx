import { useChatStore } from "../lib/stores/chatStore";
import { useUiStore } from "../lib/stores/uiStore";
import { useArtifactStore } from "../lib/stores/artifactStore";
import { useMemoryStore } from "../lib/stores/memoryStore";
import { useBranchStore } from "../lib/stores/branchStore";
import type { ApiMessage } from "../lib/api/types";
import { isTauriEnvironment } from "../lib/utils/tauri";
import { useState, useEffect } from "react";
import MarkdownContent from "./MarkdownContent";
import BranchDialog from "./BranchDialog";
import ArtifactPreview from "./ArtifactPreview";
import { hasArtifacts } from "../lib/utils/artifactDetection";
import { suggestFilename } from "../lib/utils/artifactDetection";
import { invoke } from "@tauri-apps/api/core";
import CostBadge from "./CostBadge";
import { Brain, GitFork } from "lucide-react";

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
  const messages = useChatStore((s) => s.messages);
  const addToast = useUiStore((s) => s.addToast);
  const addMemory = useMemoryStore((s) => s.addMemory);
  const currentConversation = useChatStore((s) => s.currentConversation);

  // Artifact detection
  const extractArtifacts = useArtifactStore((s) => s.extractArtifacts);
  const getArtifactsForMessage = useArtifactStore(
    (s) => s.getArtifactsForMessage,
  );
  const [showArtifacts, setShowArtifacts] = useState(false);

  // Extract artifacts when message loads (assistant messages only)
  useEffect(() => {
    if (!isUser && hasArtifacts(message.content)) {
      extractArtifacts(message.id, message.content);
      setShowArtifacts(true);
    }
  }, [message.id, message.content, isUser, extractArtifacts]);

  const artifacts = getArtifactsForMessage(message.id);

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

  const handleRemember = () => {
    try {
      addMemory(message.content, {
        context: `From ${message.role} message`,
        conversationId: currentConversation?.id,
        messageId: message.id,
        tags: [message.role],
      });

      addToast({
        message: "Added to session memory!",
        type: "success",
        ttl: 2000,
      });
    } catch (error) {
      addToast({
        message: "Failed to save memory",
        type: "error",
        ttl: 3000,
      });
    }
  };

  const handleFork = () => {
    try {
      if (!currentConversation?.id) {
        addToast({
          message: "No active conversation to fork",
          type: "error",
          ttl: 3000,
        });
        return;
      }

      const messageIndex = messages.findIndex(
        (m: ApiMessage) => m.id === message.id,
      );
      const branchName = `Branch from message ${messageIndex + 1}`;

      const branchId = useBranchStore
        .getState()
        .createBranch(currentConversation.id, branchName, message.id);

      if (branchId) {
        useBranchStore
          .getState()
          .switchBranch(currentConversation.id, branchId);
        addToast({
          message: `Created and switched to "${branchName}"`,
          type: "success",
          ttl: 3000,
        });
      }
    } catch (error) {
      addToast({
        message: "Failed to create branch",
        type: "error",
        ttl: 3000,
      });
    }
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

  const handleSaveArtifact = async (artifact: any) => {
    if (!isTauriEnvironment()) {
      addToast({
        message: "Save to file is only available in desktop app",
        type: "error",
        ttl: 3000,
      });
      return;
    }

    try {
      const filename = suggestFilename(artifact);
      await invoke("save_export_file", {
        content: artifact.content,
        filename,
      });
      addToast({
        message: "Artifact saved successfully",
        type: "success",
        ttl: 2000,
      });
    } catch (error) {
      console.error("Failed to save artifact:", error);
      addToast({
        message: "Failed to save artifact",
        type: "error",
        ttl: 3000,
      });
    }
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`my-6 flex ${isUser ? "justify-end" : "justify-start"} ${
        isHighlighted
          ? "bg-[#e0af68]/10 p-4 rounded-3xl transition-all duration-300 border border-[#e0af68]/30 shadow-lg-soft"
          : ""
      } message-appear`}
    >
      {!isUser && (
        <div className="w-10 h-10 mr-3 bg-gradient-to-br from-[#7aa2f7] to-[#bb9af7] rounded-2xl flex items-center justify-center shadow-md-soft flex-shrink-0">
          <span className="text-white text-lg">🤖</span>
        </div>
      )}

      <div
        className={`max-w-[75%] group relative ${
          isUser
            ? "bg-gradient-to-br from-[#7aa2f7] to-[#7dcfff] text-white shadow-lg-soft"
            : "bg-[#24283b]/80 backdrop-blur-sm text-[#c0caf5] shadow-md-soft border border-[#414868]/50"
        } rounded-3xl overflow-hidden transition-all duration-200 hover:shadow-xl-soft hover:scale-[1.01]`}
      >
        <div className="px-6 py-4">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="
                    w-full min-h-24 p-4
                    border border-[#414868]
                    rounded-xl bg-[#1a1b26]
                    text-[#c0caf5] placeholder-[#565f89]
                    focus:ring-2 focus:ring-[#7aa2f7]/50 focus:border-[#7aa2f7]
                    resize-none transition-all duration-200
                    font-sans text-base leading-relaxed
                    shadow-inner-soft
                  "
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2.5 text-sm font-medium bg-[#414868] hover:bg-[#565f89] text-[#c0caf5] rounded-lg transition-all duration-200 shadow-sm-soft hover:shadow-md-soft"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2.5 text-sm font-medium bg-[#7aa2f7] hover:bg-[#7aa2f7]/90 text-white rounded-lg transition-all duration-200 shadow-md-soft hover:shadow-lg-soft"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <>
                {isUser ? (
                  <div className="whitespace-pre-wrap leading-relaxed text-base font-normal">
                    {message.content}
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                    <MarkdownContent content={message.content} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Message Footer */}
          {!isEditing && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 dark:border-[#414868]/30">
              <div className="flex items-center gap-3">
                <div
                  className={`text-xs font-medium ${isUser ? "text-white/60" : "text-[#565f89]"}`}
                >
                  {formatTime((message as any).timestamp)}
                </div>
                {/* Cost Badge */}
                {(message as any).tokens_used && !isUser && (
                  <CostBadge
                    tokens={(message as any).tokens_used}
                    model={(message as any).model || "gpt-4"}
                    compact
                  />
                )}
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1">
                {/* Status Indicators */}
                {isUser && message.status === "pending" && (
                  <div className="flex items-center space-x-1 mr-2">
                    <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse"></div>
                    <span className="text-xs text-white/70 font-medium">
                      Sending
                    </span>
                  </div>
                )}
                {isUser && message.status === "failed" && (
                  <button
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all duration-200 font-medium shadow-sm-soft hover:shadow-md-soft mr-2"
                    onClick={() => retryMessage(message.id)}
                  >
                    Retry
                  </button>
                )}

                {/* Edit button for user messages */}
                {isUser && (
                  <button
                    onClick={handleEdit}
                    className={`
                      p-1.5 rounded-lg transition-all duration-200
                      ${
                        isUser
                          ? "text-white/60 hover:text-white hover:bg-white/10"
                          : "text-[#9aa5ce] hover:text-[#c0caf5] hover:bg-[#414868]"
                      }
                    `}
                    title="Edit message"
                    aria-label="Edit message"
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
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}

                {/* Copy button for assistant messages */}
                {!isUser && (
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg transition-all duration-200 text-[#9aa5ce] hover:text-[#c0caf5] hover:bg-[#414868]"
                    title="Copy to clipboard"
                    aria-label="Copy message"
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
                )}

                {/* Branch button */}
                <button
                  onClick={() => setShowBranchDialog(true)}
                  className={`
                    p-1.5 rounded-lg transition-all duration-200
                    ${
                      isUser
                        ? "text-white/60 hover:text-white hover:bg-white/10"
                        : "text-[#9aa5ce] hover:text-[#c0caf5] hover:bg-[#414868]"
                    }
                  `}
                  title="Create branch from this message"
                  aria-label="Create branch"
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
                    <line x1="6" y1="3" x2="6" y2="15" />
                    <circle cx="18" cy="6" r="3" />
                    <circle cx="6" cy="18" r="3" />
                    <path d="m18 9-1.5 1.5L18 12" />
                  </svg>
                </button>

                {/* Remember This button */}
                <button
                  onClick={handleRemember}
                  className={`
                    p-1.5 rounded-lg transition-all duration-200
                    ${
                      isUser
                        ? "text-white/60 hover:text-white hover:bg-white/10"
                        : "text-[#9aa5ce] hover:text-[#c0caf5] hover:bg-[#414868]"
                    }
                  `}
                  title="Remember this message"
                  aria-label="Remember message"
                >
                  <Brain className="w-3.5 h-3.5" />
                </button>

                {/* Fork Conversation button */}
                <button
                  onClick={handleFork}
                  className={`
                    p-1.5 rounded-lg transition-all duration-200
                    ${
                      isUser
                        ? "text-white/60 hover:text-white hover:bg-white/10"
                        : "text-[#9aa5ce] hover:text-[#c0caf5] hover:bg-[#414868]"
                    }
                  `}
                  title="Fork conversation from this point"
                  aria-label="Fork conversation"
                >
                  <GitFork className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Artifact Previews */}
        {!isUser && showArtifacts && artifacts.length > 0 && (
          <div className="border-t border-[#414868]/50 p-4 space-y-3 bg-[#1a1b26]/30 backdrop-blur-sm">
            {artifacts.map((artifact) => (
              <ArtifactPreview
                key={artifact.id}
                artifact={artifact}
                onSave={() => handleSaveArtifact(artifact)}
                onCopy={() => {
                  navigator.clipboard.writeText(artifact.content);
                  addToast({
                    message: "Artifact copied to clipboard",
                    type: "success",
                    ttl: 1500,
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-10 h-10 ml-3 bg-gradient-to-br from-[#565f89] to-[#414868] rounded-2xl flex items-center justify-center shadow-md-soft flex-shrink-0">
          <span className="text-white text-lg">👤</span>
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
