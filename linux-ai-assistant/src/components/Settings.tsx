import { useState } from "react";
import { useSettingsStore } from "../lib/stores/settingsStore";
import { invokeSafe } from "../lib/utils/tauri";
import { useUiStore } from "../lib/stores/uiStore";

type Props = {
  onClose?: () => void;
};

// Settings panel
export default function Settings({ onClose }: Props) {
  const { globalShortcut, setGlobalShortcut, theme, setTheme } =
    useSettingsStore();
  const { allowCodeExecution, setAllowCodeExecution } = useSettingsStore();
  const { projectRoot, setProjectRoot, stopProjectWatch } = useSettingsStore();
  const { defaultProvider, setDefaultProvider, defaultModel, setDefaultModel } =
    useSettingsStore();
  const { showAudit } = useUiStore();
  const [value, setValue] = useState<string>(globalShortcut);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [projectPath, setProjectPath] = useState<string>(projectRoot || "");

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
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
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
          className="w-full px-2 py-1 rounded bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
        <p className="text-[11px] text-gray-600 dark:text-gray-400">
          Choose application theme. System will follow OS preference.
        </p>
      </div>

      <div className="space-y-1 pt-2">
        <label className="text-xs text-gray-700 dark:text-gray-300">
          Provider & model
        </label>
        <select
          value={defaultProvider}
          onChange={(e) => setDefaultProvider(e.target.value)}
          className="w-full px-2 py-1 rounded bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700 text-sm"
        >
          <option value="local">Local (mock)</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="gemini">Gemini</option>
        </select>
        <label className="text-xs text-gray-700 dark:text-gray-300 mt-2 block">
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
    </div>
  );
}
