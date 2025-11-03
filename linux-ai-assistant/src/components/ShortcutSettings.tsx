import { useState, useEffect } from "react";
import {
  Keyboard,
  X,
  Check,
  AlertCircle,
  Power,
  PowerOff,
  Info,
} from "lucide-react";
import { database } from "../lib/api/database";

interface ShortcutAction {
  ToggleWindow: any;
  NewConversation: any;
  OpenSettings: any;
  QuickCapture: any;
  FocusInput: any;
  ClearConversation: any;
  ExportCurrent: any;
  ToggleProfileMenu: any;
  SearchDocuments: any;
  ShowPerformance: any;
  ToggleRecording: any;
  QuickExport: any;
}

interface GlobalShortcut {
  action: keyof ShortcutAction;
  shortcut: string;
  enabled: boolean;
}

interface ShortcutConfig {
  shortcuts: GlobalShortcut[];
}

interface ShortcutSettingsProps {
  onClose?: () => void;
}

const actionDisplayNames: Record<keyof ShortcutAction, string> = {
  ToggleWindow: "Toggle Window",
  NewConversation: "New Conversation",
  OpenSettings: "Open Settings",
  QuickCapture: "Quick Capture",
  FocusInput: "Focus Input",
  ClearConversation: "Clear Conversation",
  ExportCurrent: "Export Current",
  ToggleProfileMenu: "Toggle Profile Menu",
  SearchDocuments: "Search Documents",
  ShowPerformance: "Show Performance",
  ToggleRecording: "Toggle Recording",
  QuickExport: "Quick Export",
};

const actionDescriptions: Record<keyof ShortcutAction, string> = {
  ToggleWindow: "Show/hide the main application window",
  NewConversation: "Create a new conversation",
  OpenSettings: "Open the settings panel",
  QuickCapture: "Quick capture input without showing window",
  FocusInput: "Focus the chat input field",
  ClearConversation: "Clear the current conversation",
  ExportCurrent: "Export current conversation to file",
  ToggleProfileMenu: "Open/close the profile selection menu",
  SearchDocuments: "Open document search interface",
  ShowPerformance: "Display performance metrics",
  ToggleRecording: "Start/stop voice recording",
  QuickExport: "Quick export in default format",
};

const defaultShortcuts: Record<keyof ShortcutAction, string> = {
  ToggleWindow: "CommandOrControl+Space",
  NewConversation: "CommandOrControl+N",
  OpenSettings: "CommandOrControl+Comma",
  QuickCapture: "CommandOrControl+Shift+Space",
  FocusInput: "CommandOrControl+Shift+I",
  ClearConversation: "CommandOrControl+Delete",
  ExportCurrent: "CommandOrControl+E",
  ToggleProfileMenu: "CommandOrControl+P",
  SearchDocuments: "CommandOrControl+Shift+F",
  ShowPerformance: "CommandOrControl+Shift+P",
  ToggleRecording: "CommandOrControl+R",
  QuickExport: "CommandOrControl+Shift+E",
};

const actionCategories: Record<keyof ShortcutAction, string> = {
  ToggleWindow: "Window & Focus",
  FocusInput: "Window & Focus",
  QuickCapture: "Window & Focus",
  NewConversation: "Conversation",
  ClearConversation: "Conversation",
  ExportCurrent: "Export",
  QuickExport: "Export",
  ToggleProfileMenu: "Profiles",
  SearchDocuments: "Search",
  OpenSettings: "System",
  ShowPerformance: "System",
  ToggleRecording: "Recording",
};

