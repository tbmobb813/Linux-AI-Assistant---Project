import { lazy, useEffect, useState, Suspense } from "react";
import ConversationList from "./components/ConversationList";
import ChatInterface from "./components/ChatInterface";
import { database } from "./lib/api/database";
import Toaster from "./components/Toaster";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

// Lazy load heavy components to improve startup performance
const RunOutputModal = lazy(() => import("./components/RunOutputModal"));
const ExecutionAuditModal = lazy(
  () => import("./components/ExecutionAuditModal"),
);
const CommandSuggestionsModal = lazy(
  () => import("./components/CommandSuggestionsModal"),
);
const Settings = lazy(() => import("./components/Settings"));
const UpdateManager = lazy(() => import("./components/UpdateManager"));
const ProjectContextPanel = lazy(
  () => import("./components/ProjectContextPanel"),
);

import { useSettingsStore } from "./lib/stores/settingsStore";
import { useChatStore } from "./lib/stores/chatStore";
import { useProjectStore } from "./lib/stores/projectStore";
import { applyTheme, watchSystemTheme } from "./lib/utils/theme";
import { useUiStore } from "./lib/stores/uiStore";
import { withErrorHandling } from "./lib/utils/errorHandler";

export default function App(): JSX.Element {
  const { loadSettings, registerGlobalShortcut, globalShortcut, theme } =
    useSettingsStore();
  const { events } = useProjectStore();

  useEffect(() => {
    // Load settings on startup and register the global shortcut with error handling
    (async () => {
      await withErrorHandling(
        async () => {
          await loadSettings();
          await registerGlobalShortcut();
        },
        "App.initialization",
        "Failed to initialize application settings",
      );
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
  const [showProjectContext, setShowProjectContext] = useState(false);
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
                await chat.createConversation(title, model, provider);
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
    <AppErrorBoundary>
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white">
        <ConversationList />
        <main className="flex-1 flex flex-col min-w-0">
          {/* Modern Header Bar */}
          <header
            className="
            bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg
            border-b border-gray-200/50 dark:border-gray-700/50
            px-6 py-3
            flex items-center justify-between
            relative z-30
            shadow-sm
          "
          >
            {/* Left side - App branding */}
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white hidden sm:block">
                Linux AI Assistant
              </h1>
              <div className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                {useChatStore((state) => state.currentConversation?.title) ||
                  "No conversation"}
              </div>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center space-x-2">
              {/* Project Context Button */}
              <button
                onClick={() => setShowProjectContext((s) => !s)}
                className={`
                  relative flex items-center space-x-2 px-3 py-2 rounded-lg
                  text-sm font-medium transition-all duration-200
                  ${
                    showProjectContext
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }
                `}
                title="Project Context"
              >
                <span className="text-base">📁</span>
                <span className="hidden sm:inline">Context</span>
                {events.filter((event) => Date.now() - event.ts < 5 * 60 * 1000)
                  .length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setShowSettings((s) => !s)}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-lg
                  text-sm font-medium transition-all duration-200
                  ${
                    showSettings
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }
                `}
                title="Settings (Ctrl+,)"
              >
                <span className="text-base">⚙️</span>
                <span className="hidden sm:inline">Settings</span>
              </button>

              {/* Window Toggle Button */}
              <button
                onClick={async () => {
                  try {
                    await database.window.toggle();
                  } catch (e) {
                    console.error("failed to toggle window", e);
                  }
                }}
                className="
                  flex items-center space-x-2 px-3 py-2 rounded-lg
                  text-sm font-medium transition-all duration-200
                  bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 
                  hover:bg-gray-200 dark:hover:bg-gray-700
                "
                title="Toggle Window"
              >
                <span className="text-base">🪟</span>
                <span className="hidden lg:inline">Toggle</span>
              </button>
            </div>
          </header>

          {/* Settings Panel */}
          {showSettings && (
            <div className="absolute right-6 top-20 z-50 shadow-xl">
              <Settings onClose={() => setShowSettings(false)} />
            </div>
          )}

          {/* Project Context Panel */}
          {showProjectContext && (
            <Suspense fallback={null}>
              <div className="absolute right-6 top-20 z-50">
                <ProjectContextPanel
                  onClose={() => setShowProjectContext(false)}
                />
              </div>
            </Suspense>
          )}

          <ChatInterface />
        </main>
      </div>
      <Toaster />
      <Suspense fallback={null}>
        <RunOutputModal />
        <ExecutionAuditModal />
        <CommandSuggestionsModal />
        <UpdateManager />
      </Suspense>
    </AppErrorBoundary>
  );
}
