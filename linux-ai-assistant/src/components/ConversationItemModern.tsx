import { useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import type { ApiConversation } from "../lib/api/types";
import { useChatStore } from "../lib/stores/chatStore";
import { useUiStore } from "../lib/stores/uiStore";
import { invokeSafe } from "../lib/utils/tauri";
import TagInput from "./TagInput";

interface Props {
  conversation: ApiConversation;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function ConversationItem({
  conversation,
  selected,
  onSelect,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title || "Untitled");
  const [exporting, setExporting] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const updateTitle = useChatStore((s) => s.updateConversationTitle);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const addToast = useUiStore((s) => s.addToast);

  const handleRename = async (e?: FormEvent) => {
    e?.preventDefault();
    try {
      await updateTitle(conversation.id, title);
      setEditing(false);
      addToast({ message: "Conversation renamed", type: "success", ttl: 3000 });
    } catch (err: any) {
      addToast({
        message: `Rename failed: ${String(err)}`,
        type: "error",
        ttl: 5000,
      });
    }
  };

  const handleDelete = async (e: MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(conversation.id);
      addToast({
        message: "Conversation deleted",
        type: "success",
        ttl: 3000,
      });
    } catch (err: any) {
      addToast({ message: err.message, type: "error", ttl: 3000 });
    }
  };

  const handleExport = async (
    e: MouseEvent,
    format: "json" | "markdown" | "html" | "pdf",
  ) => {
    e.stopPropagation();
    setExporting(true);
    try {
      const result = await invokeSafe("save_single_conversation_export", {
        conversation_id: conversation.id,
        format: format,
        title: conversation.title || "Untitled",
      });
      addToast({
        message: `Conversation exported as ${format.toUpperCase()}: ${result}`,
        type: "success",
        ttl: 3000,
      });
    } catch (err: any) {
      addToast({
        message: `Export failed: ${err.message || err}`,
        type: "error",
        ttl: 3000,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className={`
        group relative
        bg-white dark:bg-gray-800/50 
        rounded-xl border transition-all duration-200
        cursor-pointer overflow-hidden
        ${
          selected
            ? "border-blue-300 dark:border-blue-600 bg-blue-50/30 dark:bg-blue-900/20 shadow-lg shadow-blue-500/10"
            : "border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md hover:shadow-gray-500/5"
        }
      `}
      onClick={() => onSelect(conversation.id)}
    >
      {/* Main Content */}
      <div className="p-4">
        {!editing && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate flex-1 pr-2">
                {conversation.title || "Untitled Conversation"}
              </h3>
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  className="p-1 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTags(!showTags);
                  }}
                  title="Manage tags"
                >
                  <span className="text-xs">🏷️</span>
                </button>
                <button
                  className="p-1 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(true);
                  }}
                  title="Rename conversation"
                >
                  <span className="text-xs">✏️</span>
                </button>
              </div>
            </div>

            {/* Model & Provider Info */}
            <div className="flex items-center space-x-2 mb-3">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300">
                🤖 {conversation.model}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(conversation.updated_at).toLocaleDateString()}
              </span>
            </div>

            {/* Action Buttons - Show on Hover */}
            <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex items-center space-x-1">
                {/* Export Buttons */}
                <button
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
                  onClick={(e) => handleExport(e, "json")}
                  disabled={exporting}
                  title="Export as JSON"
                >
                  <span>📄</span>
                  <span className="hidden lg:inline">JSON</span>
                </button>
                <button
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                  onClick={(e) => handleExport(e, "markdown")}
                  disabled={exporting}
                  title="Export as Markdown"
                >
                  <span>📝</span>
                  <span className="hidden lg:inline">MD</span>
                </button>
                <button
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                  onClick={(e) => handleExport(e, "pdf")}
                  disabled={exporting}
                  title="Export as PDF"
                >
                  <span>📄</span>
                  <span className="hidden lg:inline">PDF</span>
                </button>
              </div>
              <button
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                onClick={handleDelete}
                title="Delete conversation"
              >
                <span>🗑️</span>
                <span className="hidden lg:inline">Delete</span>
              </button>
            </div>
          </>
        )}

        {editing && (
          <form onSubmit={handleRename} className="space-y-3">
            <input
              className="
                w-full px-3 py-2 text-sm 
                border border-gray-300 dark:border-gray-600 
                rounded-lg bg-white dark:bg-gray-800 
                text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
              "
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="Enter conversation title..."
            />
            <div className="flex items-center space-x-2">
              <button
                type="submit"
                className="flex-1 px-3 py-2 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                className="flex-1 px-3 py-2 text-xs font-medium bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(false);
                  setTitle(conversation.title || "Untitled");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Tag Management Area */}
      {showTags && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-800/50">
          <TagInput
            conversationId={conversation.id}
            placeholder="Add tags to organize this conversation..."
            className="text-sm"
          />
        </div>
      )}

      {/* Loading Overlay */}
      {exporting && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>Exporting...</span>
          </div>
        </div>
      )}
    </div>
  );
}
