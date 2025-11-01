import { useEffect, useState, useMemo } from "react";
import { useChatStore } from "../lib/stores/chatStore";
import ConversationItem from "./ConversationItem";
import { Search, X, Filter } from "lucide-react";

export default function ConversationList() {
  const {
    conversations,
    currentConversation,
    loadConversations,
    selectConversation,
    createConversation,
    isLoading,
    searchQuery,
    searchResults,
    isSearching,
    searchConversations,
    clearSearch,
  } = useChatStore();

  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month"
  >("all");

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localSearchQuery.trim()) {
        searchConversations(localSearchQuery);
      } else {
        clearSearch();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localSearchQuery, searchConversations, clearSearch]);

  // Filter conversations by date
  const filteredConversations = useMemo(() => {
    const conversationsToFilter = searchQuery ? searchResults : conversations;

    if (dateFilter === "all") return conversationsToFilter;

    const now = Date.now();
    const filterTime = {
      today: 24 * 60 * 60 * 1000, // 1 day
      week: 7 * 24 * 60 * 60 * 1000, // 7 days
      month: 30 * 24 * 60 * 60 * 1000, // 30 days
    }[dateFilter];

    return conversationsToFilter.filter((c) => now - c.updated_at < filterTime);
  }, [conversations, searchResults, searchQuery, dateFilter]);

  const handleClearSearch = () => {
    setLocalSearchQuery("");
    clearSearch();
  };

  return (
    <aside className="w-72 p-3 flex flex-col bg-gray-100 border-r border-gray-300 text-gray-900 dark:bg-gray-900 dark:border-gray-800 dark:text-white">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Conversations</h2>
        <button
          className="text-sm px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700"
          onClick={async () => {
            await createConversation("New conversation", "gpt-4", "local");
          }}
        >
          New
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-3 space-y-2">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          {localSearchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Date Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="text-xs text-gray-500">
            {isSearching
              ? "Searching..."
              : `Found ${filteredConversations.length} conversation${filteredConversations.length !== 1 ? "s" : ""}`}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-md h-12 animate-pulse bg-gray-200 dark:bg-gray-800"
              />
            ))}
          </div>
        )}

        {!isLoading && filteredConversations.length === 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {searchQuery
              ? "No conversations found"
              : "No conversations yet — create one."}
          </div>
        )}

        {!isLoading &&
          filteredConversations.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              selected={currentConversation?.id === c.id}
              onSelect={(id) => selectConversation(id)}
            />
          ))}
      </div>
    </aside>
  );
}
