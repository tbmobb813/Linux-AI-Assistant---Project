import { useState, useEffect } from "react";
import {
  Monitor,
  RotateCcw,
  X,
  Check,
  AlertCircle,
  Info,
  Move,
  Maximize2,
} from "lucide-react";
import { database } from "../lib/api/database";

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
}

interface WindowPositionSettingsProps {
  onClose?: () => void;
}

export default function WindowPositionSettings({
  onClose,
}: WindowPositionSettingsProps) {
  const [windowState, setWindowState] = useState<WindowState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");

  useEffect(() => {
    loadWindowState();
  }, []);

  const loadWindowState = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const state = (await database.window.getState()) as WindowState;
      setWindowState(state);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load window state",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentState = async () => {
    try {
      setSaveStatus("saving");
      await database.window.saveState();
      await loadWindowState(); // Refresh the displayed state
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("error");
      setError(
        err instanceof Error ? err.message : "Failed to save window state",
      );
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const restoreState = async () => {
    try {
      setSaveStatus("saving");
      await database.window.restoreState();
      await loadWindowState(); // Refresh the displayed state
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("error");
      setError(
        err instanceof Error ? err.message : "Failed to restore window state",
      );
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const resetToDefault = async () => {
    try {
      setSaveStatus("saving");
      await database.window.resetState();
      await loadWindowState(); // Refresh the displayed state
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("error");
      setError(
        err instanceof Error ? err.message : "Failed to reset window state",
      );
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="w-[500px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">
            Loading window state...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[550px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Window Position Memory
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefault}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
            disabled={saveStatus === "saving"}
          >
            Reset
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
                <span className="text-sm">Processing...</span>
              </div>
            )}
            {saveStatus === "success" && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" />
                <span className="text-sm">
                  Window state updated successfully
                </span>
              </div>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Failed to update window state</span>
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
              <strong>Automatic Memory:</strong> The app automatically remembers
              your window position and size when you move or resize it. Use the
              controls below to manually manage the saved state.
            </div>
          </div>
        </div>

        {/* Current Window State */}
        {windowState && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Current Window State
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Position */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Move className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Position
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div>X: {windowState.x}px</div>
                  <div>Y: {windowState.y}px</div>
                </div>
              </div>

              {/* Size */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Maximize2 className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Size
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div>Width: {windowState.width}px</div>
                  <div>Height: {windowState.height}px</div>
                </div>
              </div>
            </div>

            {/* Maximized State */}
            <div className="mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Maximized State
                </span>
                <span
                  className={`text-sm font-mono px-2 py-1 rounded ${
                    windowState.maximized
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {windowState.maximized ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={saveCurrentState}
            disabled={saveStatus === "saving"}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Check className="w-4 h-4" />
            Save Current Position & Size
          </button>

          <button
            onClick={restoreState}
            disabled={saveStatus === "saving"}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Restore Saved Position & Size
          </button>

          <button
            onClick={resetToDefault}
            disabled={saveStatus === "saving"}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Monitor className="w-4 h-4" />
            Reset to Default (800x600, Top-Left)
          </button>
        </div>

        {/* Technical Details */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <strong>How it works:</strong> The app automatically saves your
            window position and size whenever you move or resize the window. On
            next startup, it will restore the last saved state. You can manually
            save, restore, or reset the window position using the buttons above.
          </div>
        </div>
      </div>
    </div>
  );
}
