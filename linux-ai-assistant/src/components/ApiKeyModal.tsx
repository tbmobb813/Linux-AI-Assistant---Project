import { useState, useEffect } from "react";
import { useUiStore } from "../lib/stores/uiStore";

export default function ApiKeyModal() {
  const { apiKeyModal, closeApiKeyModal } = useUiStore();
  const [keyValue, setKeyValue] = useState("");

  // Reset keyValue when modal is closed by any means
  import { useEffect } from "react";
  useEffect(() => {
    if (!apiKeyModal.open) {
      setKeyValue("");
    }
  }, [apiKeyModal.open]);
  if (!apiKeyModal.open) return null;

  const resetAndClose = () => {
    setKeyValue("");
    closeApiKeyModal();
  };

  const handleSubmit = () => {
    if (keyValue.trim()) {
      apiKeyModal.onSubmit?.(keyValue.trim());
      resetAndClose();
    }
  };

  const handleCancel = () => {
    resetAndClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-96 bg-white dark:bg-gray-900 rounded shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">{apiKeyModal.title}</h3>
          <button
            onClick={handleCancel}
            className="text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-gray-200 text-xs"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label
              htmlFor="api-key-input"
              className="text-xs text-gray-700 dark:text-gray-300 block mb-1"
            >
              API Key
            </label>
            <input
              id="api-key-input"
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                } else if (e.key === "Escape") {
                  handleCancel();
                }
              }}
              placeholder="Enter your API key"
              className="w-full px-2 py-1 rounded bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
              Your API key will be securely stored in the system keyring.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-xs rounded bg-gray-200 border border-gray-300 hover:bg-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!keyValue.trim()}
              className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
