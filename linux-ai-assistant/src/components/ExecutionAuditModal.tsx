import { useState } from "react";
import { useUiStore } from "../lib/stores/uiStore";
import { invokeSafe } from "../lib/utils/tauri";
import { useSettingsStore } from "../lib/stores/settingsStore";

export default function ExecutionAuditModal() {
  const { auditModal, closeAudit, showAudit } = useUiStore();
  const { allowCodeExecution } = useSettingsStore();
  const [rotating, setRotating] = useState(false);

  if (!auditModal.open) return null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // ignore
    }
  };

  const onRotate = async () => {
    if (!allowCodeExecution) {
      // don't allow rotation if execution isn't enabled? still allow.
    }
    setRotating(true);
    try {
      await invokeSafe("rotate_audit");
      // re-read
      const content =
        (await invokeSafe<string>("read_audit", { lines: 200 })) || "";
      showAudit(content);
    } catch (e) {
      console.error("rotate audit failed", e);
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-11/12 max-w-3xl bg-white dark:bg-gray-900 rounded shadow-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Execution Audit</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => copy(auditModal.content)}
              className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              Copy
            </button>
            <button
              onClick={onRotate}
              disabled={rotating}
              className="text-xs px-2 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-60"
            >
              {rotating ? "Rotating…" : "Rotate Log"}
            </button>
            <button
              onClick={closeAudit}
              className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <pre className="max-h-96 overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm whitespace-pre-wrap">
            {auditModal.content || "(no audit entries)"}
          </pre>
        </div>
      </div>
    </div>
  );
}
