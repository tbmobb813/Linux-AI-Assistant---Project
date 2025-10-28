import { useState } from "react";
import { useSettingsStore } from "../lib/stores/settingsStore";
import { invokeSafe } from "../lib/utils/tauri";
import { useUiStore } from "../lib/stores/uiStore";
import OllamaModelManager from "./OllamaModelManager";
import { withErrorHandling } from "../lib/utils/errorHandler";

type Props = {
  onClose?: () => void;
};

// Minimal settings panel focused on the global shortcut
export default function Settings({ onClose }: Props) {
  const { globalShortcut, setGlobalShortcut, theme, setTheme } =
    useSettingsStore();
  const { allowCodeExecution, setAllowCodeExecution } = useSettingsStore();
  const { projectRoot, setProjectRoot, stopProjectWatch } = useSettingsStore();
  const { defaultProvider, setDefaultProvider, defaultModel, setDefaultModel } =
    useSettingsStore();
  const { ollamaEndpoint, setOllamaEndpoint } = useSettingsStore();
  const {
    enableHybridRouting,
    setEnableHybridRouting,
    preferLocal,
    setPreferLocal,
  } = useSettingsStore();
  const { addToast } = useUiStore();
  const {
    autoCleanupEnabled,
    setAutoCleanupEnabled,
    maxConversationAge,
    setMaxConversationAge,
    maxConversationCount,
    setMaxConversationCount,
    performManualCleanup,
  } = useSettingsStore();
  const { showAudit } = useUiStore();
  const [value, setValue] = useState<string>(globalShortcut);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [projectPath, setProjectPath] = useState<string>(projectRoot || "");
  const [showOllamaManager, setShowOllamaManager] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [cleanupProgress, setCleanupProgress] = useState<string | null>(null);

  const validate = (s: string): string | null => {
    if (!s.trim()) return "Shortcut can't be empty";
    // very light validation: must contain a modifier and a key
    const hasModifier =
      /(Command|Control|Ctrl|Cmd|Alt|Option|Shift|Super|Meta)/i.test(s);
    const hasKey = /\+\s*[^+\s]+$/i.test(s);
    if (!hasModifier || !hasKey)
      return "Use format like CommandOrControl+Space or Ctrl+Shift+K";
    return null;
  };

  const onSave = async () => {
    const v = value.trim();
    const err = validate(v);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);

    const result = await withErrorHandling(
      async () => {
        await setGlobalShortcut(v);
        setError(null);
        onClose?.();
      },
      "Settings.onSave",
      "Failed to save settings. Please try again.",
    );

    if (result !== null) {
      // Success - settings were saved
      addToast({
        message: "Settings saved successfully",
        type: "success",
        ttl: 2000,
      });
    } else {
      // Error occurred - handled by withErrorHandling
      setError("Failed to save shortcut");
    }

    setSaving(false);
  };

  const handleExportConversations = async () => {
    setExportProgress("Exporting conversations...");

    const result = await withErrorHandling(
      async () => {
        const jsonData = await invokeSafe("export_conversations_json", {});
        const filename = `ai_conversations_${new Date().toISOString().split("T")[0]}.json`;
        const result = await invokeSafe("save_export_file", {
          content: jsonData,
          filename: filename,
        });

        setExportProgress(`Conversations exported to: ${result}`);
        setTimeout(() => setExportProgress(null), 3000);

        addToast({
          message: "Conversations exported successfully",
          type: "success",
          ttl: 3000,
        });

        return result;
      },
      "Settings.handleExportConversations",
      "Failed to export conversations",
    );

    if (result === null) {
      setExportProgress("Export failed");
      setTimeout(() => setExportProgress(null), 3000);
    }
  };

  const handleImportConversations = async () => {
    setImportProgress("Loading file...");

    const result = await withErrorHandling(
      async () => {
        const fileContent = await invokeSafe("load_import_file", {});

        setImportProgress("Importing conversations...");
        const result = await invokeSafe("import_conversations_json", {
          json_content: fileContent,
        });

        setImportProgress(String(result));
        setTimeout(() => setImportProgress(null), 3000);

        addToast({
          message: "Conversations imported successfully",
          type: "success",
          ttl: 3000,
        });

        return result;
      },
      "Settings.handleImportConversations",
      "Failed to import conversations",
    );

    if (result === null) {
      setImportProgress("Import failed");
      setTimeout(() => setImportProgress(null), 3000);
    }
  };

  const handleManualCleanup = async () => {
    setCleanupProgress("Cleaning up conversations...");
    try {
      const result = await performManualCleanup();
      setCleanupProgress(result);
      setTimeout(() => setCleanupProgress(null), 3000);
    } catch (error) {
      setCleanupProgress(`Cleanup failed: ${error}`);
      setTimeout(() => setCleanupProgress(null), 3000);
    }
  };

  return (
    <div className="w-80 bg-gray-100 text-gray-900 border border-gray-300 dark:bg-gray-900 dark:text-white dark:border-gray-700 rounded shadow-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Settings</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-gray-200 text-xs"
            aria-label="Close settings"
            title="Close"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="global-shortcut-input"
          className="text-xs text-gray-700 dark:text-gray-300"
        >
          Global shortcut
        </label>
        <input
          id="global-shortcut-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="CommandOrControl+Space"
          className="w-full px-2 py-1 rounded bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-[11px] text-gray-600 dark:text-gray-400">
          Examples: CommandOrControl+Space, Ctrl+Shift+K
        </p>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>

      <div className="space-y-1 pt-2">
        <label
          htmlFor="theme-select"
          className="text-xs text-gray-700 dark:text-gray-300"
        >
          Theme
        </label>
        <select
          id="theme-select"
          value={theme}
          onChange={(e) => setTheme(e.target.value as any)}
          className="w-full px-2 py-1 rounded bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700 text-sm"
        >
          <option value="system">System (default)</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <p className="text-[11px] text-gray-600 dark:text-gray-400">
          When set to System, the app follows your OS dark mode.
        </p>
      </div>

      <div className="space-y-1 pt-2">
        <label className="text-xs text-gray-700 dark:text-gray-300">
          Default provider
        </label>
        <select
          value={defaultProvider}
          onChange={(e) => setDefaultProvider(e.target.value)}
          className="w-full px-2 py-1 rounded bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700 text-sm"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="gemini">Gemini</option>
          <option value="ollama">Ollama (Local)</option>
          <option value="local">Local (mock)</option>
        </select>
        <label className="text-xs text-gray-700 dark:text-gray-300">
          Default model
        </label>
        <input
          value={defaultModel}
          onChange={(e) => setDefaultModel(e.target.value)}
          placeholder="e.g., gpt-4o, claude-3-5-sonnet, gemini-1.5-flash"
          className="w-full px-2 py-1 rounded bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-[11px] text-gray-600 dark:text-gray-400">
          Provider-specific models are supported; leave blank to use provider
          defaults.
        </div>

        {defaultProvider === "ollama" && (
          <>
            <label className="text-xs text-gray-700 dark:text-gray-300 pt-2 block">
              Ollama endpoint
            </label>
            <input
              value={ollamaEndpoint}
              onChange={(e) => setOllamaEndpoint(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full px-2 py-1 rounded bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-[11px] text-gray-600 dark:text-gray-400">
              URL of your Ollama server. Make sure Ollama is running.
            </div>
            <div className="pt-2">
              <button
                onClick={() => setShowOllamaManager(true)}
                className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white"
              >
                Manage Models
              </button>
            </div>
          </>
        )}

        {/* Hybrid Routing Settings */}
        <div className="space-y-1 pt-2">
          <label className="text-xs text-gray-700 dark:text-gray-300">
            Smart Routing
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={enableHybridRouting}
                onChange={(e) => setEnableHybridRouting(e.target.checked)}
                className="rounded"
              />
              Enable hybrid routing (auto-choose between local/cloud)
            </label>

            {enableHybridRouting && (
              <label className="flex items-center gap-2 text-xs ml-4">
                <input
                  type="checkbox"
                  checked={preferLocal}
                  onChange={(e) => setPreferLocal(e.target.checked)}
                  className="rounded"
                />
                Prefer local models when available
              </label>
            )}
          </div>

          {enableHybridRouting && (
            <div className="text-[11px] text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              💡 With hybrid routing enabled, the system will automatically
              choose the best available provider based on your preferences and
              model availability.
            </div>
          )}
        </div>

        <div className="pt-1 flex flex-wrap gap-2">
          {[
            { id: "openai", label: "Save OpenAI API key" },
            { id: "anthropic", label: "Save Anthropic API key" },
            { id: "gemini", label: "Save Gemini API key" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={async () => {
                const k = window.prompt(`${p.label}`, "");
                if (!k) return;
                try {
                  await invokeSafe("set_api_key", { provider: p.id, key: k });
                  useUiStore.getState().addToast({
                    message: `${p.id} key saved to keyring`,
                    type: "success",
                    ttl: 1400,
                  });
                } catch (e) {
                  useUiStore.getState().addToast({
                    message: `Failed to save ${p.id} key`,
                    type: "error",
                    ttl: 1600,
                  });
                }
              }}
              className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1 pt-2">
        <label className="text-xs text-gray-700 dark:text-gray-300">
          Code execution
        </label>
        <div className="flex items-center gap-2">
          <input
            id="allow-code-exec"
            type="checkbox"
            checked={allowCodeExecution}
            onChange={(e) => setAllowCodeExecution(e.target.checked)}
          />
          <label
            htmlFor="allow-code-exec"
            className="text-xs text-gray-600 dark:text-gray-400"
          >
            Allow running code snippets (use with caution)
          </label>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 pt-1">
          Warning: Enabling code execution allows the app to run commands with
          your user permissions. Only enable this if you trust the source of
          snippets. You can leave it disabled to prevent accidental execution.
        </p>
        <div className="pt-2">
          <button
            onClick={async () => {
              // fetch last ~200 lines of audit and show modal
              try {
                const content =
                  (await invokeSafe<string>("read_audit", { lines: 200 })) ||
                  "";
                showAudit(content);
              } catch (e) {
                console.error("failed to load audit log", e);
              }
            }}
            className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            View execution audit
          </button>
        </div>
      </div>

      <div className="space-y-1 pt-2">
        <label className="text-xs text-gray-700 dark:text-gray-300">
          Project root (enable file watcher)
        </label>
        <input
          value={projectPath}
          onChange={(e) => setProjectPath(e.target.value)}
          placeholder="/path/to/project"
          className="w-full px-2 py-1 rounded bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="pt-1">
          <button
            onClick={async () => {
              if (!projectPath.trim()) return;
              await setProjectRoot(projectPath.trim());
            }}
            className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            Watch folder
          </button>
          {projectRoot && (
            <button
              onClick={async () => {
                await stopProjectWatch();
                setProjectPath("");
              }}
              className="ml-2 text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              Stop watching
            </button>
          )}
        </div>
        <p className="text-[11px] text-gray-600 dark:text-gray-400">
          Changes will appear as toasts for now. Future versions will surface
          project-aware context in chat.
        </p>
        {projectRoot && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Currently watching: {projectRoot}
          </p>
        )}
      </div>

      {/* Data Management */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Data Management
        </h3>

        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleExportConversations}
              disabled={!!exportProgress}
              className="flex-1 text-xs px-2 py-1 rounded bg-green-100 hover:bg-green-200 text-green-800 border border-green-300 disabled:opacity-60 dark:bg-green-900 dark:text-green-100 dark:border-green-700 dark:hover:bg-green-800"
            >
              {exportProgress ? "Exporting..." : "Export Conversations"}
            </button>

            <button
              onClick={handleImportConversations}
              disabled={!!importProgress}
              className="flex-1 text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 disabled:opacity-60 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700 dark:hover:bg-blue-800"
            >
              {importProgress ? "Importing..." : "Import Conversations"}
            </button>
          </div>

          {exportProgress && (
            <p className="text-[11px] text-green-600 dark:text-green-400">
              {exportProgress}
            </p>
          )}

          {importProgress && (
            <p className="text-[11px] text-blue-600 dark:text-blue-400">
              {importProgress}
            </p>
          )}
        </div>

        <p className="text-[11px] text-gray-600 dark:text-gray-400">
          Export conversations as JSON or import from a previous backup.
          Individual conversations can be exported using the 📄 (JSON) or 📝
          (Markdown) buttons. Imported conversations will preserve their
          original timestamps and IDs.
        </p>
      </div>

      {/* Data Retention Controls */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Data Retention
        </h3>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoCleanupEnabled}
              onChange={(e) => setAutoCleanupEnabled(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              Enable automatic cleanup
            </span>
          </label>

          {autoCleanupEnabled && (
            <div className="space-y-2 ml-5">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400 w-24">
                  Max Age (days):
                </label>
                <input
                  type="number"
                  value={maxConversationAge}
                  onChange={(e) =>
                    setMaxConversationAge(parseInt(e.target.value) || 0)
                  }
                  min="0"
                  className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (0 = disabled)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400 w-24">
                  Max Count:
                </label>
                <input
                  type="number"
                  value={maxConversationCount}
                  onChange={(e) =>
                    setMaxConversationCount(parseInt(e.target.value) || 0)
                  }
                  min="0"
                  className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (0 = unlimited)
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleManualCleanup}
              disabled={!!cleanupProgress}
              className="flex-1 text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 disabled:opacity-60 dark:bg-red-900 dark:text-red-100 dark:border-red-700 dark:hover:bg-red-800"
            >
              {cleanupProgress ? "Cleaning..." : "Manual Cleanup (All)"}
            </button>
          </div>

          {cleanupProgress && (
            <p className="text-[11px] text-red-600 dark:text-red-400">
              {cleanupProgress}
            </p>
          )}
        </div>

        <p className="text-[11px] text-gray-600 dark:text-gray-400">
          Automatic cleanup removes old conversations based on age or count.
          Manual cleanup will remove ALL conversations permanently.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs rounded bg-gray-200 border border-gray-300 hover:bg-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
        <button
          onClick={onSave}
          disabled={saving}
          className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Ollama Model Manager Modal */}
      {showOllamaManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <OllamaModelManager onClose={() => setShowOllamaManager(false)} />
        </div>
      )}
    </div>
  );
}
