import { useState, useEffect } from "react";
import { useUiStore } from "../lib/stores/uiStore";

export default function CodeExecutionConfirmDialog() {
  const {
    codeExecutionDialog,
    closeCodeExecutionDialog,
    confirmCodeExecution,
  } = useUiStore();
  const [acknowledged, setAcknowledged] = useState(false);
  const [delayComplete, setDelayComplete] = useState(false);

  useEffect(() => {
    if (codeExecutionDialog.open) {
      // Reset states when dialog opens
      setAcknowledged(false);
      setDelayComplete(false);

      // Start the 3-second delay timer
      const timer = setTimeout(() => {
        setDelayComplete(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [codeExecutionDialog.open]);

  if (!codeExecutionDialog.open) return null;

  const canExecute = acknowledged && delayComplete;

  const handleConfirm = () => {
    if (canExecute) {
      confirmCodeExecution();
    }
  };

  const handleCancel = () => {
    closeCodeExecutionDialog();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-11/12 max-w-3xl bg-white dark:bg-gray-900 rounded shadow-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">
            ⚠️ Security Warning: Code Execution
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            You are about to execute code on your system. This can be dangerous
            if the code is malicious or untrusted.
          </p>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 mb-1">
            Language: {codeExecutionDialog.language || "unknown"}
          </div>
          <div className="text-xs font-semibold text-gray-500 mb-2">
            Full Command:
          </div>
          <pre className="max-h-64 overflow-auto p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm whitespace-pre-wrap border border-gray-300 dark:border-gray-700">
            {codeExecutionDialog.code}
          </pre>
        </div>

        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I understand the risks and have reviewed the code above. I confirm
              that I trust this code and want to execute it on my system.
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {!delayComplete && <span>Please wait before executing...</span>}
            {delayComplete && !acknowledged && (
              <span>Please acknowledge the risks above</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canExecute}
              className="px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !canExecute
                  ? "Please wait and acknowledge the risks"
                  : "Execute code"
              }
            >
              {!delayComplete ? "Execute (waiting...)" : "Execute Code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
