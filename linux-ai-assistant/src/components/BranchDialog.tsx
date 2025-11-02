import { useState } from "react";
import { useChatStore } from "../lib/stores/chatStore";
import { useUiStore } from "../lib/stores/uiStore";

interface BranchDialogProps {
  messageId: string;
  onClose: () => void;
  onBranchCreated?: (branchId: string) => void;
}

export default function BranchDialog({
  messageId,
  onClose,
  onBranchCreated,
}: BranchDialogProps) {
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createBranch = useChatStore((s) => s.createBranch);
  const addToast = useUiStore((s) => s.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isCreating) return;

    try {
      setIsCreating(true);
      const branch = await createBranch(messageId, title.trim());
      addToast({
        message: "Branch created successfully!",
        type: "success",
        ttl: 3000,
      });
      onBranchCreated?.(branch.id);
      onClose();
    } catch (error) {
      addToast({
        message: "Failed to create branch",
        type: "error",
        ttl: 3000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Create Branch
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Create a new conversation branch from this message point. This allows
          you to explore alternative conversation paths.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="branch-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Branch Title
            </label>
            <input
              id="branch-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter branch title..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
              disabled={isCreating}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isCreating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Creating..." : "Create Branch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
