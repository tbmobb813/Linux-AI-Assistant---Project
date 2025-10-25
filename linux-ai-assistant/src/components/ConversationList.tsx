import { useEffect } from 'react';
import { useChatStore } from '../lib/stores/chatStore';
import ConversationItem from './ConversationItem';

export default function ConversationList(): JSX.Element {
    const { conversations, currentConversation, loadConversations, selectConversation, createConversation, isLoading } = useChatStore();

    useEffect(() => {
        loadConversations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <aside className="w-72 bg-gray-900 border-r border-gray-800 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Conversations</h2>
                <button
                    className="text-sm px-2 py-1 bg-blue-600 rounded-md hover:bg-blue-700"
                    onClick={async () => {
                        await createConversation('New conversation', 'gpt-4', 'local');
                    }}
                >
                    New
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
                {isLoading && (
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="px-3 py-2 rounded-md bg-gray-800 animate-pulse h-12" />
                        ))}
                    </div>
                )}

                {!isLoading && conversations.length === 0 && (
                    <div className="text-sm text-gray-400">No conversations yet — create one.</div>
                )}

                {!isLoading && conversations.map((c) => (
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