export default function ShortcutSettings({ onClose }: ShortcutSettingsProps) {
  const [config, setConfig] = useState<ShortcutConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [tempShortcut, setTempShortcut] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const data = (await database.shortcuts.getConfig()) as ShortcutConfig;
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shortcuts");
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (newConfig: ShortcutConfig) => {
    try {
      setSaveStatus("saving");
      await database.shortcuts.updateConfig(newConfig);
      setConfig(newConfig);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("error");
      setError(err instanceof Error ? err.message : "Failed to save shortcuts");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const toggleShortcut = async (action: keyof ShortcutAction) => {
    if (!config) return;

    const newConfig = {
      ...config,
      shortcuts: config.shortcuts.map((shortcut) =>
        shortcut.action === action
          ? { ...shortcut, enabled: !shortcut.enabled }
          : shortcut,
      ),
    };

    await saveConfig(newConfig);
  };

  const updateShortcut = async (
    action: keyof ShortcutAction,
    newShortcut: string,
  ) => {
    if (!config) return;

    try {
      // Validate shortcut first
      await database.shortcuts.validateShortcut(newShortcut);

      const newConfig = {
        ...config,
        shortcuts: config.shortcuts.map((shortcut) =>
          shortcut.action === action
            ? { ...shortcut, shortcut: newShortcut }
            : shortcut,
        ),
      };

      await saveConfig(newConfig);
      setEditingShortcut(null);
      setTempShortcut("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid shortcut");
    }
  };

  const resetToDefault = async (action: keyof ShortcutAction) => {
    const defaultShortcut = defaultShortcuts[action];
    await updateShortcut(action, defaultShortcut);
  };

  const resetAllToDefaults = async () => {
    if (!config) return;

    const newConfig = {
      ...config,
      shortcuts: config.shortcuts.map((shortcut) => ({
        ...shortcut,
        shortcut: defaultShortcuts[shortcut.action],
        enabled: shortcut.action === "ToggleWindow", // Only enable toggle window by default
      })),
    };

    await saveConfig(newConfig);
  };

  const startEditing = (
    action: keyof ShortcutAction,
    currentShortcut: string,
  ) => {
    setEditingShortcut(action);
    setTempShortcut(currentShortcut);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingShortcut(null);
    setTempShortcut("");
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingShortcut) {
      e.preventDefault();

      const modifiers = [];
      if (e.ctrlKey || e.metaKey) modifiers.push("CommandOrControl");
      if (e.altKey) modifiers.push("Alt");
      if (e.shiftKey) modifiers.push("Shift");

      let key = e.key;
      if (key === " ") key = "Space";
      if (
        key === "Control" ||
        key === "Meta" ||
        key === "Alt" ||
        key === "Shift"
      )
        return;

      const shortcut =
        modifiers.length > 0 ? `${modifiers.join("+")}+${key}` : key;
      setTempShortcut(shortcut);
    }
  };

  if (isLoading) {
    return (
      <div className="w-[600px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">
            Loading shortcuts...
          </span>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="w-[600px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-6">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <div className="text-red-600 dark:text-red-400 mb-2">
            Failed to load shortcuts
          </div>
          {error && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {error}
            </div>
          )}
          <button
            onClick={loadConfig}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-[800px] max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Global Shortcuts
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetAllToDefaults}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Reset All
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Save Status */}
        {saveStatus !== "idle" && (
          <div className="mb-4">
            {saveStatus === "saving" && (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span className="text-sm">Saving shortcuts...</span>
              </div>
            )}
            {saveStatus === "success" && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" />
                <span className="text-sm">Shortcuts saved successfully</span>
              </div>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Failed to save shortcuts</span>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> Click on a shortcut to edit it. Use standard
              keyboard notation like "CommandOrControl+Space" or "Alt+Shift+N".
            </div>
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-6">
          {Object.entries(
            config.shortcuts.reduce(
              (acc, shortcut) => {
                const category = actionCategories[shortcut.action];
                if (!acc[category]) {
                  acc[category] = [];
                }
                acc[category].push(shortcut);
                return acc;
              },
              {} as Record<string, GlobalShortcut[]>,
            ),
          ).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1"></div>
                <span className="px-2">{category}</span>
                <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1"></div>
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.action}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleShortcut(shortcut.action)}
                          className={`p-1 rounded ${
                            shortcut.enabled
                              ? "text-green-600 dark:text-green-400"
                              : "text-gray-400 dark:text-gray-600"
                          }`}
                          title={
                            shortcut.enabled
                              ? "Disable shortcut"
                              : "Enable shortcut"
                          }
                        >
                          {shortcut.enabled ? (
                            <Power className="w-4 h-4" />
                          ) : (
                            <PowerOff className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {actionDisplayNames[shortcut.action]}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {actionDescriptions[shortcut.action]}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingShortcut === shortcut.action ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tempShortcut}
                            onChange={(e) => setTempShortcut(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Press keys..."
                            autoFocus
                          />
                          <button
                            onClick={() =>
                              updateShortcut(shortcut.action, tempShortcut)
                            }
                            className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                            title="Save shortcut"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            title="Cancel editing"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              startEditing(shortcut.action, shortcut.shortcut)
                            }
                            className="px-3 py-1 text-sm font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            {shortcut.shortcut}
                          </button>
                          <button
                            onClick={() => resetToDefault(shortcut.action)}
                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                            title="Reset to default"
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Keyboard Capture Instructions */}
        {editingShortcut && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Editing mode:</strong> Press the key combination you want
              to use, or type it manually (e.g.,
              "CommandOrControl+Shift+Space").
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
