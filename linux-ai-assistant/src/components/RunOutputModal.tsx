import { useUiStore } from "../lib/stores/uiStore";

export default function RunOutputModal() {
  const { runModal, closeRunResult } = useUiStore();
  if (!runModal.open) return null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-11/12 max-w-3xl bg-white dark:bg-gray-900 rounded shadow-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Execution Result</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => copy(runModal.stdout)}
              className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              Copy Stdout
            </button>
            <button
              onClick={() => copy(runModal.stderr)}
              className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              Copy Stderr
            </button>
            <button
              onClick={closeRunResult}
              className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500">Stdout</div>
            <pre className="max-h-48 overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
              {runModal.stdout || "(no output)"}
            </pre>
          </div>
          <div>
            <div className="text-xs text-gray-500">Stderr</div>
            <pre className="max-h-48 overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
              {runModal.stderr || "(no error)"}
            </pre>
          </div>
          <div className="text-sm text-gray-600">
            Exit code: {String(runModal.exit_code ?? "—")}
            {runModal.timed_out ? " (timed out)" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
