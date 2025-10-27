import { useUiStore } from "../lib/stores/uiStore";
import { invokeSafe } from "../lib/utils/tauri";

export default function CommandSuggestionsModal(): JSX.Element | null {
  const suggestionsModal = useUiStore((s: any) => s.suggestionsModal);
  const closeSuggestions = useUiStore((s: any) => s.closeSuggestions);
  const addToast = useUiStore((s: any) => s.addToast);
  const showRunResult = useUiStore((s: any) => s.showRunResult);

  if (!suggestionsModal.open) return null;
  const items: string[] = suggestionsModal.items || [];

  const onCopy = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      addToast({ message: "Copied", type: "success", ttl: 1000 });
    } catch (e) {
      addToast({ message: "Copy failed", type: "error", ttl: 1200 });
    }
  };

  const onRun = async (cmd: string) => {
    try {
      const res = await invokeSafe<any>("run_code", {
        language: "sh",
        code: cmd,
        timeoutMs: 10000,
        cwd: null,
      });
      if (res) showRunResult(res);
    } catch (e) {
      addToast({ message: "Run failed", type: "error", ttl: 1500 });
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-[600px] max-w-[95vw] bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded shadow-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Command suggestions</h3>
          <button
            className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={closeSuggestions}
            aria-label="Close suggestions"
          >
            ✕
          </button>
        </div>
        {items.length === 0 ? (
          <div className="text-sm text-gray-500">No suggestions</div>
        ) : (
          <ul className="space-y-2">
            {items.map((cmd, idx) => (
              <li
                key={idx}
                className="p-2 rounded border border-gray-200 dark:border-gray-800"
              >
                <div className="text-xs font-mono break-all whitespace-pre-wrap">
                  {cmd}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                    onClick={() => onCopy(cmd)}
                  >
                    Copy
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500"
                    onClick={() => onRun(cmd)}
                  >
                    Run
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
