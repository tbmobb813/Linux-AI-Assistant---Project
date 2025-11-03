import React, { useState } from "react";
import {
  GitBranch,
  GitFork,
  X,
  Trash2,
  Edit2,
  Check,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useBranchStore, ConversationBranch } from "../lib/stores/branchStore";
import { AnimatedButton, FadeIn } from "./Animations";

export const BranchViewer: React.FC = () => {
  const {
    branchMetadata,
    showBranchViewer,
    selectedConversation,
    toggleBranchViewer,
    switchBranch,
    deleteBranch,
    renameBranch,
    getBranchTree,
  } = useBranchStore();

  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(
    new Set(),
  );

  if (!showBranchViewer || !selectedConversation) {
    return null;
  }

  const metadata = branchMetadata.get(selectedConversation);
  if (!metadata) {
    return null;
  }

  const branches = getBranchTree(selectedConversation);
  const activeBranch = branches.find((b) => b.id === metadata.activeBranchId);

  const handleRename = (branchId: string) => {
    if (editingName.trim()) {
      renameBranch(branchId, editingName);
    }
    setEditingBranchId(null);
    setEditingName("");
  };

  const toggleExpanded = (branchId: string) => {
    const newExpanded = new Set(expandedBranches);
    if (newExpanded.has(branchId)) {
      newExpanded.delete(branchId);
    } else {
      newExpanded.add(branchId);
    }
    setExpandedBranches(newExpanded);
  };

  // Build tree structure
  const buildTree = () => {
    const rootBranch = branches.find((b) => b.id === metadata.rootBranchId);
    if (!rootBranch) return null;

    const renderBranch = (branch: ConversationBranch, level: number = 0) => {
      const children = branches.filter((b) => b.parentBranchId === branch.id);
      const hasChildren = children.length > 0;
      const isExpanded = expandedBranches.has(branch.id);
      const isActive = branch.id === metadata.activeBranchId;
      const isEditing = editingBranchId === branch.id;

      return (
        <div key={branch.id} style={{ marginLeft: `${level * 24}px` }}>
          <div
            className={`flex items-center gap-2 p-3 rounded-lg mb-2 transition-all ${
              isActive
                ? "bg-[#7aa2f7]/20 border-2 border-[#7aa2f7]"
                : "bg-[#24283b] hover:bg-[#414868]"
            }`}
          >
            {/* Expand/collapse */}
            {hasChildren && (
              <button
                onClick={() => toggleExpanded(branch.id)}
                className="p-1 hover:bg-[#565f89] rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}

            {/* Branch icon */}
            <GitBranch
              className={`w-4 h-4 ${
                isActive ? "text-[#7aa2f7]" : "text-[#9aa5ce]"
              }`}
            />

            {/* Branch name */}
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleRename(branch.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(branch.id);
                    if (e.key === "Escape") {
                      setEditingBranchId(null);
                      setEditingName("");
                    }
                  }}
                  className="w-full px-2 py-1 text-sm border border-[#7aa2f7] rounded bg-[#1a1b26] text-[#c0caf5] focus:outline-none focus:ring-2 focus:ring-[#7aa2f7]"
                  autoFocus
                />
              ) : (
                <div>
                  <div className="font-semibold text-sm text-[#c0caf5]">
                    {branch.name}
                  </div>
                  {branch.description && (
                    <div className="text-xs text-[#9aa5ce] mt-0.5">
                      {branch.description}
                    </div>
                  )}
                  <div className="text-xs text-[#565f89] mt-1">
                    {branch.messageIds.length} messages •{" "}
                    {new Date(branch.createdAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {!isActive && (
                <AnimatedButton
                  onClick={() => switchBranch(selectedConversation, branch.id)}
                  variant="secondary"
                  size="sm"
                  className="!text-xs !px-2 !py-1"
                >
                  Switch
                </AnimatedButton>
              )}
              {isActive && (
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 px-2">
                  Active
                </span>
              )}
              <button
                onClick={() => {
                  setEditingBranchId(branch.id);
                  setEditingName(branch.name);
                }}
                className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
                title="Rename branch"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              {branch.id !== metadata.rootBranchId && !isActive && (
                <button
                  onClick={() => deleteBranch(selectedConversation, branch.id)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                  title="Delete branch"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Children */}
          {hasChildren && isExpanded && (
            <div className="ml-4 border-l-2 border-gray-300 dark:border-gray-600 pl-2">
              {children.map((child) => renderBranch(child, level + 1))}
            </div>
          )}
        </div>
      );
    };

    return renderBranch(rootBranch);
  };

  return (
    <FadeIn>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-[#1a1b26] rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-[#414868]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#414868]">
            <div className="flex items-center gap-3">
              <GitFork className="w-6 h-6 text-[#bb9af7]" />
              <div>
                <h2 className="text-xl font-bold text-[#c0caf5]">
                  Conversation Branches
                </h2>
                <p className="text-sm text-[#9aa5ce] mt-0.5">
                  Explore alternative conversation paths
                </p>
              </div>
            </div>
            <button
              onClick={toggleBranchViewer}
              className="p-2 hover:bg-[#24283b] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#9aa5ce]" />
            </button>
          </div>

          {/* Active branch info */}
          {activeBranch && (
            <div className="px-6 py-4 bg-[#7aa2f7]/10 border-b border-[#7aa2f7]/30">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#7aa2f7]" />
                <span className="text-sm font-semibold text-[#7aa2f7]">
                  Currently on: {activeBranch.name}
                </span>
              </div>
              {activeBranch.description && (
                <p className="text-sm text-[#9aa5ce] mt-1 ml-6">
                  {activeBranch.description}
                </p>
              )}
            </div>
          )}

          {/* Branch tree */}
          <div className="flex-1 overflow-y-auto p-6">
            {branches.length === 0 ? (
              <div className="text-center py-12">
                <GitBranch className="w-12 h-12 mx-auto text-[#565f89] mb-4" />
                <p className="text-[#9aa5ce]">No branches yet</p>
                <p className="text-sm text-[#565f89] mt-1">
                  Fork the conversation to create a new branch
                </p>
              </div>
            ) : (
              buildTree()
            )}
          </div>

          {/* Stats */}
          <div className="px-6 py-4 border-t border-[#414868] flex items-center justify-between text-sm text-[#9aa5ce]">
            <div className="flex items-center gap-4">
              <span>{branches.length} branches</span>
              <span>•</span>
              <span>
                {branches.reduce((sum, b) => sum + b.messageIds.length, 0)}{" "}
                total messages
              </span>
            </div>
            <div className="text-xs">
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-[#414868] text-[#c0caf5] rounded">
                Ctrl
              </kbd>
              +
              <kbd className="px-1.5 py-0.5 bg-[#414868] text-[#c0caf5] rounded">
                Shift
              </kbd>
              +
              <kbd className="px-1.5 py-0.5 bg-[#414868] text-[#c0caf5] rounded">
                B
              </kbd>{" "}
              to toggle
            </div>
          </div>
        </div>
      </div>
    </FadeIn>
  );
};

export default BranchViewer;
