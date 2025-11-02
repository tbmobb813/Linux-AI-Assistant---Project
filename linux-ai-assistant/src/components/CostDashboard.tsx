import { useState, useEffect } from "react";
import { DollarSign, Zap, TrendingUp, Calendar } from "lucide-react";
import { useChatStore } from "../lib/stores/chatStore";
import { calculateCost, formatCost, formatTokens } from "./CostBadge";

interface ConversationCost {
  conversationId: string;
  title: string;
  tokens: number;
  cost: number;
  messageCount: number;
}

export default function CostDashboard() {
  const { conversations, messages } = useChatStore();
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [topConversations, setTopConversations] = useState<ConversationCost[]>(
    [],
  );

  useEffect(() => {
    // Calculate costs from all conversations
    let tokens = 0;
    let cost = 0;
    const conversationCosts: Record<string, ConversationCost> = {};

    // Group messages by conversation
    Object.values(messages).forEach((message) => {
      const msgTokens = (message as any).tokens_used || 0;
      tokens += msgTokens;

      const conversation = conversations.find(
        (c) => c.id === message.conversation_id,
      );
      const model = conversation?.model || "gpt-4";
      const msgCost = calculateCost(msgTokens, model);
      cost += msgCost;

      // Track per-conversation costs
      if (!conversationCosts[message.conversation_id]) {
        conversationCosts[message.conversation_id] = {
          conversationId: message.conversation_id,
          title: conversation?.title || "Untitled",
          tokens: 0,
          cost: 0,
          messageCount: 0,
        };
      }
      conversationCosts[message.conversation_id].tokens += msgTokens;
      conversationCosts[message.conversation_id].cost += msgCost;
      conversationCosts[message.conversation_id].messageCount += 1;
    });

    setTotalTokens(tokens);
    setTotalCost(cost);

    // Get top 5 costliest conversations
    const sorted = Object.values(conversationCosts)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
    setTopConversations(sorted);
  }, [conversations, messages]);

  return (
    <div className="space-y-4">
      {/* Total Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-[#7aa2f7]/10 to-[#7aa2f7]/5 border border-[#7aa2f7]/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-[#7aa2f7] mb-2">
            <Zap size={16} />
            <span className="text-xs font-medium">Total Tokens</span>
          </div>
          <div className="text-2xl font-bold text-[#c0caf5] font-mono">
            {formatTokens(totalTokens)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#9ece6a]/10 to-[#9ece6a]/5 border border-[#9ece6a]/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-[#9ece6a] mb-2">
            <DollarSign size={16} />
            <span className="text-xs font-medium">Total Cost</span>
          </div>
          <div className="text-2xl font-bold text-[#c0caf5] font-mono">
            {formatCost(totalCost)}
          </div>
        </div>
      </div>

      {/* Top Conversations */}
      {topConversations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-[#9aa5ce] mb-3">
            <TrendingUp size={14} />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Top Conversations
            </span>
          </div>
          <div className="space-y-2">
            {topConversations.map((conv) => (
              <div
                key={conv.conversationId}
                className="bg-[#24283b] border border-[#414868] rounded-lg p-3 hover:border-[#565f89] transition-colors"
              >
                <div className="text-sm text-[#c0caf5] font-medium truncate mb-2">
                  {conv.title}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-[#7aa2f7] font-mono">
                      {formatTokens(conv.tokens)}
                    </span>
                    <span className="text-[#565f89]">•</span>
                    <span className="text-[#9aa5ce]">
                      {conv.messageCount} msgs
                    </span>
                  </div>
                  <span className="text-[#9ece6a] font-mono font-semibold">
                    {formatCost(conv.cost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Average Cost Info */}
      {totalTokens > 0 && (
        <div className="bg-[#24283b]/50 border border-[#414868]/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-[#9aa5ce] mb-2">
            <Calendar size={14} />
            <span className="text-xs font-medium">Usage Insights</span>
          </div>
          <div className="text-xs text-[#9aa5ce] space-y-1">
            <div>
              Average: {formatCost(totalCost / conversations.length)} per
              conversation
            </div>
            <div>Messages: {Object.keys(messages).length} total</div>
          </div>
        </div>
      )}

      {totalTokens === 0 && (
        <div className="text-center py-8 text-[#565f89] text-sm">
          <Zap className="mx-auto mb-2 opacity-50" size={24} />
          <p>No usage data yet</p>
          <p className="text-xs mt-1">Start a conversation to track costs</p>
        </div>
      )}
    </div>
  );
}
