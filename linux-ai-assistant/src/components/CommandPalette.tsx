import React, { useState, useEffect, useRef, useMemo } from "react";
import { useChatStore } from "../lib/stores/chatStore";

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  category: "conversations" | "actions" | "navigation";
  icon: string;
  action: () => void | Promise<void>;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    conversations,
    currentConversation,
    createConversation,
    selectConversation,
    loadConversations,
  } = useChatStore();

  // Generate commands dynamically
  const commands = useMemo((): Command[] => {
    const conversationCommands: Command[] = conversations.map((conv: any) => ({
      id: `conv-${conv.id}`,
      title: conv.title || "Untitled Conversation",
      subtitle: `Conversation ${conv.id}`,
      category: "conversations" as const,
      icon: "💬",
      action: () => {
        selectConversation(conv.id);
        onClose();
      },
      keywords: [conv.title, "conversation", "chat", "messages"],
    }));

    const actionCommands: Command[] = [
      {
        id: "new-conversation",
        title: "New Conversation",
        subtitle: "Start a fresh chat",
        category: "actions",
        icon: "➕",
        action: async () => {
          await createConversation("New conversation", "gpt-4", "local");
          onClose();
        },
        keywords: ["new", "create", "conversation", "chat", "fresh"],
      },
      {
        id: "reload-conversations",
        title: "Reload Conversations",
        subtitle: "Refresh conversation list",
        category: "actions",
        icon: "�",
        action: async () => {
          await loadConversations();
          onClose();
        },
        keywords: ["reload", "refresh", "conversations"],
      },
    ];

    const navigationCommands: Command[] = [
      {
        id: "settings",
        title: "Open Settings",
        subtitle: "Configure application preferences",
        category: "navigation",
        icon: "⚙️",
        action: () => {
          // This would trigger settings modal
          document.dispatchEvent(new CustomEvent("open-settings"));
          onClose();
        },
        keywords: ["settings", "preferences", "config", "options"],
      },
    ];

    return [...conversationCommands, ...actionCommands, ...navigationCommands];
  }, [
    conversations,
    selectConversation,
    createConversation,
    loadConversations,
    onClose,
  ]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    const lowerQuery = query.toLowerCase();
    return commands
      .filter((command) => {
        const searchText = [
          command.title,
          command.subtitle,
          ...(command.keywords || []),
        ]
          .join(" ")
          .toLowerCase();

        return searchText.includes(lowerQuery);
      })
      .slice(0, 10); // Limit results
  }, [commands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach((command) => {
      if (!groups[command.category]) {
        groups[command.category] = [];
      }
      groups[command.category].push(command);
    });
    return groups;
  }, [filteredCommands]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            try {
              const result = filteredCommands[selectedIndex].action();
              if (result instanceof Promise) {
                result.catch((err) =>
                  console.error("Command execution error:", err),
                );
              }
            } catch (err) {
              console.error("Command execution error:", err);
            }
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const categoryLabels = {
    conversations: "Conversations",
    actions: "Actions",
    navigation: "Navigation",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop with stronger visual effect */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Command Palette with enhanced styling */}
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-white/20 to-gray-100/20 dark:from-gray-900/90 dark:to-gray-800/90 backdrop-blur-2xl rounded-3xl border-2 border-white/30 dark:border-gray-700/50 shadow-2xl shadow-black/20 overflow-hidden transform transition-all duration-300 scale-100">
        {/* Enhanced Search Input */}
        <div className="p-6 border-b-2 border-white/20 dark:border-gray-700/30 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-gray-800/50 dark:to-gray-700/50">
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 dark:text-blue-400 text-xl">
              🔍
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations, actions, and commands..."
              className="w-full pl-12 pr-12 py-4 bg-white/90 dark:bg-gray-800/90 border-2 border-blue-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-400/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-lg font-medium"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              Ctrl+K
            </div>
          </div>
        </div>{" "}
        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-white/60">
              <div className="text-4xl mb-2">🔍</div>
              <div className="text-lg font-medium mb-1">No results found</div>
              <div className="text-sm">
                Try searching for conversations, actions, or commands
              </div>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, commands]) => (
              <div key={category} className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-white/60 uppercase tracking-wide">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </div>
                {commands.map((command) => {
                  const globalIndex = filteredCommands.indexOf(command);
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <button
                      key={command.id}
                      onClick={() => {
                        try {
                          const result = command.action();
                          if (result instanceof Promise) {
                            result.catch((err) =>
                              console.error("Command execution error:", err),
                            );
                          }
                        } catch (err) {
                          console.error("Command execution error:", err);
                        }
                      }}
                      className={`w-full px-3 py-3 rounded-xl text-left transition-all duration-150 ${
                        isSelected
                          ? "bg-white/20 text-white transform scale-[0.98]"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-xl">{command.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {command.title}
                          </div>
                          {command.subtitle && (
                            <div className="text-sm text-white/60 truncate">
                              {command.subtitle}
                            </div>
                          )}
                        </div>
                        {command.category === "conversations" &&
                          currentConversation?.id ===
                            command.id.replace("conv-", "") && (
                            <div className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                              Active
                            </div>
                          )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        {/* Footer */}
        {filteredCommands.length > 0 && (
          <div className="p-3 border-t border-white/10 bg-white/5">
            <div className="flex items-center justify-between text-xs text-white/60">
              <div className="flex items-center space-x-4">
                <span>↑↓ Navigate</span>
                <span>⏎ Select</span>
                <span>⎋ Close</span>
              </div>
              <div>
                {filteredCommands.length} result
                {filteredCommands.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandPalette;
