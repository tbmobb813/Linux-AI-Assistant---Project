import { lazy, useEffect, useState, Suspense, startTransition } from "react";
import ConversationList from "./components/ConversationList";
import ChatInterface from "./components/ChatInterface";
import CommandPalette from "./components/CommandPalette";
import { FadeIn, AnimatedButton } from "./components/Animations";
import { useKeyboardShortcuts, useCommandPalette } from "./lib/hooks";
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
  const { createConversation } = useChatStore();

  // Command palette integration
  const { isOpen, open, close } = useCommandPalette();

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPalette: () => {
      console.log("🎯 Opening Command Palette from App.tsx");
      open();
    },
    onNewConversation: () => {
      console.log("🎯 Creating new conversation from App.tsx");
      createConversation("New conversation", "gpt-4", "local");
    },
    onSettings: () => {
      console.log("🎯 Opening settings from App.tsx");
      startTransition(() => setShowSettings(true));
    },
  });

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

  // Listen for DOM custom event from Command Palette to open Settings
  useEffect(() => {
    const handler = () => startTransition(() => setShowSettings(true));
    document.addEventListener("open-settings", handler as EventListener);
    return () =>
      document.removeEventListener("open-settings", handler as EventListener);
  }, []);

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
          {/* Modern Header Bar with Animations */}
          <FadeIn>
            <header
              className="
                bg-gradient-to-r from-blue-50/90 to-purple-50/90 dark:from-gray-900/90 dark:to-gray-800/90 backdrop-blur-xl
                border-b-2 border-blue-200/50 dark:border-purple-700/50
                px-6 py-4
                flex items-center justify-between
                relative z-30
                shadow-lg shadow-blue-500/10
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
                {/* Debug indicator */}
                <div className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded font-mono">
                  CMD+K: {isOpen ? "OPEN" : "CLOSED"}
                </div>
              </div>

              {/* Center - Command Palette Trigger */}
              <div className="hidden md:flex">
                <AnimatedButton
                  onClick={open}
                  variant="primary"
                  size="sm"
                  className="!bg-gradient-to-r !from-blue-500 !to-purple-600 !text-white font-bold"
                >
                  🔍 Search (Ctrl+K)
                </AnimatedButton>
              </div>

              {/* Right side - Action buttons */}
              <div className="flex items-center space-x-2">
                {/* Project Context Button */}
                <AnimatedButton
                  onClick={() => setShowProjectContext((s) => !s)}
                  variant={showProjectContext ? "primary" : "secondary"}
                  size="sm"
                >
                  <span className="text-base">📁</span>
                  <span className="hidden sm:inline ml-1">Context</span>
                  {events.filter(
                    (event) => Date.now() - event.ts < 5 * 60 * 1000,
                  ).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </AnimatedButton>

                {/* Settings Button */}
                <AnimatedButton
                  onClick={() => setShowSettings((s) => !s)}
                  variant={showSettings ? "primary" : "secondary"}
                  size="sm"
                >
                  <span className="text-base">⚙️</span>
                  <span className="hidden sm:inline ml-1">Settings</span>
                </AnimatedButton>

                {/* Window Toggle Button */}
                <AnimatedButton
                  onClick={async () => {
                    try {
                      await database.window.toggle();
                    } catch (e) {
                      console.error("failed to toggle window", e);
                    }
                  }}
                  variant="secondary"
                  size="sm"
                >
                  <span className="text-base">🪟</span>
                  <span className="hidden lg:inline ml-1">Toggle</span>
                </AnimatedButton>
              </div>
            </header>
          </FadeIn>

          {/* Settings Panel */}
          {showSettings && (
            <Suspense fallback={null}>
              <div className="absolute right-6 top-20 z-50 shadow-xl">
                <Settings onClose={() => setShowSettings(false)} />
              </div>
            </Suspense>
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

      {/* Command Palette */}
      <CommandPalette isOpen={isOpen} onClose={close} />

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
