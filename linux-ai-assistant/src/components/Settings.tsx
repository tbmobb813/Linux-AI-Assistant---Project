import { useState } from "react";
import { useSettingsStore } from "../lib/stores/settingsStore";

type Props = {
  onClose?: () => void;
};

// Minimal settings panel focused on the global shortcut
export default function Settings({ onClose }: Props): JSX.Element {
  const { globalShortcut, setGlobalShortcut } = useSettingsStore();
  const [value, setValue] = useState<string>(globalShortcut);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    try {
      await setGlobalShortcut(v);
      setError(null);
      onClose?.();
    } catch (e) {
      setError("Failed to save shortcut");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-80 bg-gray-900 border border-gray-700 rounded shadow-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-200">Settings</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xs"
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
          className="text-xs text-gray-300"
        >
          Global shortcut
        </label>
        <input
          id="global-shortcut-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="CommandOrControl+Space"
          className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-[11px] text-gray-400">
          Examples: CommandOrControl+Space, Ctrl+Shift+K
        </p>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs rounded bg-gray-800 border border-gray-700 hover:bg-gray-700"
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
    </div>
  );
}
