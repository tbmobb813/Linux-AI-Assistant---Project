import ConversationList from "./components/ConversationList";
import ChatInterface from "./components/ChatInterface";
import { database } from "./lib/api/database";
import Toaster from "./components/Toaster";

export default function App(): JSX.Element {
    return (
        <div className="flex h-screen bg-gray-900 text-white">
            <ConversationList />
            <main className="flex-1 flex flex-col relative">
                {/* Small toggle button to demonstrate invoking the window toggle command */}
                <button
                    onClick={async () => {
                        try {
                            await database.window.toggle();
                        } catch (e) {
                            console.error('failed to toggle window', e);
                        }
                    }}
                    className="absolute right-4 top-4 bg-gray-800 hover:bg-gray-700 text-sm px-3 py-1 rounded"
                    title="Toggle window"
                >
                    Toggle
                </button>

                <ChatInterface />
            </main>
            <Toaster />
        </div>
    );
}