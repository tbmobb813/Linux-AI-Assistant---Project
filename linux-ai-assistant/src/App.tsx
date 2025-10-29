import { useEffect, useState } from "react";
import ConversationList from "./components/ConversationList";
import ChatInterface from "./components/ChatInterface";
import { database } from "./lib/api/database";
import Toaster from "./components/Toaster";
import RunOutputModal from "./components/RunOutputModal";
import ExecutionAuditModal from "./components/ExecutionAuditModal";
import CommandSuggestionsModal from "./components/CommandSuggestionsModal";
import { useSettingsStore } from "./lib/stores/settingsStore";
import Settings from "./components/Settings";
import { useChatStore } from "./lib/stores/chatStore";
import { applyTheme, watchSystemTheme } from "./lib/utils/theme";
import { useUiStore } from "./lib/stores/uiStore";

export default function App() {
  const {
    loadSettings,
    registerGlobalShortcut,
    globalShortcut,
    theme,
    projectRoot,
    stopProjectWatch,
  } = useSettingsStore();

  useEffect(() => {
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
    let unlistenCliNotify: (() => void) | undefined;
    let unlistenCliAsk: (() => void) | undefined;
    let unlistenProject: (() => void) | undefined;
    (async () => {
      try {
        const mod = await import("@tauri-apps/api/event");
        // open settings
        unlistenSettings = await mod.listen("tray://open-settings", () => {
          setShowSettings(true);
        });
        // CLI notify
        unlistenCliNotify = await mod.listen<string>("cli://notify", (e) => {
          try {
            useUiStore.getState().addToast({
              message: e.payload || "",
              type: "info",
              ttl: 2000,
            });
          } catch {}
        });
        // CLI ask -> create/select conversation and send message
        unlistenCliAsk = await mod.listen<any>("cli://ask", async (e) => {
          try {
            let prompt = "";
            let targetModel: string | undefined;
            let targetProvider: string | undefined;
            let forceNew = false;

            if (typeof e.payload === "string") {
              prompt = (e.payload || "").trim();
            } else if (e.payload && typeof e.payload === "object") {
              const obj = e.payload as any;
              prompt = String(obj.prompt || obj.message || "").trim();
              targetModel = obj.model || undefined;
              // Bring window to front so the user sees the conversation
              try {
                const winMod = await import("@tauri-apps/api/webviewWindow");
                const w = winMod.getCurrentWebviewWindow();
                await w.show();
                await w.setFocus();
              } catch {}
              targetProvider = obj.provider || undefined;
              forceNew = !!obj.new;
            }
            if (!prompt) return;
            const chat = useChatStore.getState();
            let convo = chat.currentConversation;
            const settings = (
              await import("./lib/stores/settingsStore")
            ).useSettingsStore.getState();
            const model = targetModel || settings.defaultModel || "gpt-4";
            const provider =
              targetProvider || settings.defaultProvider || "local";
            if (!convo || forceNew) {
              const title = prompt.slice(0, 40) || "CLI Ask";
              try {
                convo = await chat.createConversation(title, model, provider);
              } catch (err) {
                console.error(
                  "failed to create conversation from CLI ask",
                  err,
                );
                useUiStore.getState().addToast({
                  message: "Failed to start a conversation",
                  type: "error",
                  ttl: 1500,
                });
                return;
              }
            }
            try {
              await chat.sendMessage(prompt);
              useUiStore.getState().addToast({
                message: "Sent CLI prompt to chat",
                type: "success",
                ttl: 1200,
              });
            } catch (err) {
              console.error("failed to send CLI ask message", err);
              useUiStore.getState().addToast({
                message: "Failed to send CLI prompt",
                type: "error",
                ttl: 1500,
              });
            }
          } catch {}
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
        // project file events
        unlistenProject = await mod.listen<string[]>(
          "project://file-event",
          (e) => {
            const paths = e.payload || [];
            if (paths.length > 0) {
              // record paths to project store for context
              import("./lib/stores/projectStore").then((m) => {
                try {
                  m.useProjectStore.getState().addEvents(paths);
                } catch {}
              });
              useUiStore.getState().addToast({
                message: `Changed: ${paths[0]}`,
                type: "info",
                ttl: 1500,
              });
            }
          },
        );
      } catch (e) {
        // running in web preview or tests where tauri event API isn't available
      }
    })();
    return () => {
      try {
        unlistenSettings && unlistenSettings();
        unlistenNew && unlistenNew();
        unlistenCliNotify && unlistenCliNotify();
        unlistenCliAsk && unlistenCliAsk();
        unlistenProject && unlistenProject();
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
        {/* Project watcher badge */}
        {projectRoot && (
          <div className="absolute left-4 top-4 flex items-center gap-2 bg-gray-800/80 text-xs px-2 py-1 rounded border border-gray-700">
            <span className="truncate max-w-[36ch]" title={projectRoot}>
              Watching: {projectRoot}
            </span>
            <button
              onClick={async () => {
                try {
                  await stopProjectWatch();
                } catch {}
              }}
              className="ml-1 px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600"
              title="Stop watching"
            >
              Stop
            </button>
          </div>
        )}
        {showSettings && (
          <div className="absolute right-4 top-12 z-50">
            <Settings onClose={() => setShowSettings(false)} />
          </div>
        )}

        <ChatInterface />
      </main>
      <Toaster />
      <RunOutputModal />
      <ExecutionAuditModal />
      <CommandSuggestionsModal />
    </div>
  );
}
