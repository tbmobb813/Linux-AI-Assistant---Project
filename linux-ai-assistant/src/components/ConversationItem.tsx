import { useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { database } from "../lib/api/database";
import type { ApiConversation } from "../lib/api/types";
import { useChatStore } from "../lib/stores/chatStore";
import { useUiStore } from "../lib/stores/uiStore";

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

  const handleDelete = async (ev: MouseEvent) => {
    ev.stopPropagation();
    if (!window.confirm("Delete this conversation? This cannot be undone."))
      return;

    // Capture conversation snapshot for potential undo
    const snapshot = { ...conversation };

    // No need to snapshot messages — soft-delete preserves them server-side.

    try {
      await deleteConversation(conversation.id);

      // Offer undo via toast action which will recreate a conversation with the same title/model/provider
      addToast({
        message: "Conversation deleted",
        type: "info",
        ttl: 10000,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              // Call backend restore which clears deleted flag
              await database.conversations.restore(snapshot.id);
              // Refresh the conversation list and select restored conv
              await useChatStore.getState().loadConversations();
              await useChatStore.getState().selectConversation(snapshot.id);
              useUiStore
                .getState()
                .addToast({
                  message: "Conversation restored",
                  type: "success",
                  ttl: 3000,
                });
            } catch (e: any) {
              useUiStore
                .getState()
                .addToast({
                  message: `Restore failed: ${String(e)}`,
                  type: "error",
                  ttl: 4000,
                });
            }
          },
        },
      });
    } catch (err: any) {
      addToast({
        message: `Delete failed: ${String(err)}`,
        type: "error",
        ttl: 5000,
      });
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-800 ${selected ? "bg-gray-800" : ""}`}
      onClick={() => onSelect(conversation.id)}
    >
      <div className="flex-1">
        {!editing && (
          <>
            <div className="text-sm font-medium truncate">
              {conversation.title || "Untitled"}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {conversation.model}
            </div>
          </>
        )}

        {editing && (
          <form onSubmit={handleRename} className="flex gap-2">
            <input
              className="flex-1 text-sm px-2 py-1 rounded bg-gray-700"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="text-xs px-2 py-1 bg-green-600 rounded"
            >
              Save
            </button>
            <button
              type="button"
              className="text-xs px-2 py-1 bg-gray-600 rounded"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(false);
                setTitle(conversation.title || "Untitled");
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!editing && (
          <>
            <button
              className="text-xs px-2 py-1 bg-yellow-600 rounded hover:bg-yellow-700"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
            >
              Rename
            </button>
            <button
              className="text-xs px-2 py-1 bg-red-600 rounded hover:bg-red-700"
              onClick={handleDelete}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
