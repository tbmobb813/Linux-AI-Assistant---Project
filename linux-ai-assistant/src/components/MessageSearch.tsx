import { useState, useEffect, useMemo } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import type { ApiMessage as Message } from "../lib/api/types";

interface MessageSearchProps {
  messages: Message[];
  onMessageSelect?: (messageId: string) => void;
  className?: string;
}

export default function MessageSearch({
  messages,
  onMessageSelect,
  className = "",
}: MessageSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Find matching messages
  const matchingMessages = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return messages
      .filter(
        (msg) =>
          msg.content.toLowerCase().includes(query) ||
          msg.role.toLowerCase().includes(query),
      )
      .map((msg, index) => ({
        ...msg,
        matchIndex: index,
        preview: getMessagePreview(msg.content, query),
      }));
  }, [messages, searchQuery]);

  // Reset match index when search changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  // Generate message preview with highlighted search term
  function getMessagePreview(content: string, query: string): string {
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return content.slice(0, 100) + "...";

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);
    const preview = content.slice(start, end);

    return start > 0 ? "..." + preview : preview;
  }

  const handlePrevious = () => {
    if (matchingMessages.length > 0) {
      const newIndex =
        currentMatchIndex === 0
          ? matchingMessages.length - 1
          : currentMatchIndex - 1;
      setCurrentMatchIndex(newIndex);

      const message = matchingMessages[newIndex];
      onMessageSelect?.(message.id);
    }
  };

  const handleNext = () => {
    if (matchingMessages.length > 0) {
      const newIndex =
        currentMatchIndex === matchingMessages.length - 1
          ? 0
          : currentMatchIndex + 1;
      setCurrentMatchIndex(newIndex);

      const message = matchingMessages[newIndex];
      onMessageSelect?.(message.id);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setCurrentMatchIndex(0);
  };

  const handleMessageClick = (message: Message & { matchIndex: number }) => {
    setCurrentMatchIndex(message.matchIndex);
    onMessageSelect?.(message.id);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors ${className}`}
        title="Search in conversation"
      >
        <Search className="h-4 w-4" />
        <span>Search messages</span>
      </button>
    );
  }

  return (
    <div
      className={`bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 ${className}`}
    >
      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search in this conversation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-20 py-2 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          autoFocus
        />

        {/* Navigation Controls */}
        {matchingMessages.length > 0 && (
          <div className="absolute right-2 top-1.5 flex items-center space-x-1">
            <span className="text-xs text-gray-500 mr-2">
              {currentMatchIndex + 1}/{matchingMessages.length}
            </span>
            <button
              onClick={handlePrevious}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Previous match"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              onClick={handleNext}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Next match"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        )}

        <button
          onClick={handleClear}
          className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="space-y-2">
          {matchingMessages.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-2">
              No messages found
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {matchingMessages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => handleMessageClick(message)}
                  className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                    currentMatchIndex === message.matchIndex
                      ? "bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700"
                      : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
                  }`}
                >
                  <div className="font-medium text-xs text-gray-500 mb-1">
                    {message.role === "user" ? "You" : "Assistant"}
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {message.preview}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapse Button */}
      <button
        onClick={() => setIsExpanded(false)}
        className="mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        Collapse search
      </button>
    </div>
  );
}
