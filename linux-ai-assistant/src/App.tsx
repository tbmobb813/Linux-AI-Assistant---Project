import { useEffect, useState } from "react";
import ConversationList from "./components/ConversationList";
import ChatInterface from "./components/ChatInterface";
import { database } from "./lib/api/database";
import Toaster from "./components/Toaster";
import { useSettingsStore } from "./lib/stores/settingsStore";
import Settings from "./components/Settings";
import { useChatStore } from "./lib/stores/chatStore";
import { applyTheme, watchSystemTheme } from "./lib/utils/theme";
import { useUiStore } from "./lib/stores/uiStore";

export default function App(): JSX.Element {
  const { loadSettings, registerGlobalShortcut, globalShortcut, theme } =
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

  useEffect(() => {
    // Re-register when shortcut changes
    (async () => {
      try {
        await registerGlobalShortcut(globalShortcut);
      } catch (e) {
        console.error("rebind shortcut failed", e);
      }
    })();
  }, [globalShortcut, registerGlobalShortcut]);
  const [showSettings, setShowSettings] = useState(false);
  // Wire tray menu events: open settings and new conversation
  useEffect(() => {
    let unlistenSettings: (() => void) | undefined;
    let unlistenNew: (() => void) | undefined;
    (async () => {
      try {
        const mod = await import("@tauri-apps/api/event");
        // open settings
        unlistenSettings = await mod.listen("tray://open-settings", () => {
          setShowSettings(true);
        });
        // new conversation
        const createConversation = useChatStore.getState().createConversation;
        unlistenNew = await mod.listen("tray://new-conversation", async () => {
          try {
            await createConversation("New conversation", "gpt-4", "local");
          } catch (e) {
            console.error("failed to create conversation from tray", e);
          }
        });
      } catch (e) {
        // running in web preview or tests where tauri event API isn't available
      }
    })();
    return () => {
      try {
        unlistenSettings && unlistenSettings();
        unlistenNew && unlistenNew();
      } catch {}
    };
  }, []);
  // Watch system theme if preference is 'system'
  useEffect(() => {
    if (theme !== "system") return;
    const addToast = useUiStore.getState().addToast;
    let mounted = false;
    // Ensure we apply immediately in case system changed while app was closed
    try {
      applyTheme("system");
    } catch {}
    const unwatch = watchSystemTheme(() => {
      applyTheme("system");
      // Avoid toasting on initial mount
      if (mounted) {
        addToast({
          message: "Theme updated from system",
          type: "info",
          ttl: 1500,
        });
      }
      mounted = true;
    });
    // Mark mounted after initial microtask
    Promise.resolve().then(() => {
      mounted = true;
    });
    return () => {
      try {
        unwatch && unwatch();
      } catch {}
    };
  }, [theme]);

  // Keyboard shortcut: Ctrl+, toggles Settings panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setShowSettings((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
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
