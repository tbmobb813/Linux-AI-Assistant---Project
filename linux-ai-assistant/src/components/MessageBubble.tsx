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
import { Brain, GitFork, Pencil, Copy, GitBranch } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [showFabMenu, setShowFabMenu] = useState(false);
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
    <motion.div
      id={`message-${message.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={`my-4 flex ${isUser ? "justify-end" : "justify-start"} ${
        isHighlighted
          ? "bg-[#e0af68]/10 p-4 rounded-3xl transition-all duration-300 border border-[#e0af68]/30 shadow-glow"
          : ""
      }`}
    >
      {!isUser && (
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="w-11 h-11 mr-4 bg-gradient-to-br from-[#7aa2f7] via-[#7dcfff] to-[#bb9af7] rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ring-2 ring-[#7aa2f7]/20"
        >
          <span className="text-white text-xl">🤖</span>
        </motion.div>
      )}

      <motion.div
        whileHover={{ scale: 1.005 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`max-w-[85%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[70%] group relative ${
          isUser
            ? "bg-gradient-to-br from-[#7aa2f7] via-[#7dcfff] to-[#89ddff] text-white shadow-xl rounded-3xl ring-1 ring-white/20"
            : "bg-[#24283b]/60 backdrop-blur-xl text-[#c0caf5] shadow-xl border border-[#414868]/40 rounded-3xl"
        } overflow-hidden transition-all duration-200`}
        style={{
          boxShadow: isUser
            ? "0 8px 32px -4px rgba(122, 162, 247, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)"
            : "0 8px 32px -4px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(65, 72, 104, 0.3)",
        }}
      >
        <div className="px-6 py-6">
          <div className="flex-1 min-w-0 overflow-hidden">
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
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/10 dark:border-[#414868]/30">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`text-xs font-medium tabular-nums ${isUser ? "text-white/70" : "text-[#565f89]"}`}
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
                {/* Status Indicators */}
                {isUser && message.status === "pending" && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse"></div>
                    <span className="text-xs text-white/70 font-medium">
                      Sending
                    </span>
                  </div>
                )}
                {isUser && message.status === "failed" && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#f7768e]/20 hover:bg-[#f7768e]/30 text-[#f7768e] border border-[#f7768e]/30 transition-all duration-200 font-medium"
                    onClick={() => retryMessage(message.id)}
                  >
                    Retry
                  </motion.button>
                )}
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1.5 ml-4 relative">
                {/* Primary actions - always visible */}
                <div className="flex items-center gap-1">
                  {/* Edit button for user messages */}
                  {isUser && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleEdit}
                      className="p-2.5 rounded-xl transition-all duration-150 text-white/60 hover:text-white hover:bg-white/15"
                      title="Edit message"
                      aria-label="Edit message"
                    >
                      <Pencil className="w-4 h-4" />
                    </motion.button>
                  )}

                  {/* Copy button for assistant messages */}
                  {!isUser && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleCopy}
                      className="p-2.5 rounded-xl transition-all duration-150 text-[#9aa5ce] hover:text-[#c0caf5] hover:bg-[#414868]"
                      title="Copy to clipboard"
                      aria-label="Copy message"
                    >
                      <Copy className="w-4 h-4" />
                    </motion.button>
                  )}

                  {/* Branch button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowBranchDialog(true)}
                    className={`p-2.5 rounded-xl transition-all duration-150 ${
                      isUser
                        ? "text-white/60 hover:text-white hover:bg-white/15"
                        : "text-[#9aa5ce] hover:text-[#c0caf5] hover:bg-[#414868]"
                    }`}
                    title="Create branch"
                    aria-label="Create branch"
                  >
                    <GitBranch className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* FAB Menu for secondary actions */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowFabMenu(!showFabMenu)}
                    className={`p-2.5 rounded-xl transition-all duration-150 ${
                      isUser
                        ? "text-white/60 hover:text-white hover:bg-white/15"
                        : "text-[#9aa5ce] hover:text-[#c0caf5] hover:bg-[#414868]"
                    } ${showFabMenu ? (isUser ? "bg-white/15 text-white" : "bg-[#414868] text-[#c0caf5]") : ""}`}
                    title="More actions"
                    aria-label="More actions"
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
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </motion.button>

                  {/* FAB Menu Dropdown */}
                  <AnimatePresence>
                    {showFabMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -10 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                        className={`absolute right-0 bottom-full mb-2 rounded-2xl shadow-2xl border overflow-hidden min-w-[160px] ${
                          isUser
                            ? "bg-white/10 backdrop-blur-xl border-white/20"
                            : "bg-[#1a1b26]/95 backdrop-blur-xl border-[#414868]/50"
                        }`}
                      >
                        {/* Remember This */}
                        <motion.button
                          whileHover={{ x: 4 }}
                          onClick={() => {
                            handleRemember();
                            setShowFabMenu(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                            isUser
                              ? "text-white/80 hover:bg-white/10 hover:text-white"
                              : "text-[#9aa5ce] hover:bg-[#414868] hover:text-[#c0caf5]"
                          }`}
                        >
                          <Brain className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium">Remember</span>
                        </motion.button>

                        {/* Fork Conversation */}
                        <motion.button
                          whileHover={{ x: 4 }}
                          onClick={() => {
                            handleFork();
                            setShowFabMenu(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 transition-colors border-t ${
                            isUser
                              ? "text-white/80 hover:bg-white/10 hover:text-white border-white/10"
                              : "text-[#9aa5ce] hover:bg-[#414868] hover:text-[#c0caf5] border-[#414868]/50"
                          }`}
                        >
                          <GitFork className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium">Fork</span>
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
      </motion.div>

      {isUser && (
        <motion.div
          whileHover={{ scale: 1.05, rotate: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="w-11 h-11 ml-4 bg-gradient-to-br from-[#565f89] to-[#414868] rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ring-2 ring-[#565f89]/20"
        >
          <span className="text-white text-xl">👤</span>
        </motion.div>
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
    </motion.div>
  );
}
