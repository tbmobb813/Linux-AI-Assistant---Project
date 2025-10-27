import { useEffect, useState } from "react";
import ConversationList from "./components/ConversationList";
import ChatInterface from "./components/ChatInterface";
import { database } from "./lib/api/database";
import Toaster from "./components/Toaster";
import { useSettingsStore } from "./lib/stores/settingsStore";
import Settings from "./components/Settings";

export default function App(): JSX.Element {
  const { loadSettings, registerGlobalShortcut, globalShortcut } =
    useSettingsStore();

  useEffect(() => {
    // Load settings on startup and register the global shortcut
    (async () => {
      try {
        await loadSettings();
        await registerGlobalShortcut();
      } catch (e) {
        console.error("init settings/shortcut failed", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showSettings, setShowSettings] = useState(false);
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
              console.error("failed to toggle window", e);
            }
          }}
          className="absolute right-4 top-4 bg-gray-800 hover:bg-gray-700 text-sm px-3 py-1 rounded"
          title="Toggle window"
        >
          Toggle
        </button>

        {/* Settings button and panel */}
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="absolute right-24 top-4 bg-gray-800 hover:bg-gray-700 text-sm px-3 py-1 rounded"
          title="Settings"
        >
          Settings
        </button>
        {showSettings && (
          <div className="absolute right-4 top-12 z-50">
            <Settings onClose={() => setShowSettings(false)} />
          </div>
        )}

        <ChatInterface />
      </main>
      <Toaster />
    </div>
  );
}
