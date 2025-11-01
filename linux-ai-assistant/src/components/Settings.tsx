import { useState } from "react";
import { useSettingsStore } from "../lib/stores/settingsStore";
import { useUiStore } from "../lib/stores/uiStore";
import { withErrorHandling } from "../lib/utils/errorHandler";
import { FileText, Activity, Keyboard, Monitor } from "lucide-react";
import FileWatcherSettings from "./FileWatcherSettings";
import PerformanceDashboard from "./PerformanceDashboard";
import ShortcutSettings from "./ShortcutSettings";
import WindowPositionSettings from "./WindowPositionSettings";

type Props = {
  onClose?: () => void;
};

// Minimal settings panel focused on the global shortcut
export default function Settings({ onClose }: Props): JSX.Element {
  const { globalShortcut, setGlobalShortcut, theme, setTheme } =
    useSettingsStore();
  const addToast = useUiStore((s) => s.addToast);
  const [value, setValue] = useState<string>(globalShortcut);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showFileWatcherSettings, setShowFileWatcherSettings] = useState(false);
  const [showPerformanceDashboard, setShowPerformanceDashboard] =
    useState(false);
  const [showShortcutSettings, setShowShortcutSettings] = useState(false);
  const [showWindowPositionSettings, setShowWindowPositionSettings] =
    useState(false);

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

    if (result === null) {
      // Error occurred - handled by withErrorHandling
      setError("Failed to save shortcut");
    } else {
      // Success - settings were saved
      addToast({
        message: "Settings saved successfully",
        type: "success",
        ttl: 2000,
      });
    }

    setSaving(false);
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

      {/* File Watcher Settings Button */}
      <div className="pt-2 space-y-2">
        <button
          onClick={() => setShowShortcutSettings(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
        >
          <Keyboard className="w-4 h-4" />
          Global Shortcuts
        </button>

        <button
          onClick={() => setShowWindowPositionSettings(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
        >
          <Monitor className="w-4 h-4" />
          Window Position
        </button>

        <button
          onClick={() => setShowFileWatcherSettings(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
        >
          <FileText className="w-4 h-4" />
          File Watcher Settings
        </button>

        <button
          onClick={() => setShowPerformanceDashboard(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
        >
          <Activity className="w-4 h-4" />
          Performance Dashboard
        </button>
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

      {/* Shortcut Settings Modal */}
      {showShortcutSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <ShortcutSettings onClose={() => setShowShortcutSettings(false)} />
        </div>
      )}

      {/* Shortcut Settings Modal */}
      {showShortcutSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <ShortcutSettings onClose={() => setShowShortcutSettings(false)} />
        </div>
      )}

      {/* Window Position Settings Modal */}
      {showWindowPositionSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <WindowPositionSettings
            onClose={() => setShowWindowPositionSettings(false)}
          />
        </div>
      )}

      {/* File Watcher Settings Modal */}
      {showFileWatcherSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <FileWatcherSettings
            onClose={() => setShowFileWatcherSettings(false)}
          />
        </div>
      )}

      {/* Performance Dashboard Modal */}
      {showPerformanceDashboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <PerformanceDashboard
            onClose={() => setShowPerformanceDashboard(false)}
          />
        </div>
      )}
    </div>
  );
}
