import { useEffect, useState, useMemo, useRef } from "react";
import { useChatStore } from "../lib/stores/chatStore";
import ConversationItemModern from "./ConversationItemModern";
import TagFilter from "./TagFilter";
import { AdvancedSearchModal } from "./AdvancedSearchModal";
import { SearchSuggestions } from "./SearchSuggestions";
import {
  AnimatedButton,
  StaggerContainer,
  FadeIn,
  Skeleton,
} from "./Animations";
import { Search, X, Tag, Settings } from "lucide-react";

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("sidebarWidth");
    return saved ? parseInt(saved, 10) : 320;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

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

  // Filter conversations by date (tag filtering will be implemented separately)
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

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      const minWidth = 200;
      const maxWidth = 600;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
        localStorage.setItem("sidebarWidth", newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  const handleClearSearch = () => {
    setLocalSearchQuery("");
    clearSearch();
    setShowSearchSuggestions(false);
  };

  const handleSearchFocus = () => {
    setShowSearchSuggestions(true);
  };

  const handleSearchBlur = () => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => setShowSearchSuggestions(false), 200);
  };

  const handleSuggestionSelect = (suggestion: any) => {
    setLocalSearchQuery(suggestion.text);
    setShowSearchSuggestions(false);

    if (suggestion.type === "conversation" && suggestion.data) {
      selectConversation(suggestion.data.id);
    }
  };

  return (
    <aside
      ref={sidebarRef}
      style={{ width: `${sidebarWidth}px` }}
      className="relative flex flex-col bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border-r border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-white"
    >
      {/* Modern Header */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Conversations
          </h2>
          <AnimatedButton
            onClick={async () => {
              await createConversation("New conversation", "gpt-4", "local");
            }}
            variant="primary"
            size="sm"
          >
            <span className="text-base">✨</span>
            <span>New</span>
          </AnimatedButton>
        </div>

        {/* Enhanced Search */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className="
                w-full pl-10 pr-10 py-2.5
                text-sm border border-gray-300 dark:border-gray-600
                rounded-lg bg-white dark:bg-gray-800
                text-gray-900 dark:text-white
                placeholder-gray-500 dark:placeholder-gray-400
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                transition-all duration-200
              "
            />
            <div className="absolute right-3 top-2.5 flex items-center space-x-1">
              {localSearchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => setShowAdvancedSearch(true)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                title="Advanced search"
              >
                <Settings className="h-3 w-3" />
              </button>
            </div>

            {/* Search Suggestions */}
            {showSearchSuggestions && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1">
                <SearchSuggestions
                  query={localSearchQuery}
                  onSuggestionSelect={handleSuggestionSelect}
                />
              </div>
            )}
          </div>

          {/* Modern Filters */}
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="
                  w-full text-xs border border-gray-300 dark:border-gray-600
                  rounded-md px-2 py-1.5
                  bg-white dark:bg-gray-800
                  text-gray-700 dark:text-gray-300
                  focus:ring-1 focus:ring-blue-500 focus:border-transparent
                "
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
              </select>
            </div>

            <button
              onClick={() => setShowTagFilter(!showTagFilter)}
              className={`
                p-2 rounded-md transition-all duration-200
                ${
                  showTagFilter || selectedTags.length > 0
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }
              `}
              title="Filter by tags"
            >
              <Tag className="h-4 w-4" />
            </button>
          </div>

          {/* Tag Filter Component */}
          {showTagFilter && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <TagFilter
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
              />
            </div>
          )}

          {/* Active Tag Filter Display */}
          {selectedTags.length > 0 && !showTagFilter && (
            <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
              <span className="font-medium">
                {selectedTags.length} tag{selectedTags.length === 1 ? "" : "s"}{" "}
                applied
              </span>
              <button
                onClick={() => setSelectedTags([])}
                className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Clear
              </button>
            </div>
          )}

          {/* Search Results Info */}
          {searchQuery && (
            <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
              {isSearching
                ? "Searching..."
                : `Found ${filteredConversations.length} conversation${filteredConversations.length !== 1 ? "s" : ""}`}
            </div>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-4 py-3 rounded-xl space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circular" width="2.5rem" height="2.5rem" />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="text" width="70%" height="0.875rem" />
                    <Skeleton variant="text" width="50%" height="0.75rem" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredConversations.length === 0 && (
          <FadeIn delay={300}>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-3">💬</div>
              <div className="text-sm font-medium mb-1">
                {searchQuery
                  ? "No conversations found"
                  : "No conversations yet"}
              </div>
              <div className="text-xs">
                {searchQuery
                  ? "Try a different search term"
                  : "Create your first conversation to get started"}
              </div>
            </div>
          </FadeIn>
        )}

        {!isLoading && filteredConversations.length > 0 && (
          <StaggerContainer staggerDelay={50}>
            {filteredConversations.map((c) => (
              <ConversationItemModern
                key={c.id}
                conversation={c}
                selected={currentConversation?.id === c.id}
                onSelect={(id: string) => selectConversation(id)}
              />
            ))}
          </StaggerContainer>
        )}
      </div>

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSelectConversation={(id) => {
          selectConversation(id);
          setShowAdvancedSearch(false);
        }}
        onSelectMessage={(conversationId, _messageId) => {
          selectConversation(conversationId);
          setShowAdvancedSearch(false);
          // Could add message highlighting logic here
        }}
      />

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          absolute top-0 right-0 bottom-0 w-1
          hover:w-1.5 hover:bg-blue-400 dark:hover:bg-blue-500
          cursor-ew-resize transition-all duration-150
          ${isResizing ? "w-1.5 bg-blue-500 dark:bg-blue-400" : "bg-transparent"}
        `}
        title="Drag to resize"
      />
    </aside>
  );
}
