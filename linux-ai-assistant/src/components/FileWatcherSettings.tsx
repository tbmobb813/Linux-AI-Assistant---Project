import { useState } from "react";
import { useSettingsStore } from "../lib/stores/settingsStore";
import { useUiStore } from "../lib/stores/uiStore";
import { FolderOpen, Plus, X, AlertCircle, FileText } from "lucide-react";

interface FileWatcherSettingsProps {
  onClose?: () => void;
}

export default function FileWatcherSettings({
  onClose,
}: FileWatcherSettingsProps) {
  const {
    projectRoot,
    fileWatcherIgnorePatterns,
    setProjectRoot,
    stopProjectWatch,
    setFileWatcherIgnorePatterns,
  } = useSettingsStore();
  const addToast = useUiStore((s) => s.addToast);

  const [localPatterns, setLocalPatterns] = useState<string[]>([
    ...fileWatcherIgnorePatterns,
  ]);
  const [newPattern, setNewPattern] = useState("");
  const [projectPath, setProjectPath] = useState(projectRoot || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAddPattern = () => {
    const pattern = newPattern.trim();
    if (pattern && !localPatterns.includes(pattern)) {
      setLocalPatterns([...localPatterns, pattern]);
      setNewPattern("");
    }
  };

  const handleRemovePattern = (index: number) => {
    setLocalPatterns(localPatterns.filter((_, i) => i !== index));
  };

  const handleSavePatterns = async () => {
    setIsUpdating(true);
    try {
      await setFileWatcherIgnorePatterns(localPatterns);
    } catch (e) {
      console.error("Failed to save patterns:", e);
    }
    setIsUpdating(false);
  };

  const handleSetProjectRoot = async () => {
    if (!projectPath.trim()) {
      addToast({
        message: "Please enter a valid project path",
        type: "error",
        ttl: 2000,
      });
      return;
    }

    setIsUpdating(true);
    try {
      await setProjectRoot(projectPath.trim());
      setProjectPath(projectPath.trim());
    } catch (e) {
      console.error("Failed to set project root:", e);
    }
    setIsUpdating(false);
  };

  const handleStopWatching = async () => {
    setIsUpdating(true);
    try {
      await stopProjectWatch();
      setProjectPath("");
    } catch (e) {
      console.error("Failed to stop watching:", e);
    }
    setIsUpdating(false);
  };

  const defaultPatterns = [
    "node_modules/**",
    ".git/**",
    "target/**",
    "dist/**",
    "build/**",
    "*.log",
    ".DS_Store",
    "Thumbs.db",
  ];

  const handleResetToDefaults = () => {
    setLocalPatterns([...defaultPatterns]);
  };

  return (
    <div className="w-96 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            File Watcher Settings
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Project Root */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Project Root
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="/path/to/your/project"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <button
              onClick={handleSetProjectRoot}
              disabled={isUpdating || !projectPath.trim()}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md flex items-center gap-1"
            >
              <FolderOpen className="w-4 h-4" />
              Watch
            </button>
          </div>

          {projectRoot && (
            <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <span className="text-sm text-green-700 dark:text-green-300">
                Currently watching: {projectRoot}
              </span>
              <button
                onClick={handleStopWatching}
                disabled={isUpdating}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Stop
              </button>
            </div>
          )}
        </div>

        {/* Ignore Patterns */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Ignore Patterns
            </h3>
            <button
              onClick={handleResetToDefaults}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Reset to defaults
            </button>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              Use gitignore-style patterns. ** matches directories recursively,
              * matches files.
            </span>
          </div>

          {/* Add New Pattern */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddPattern()}
              placeholder="node_modules/** or *.tmp"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <button
              onClick={handleAddPattern}
              disabled={!newPattern.trim()}
              className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-md flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Pattern List */}
          <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
            {localPatterns.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                No ignore patterns configured
              </div>
            ) : (
              localPatterns.map((pattern, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  <code className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {pattern}
                  </code>
                  <button
                    onClick={() => handleRemovePattern(index)}
                    className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSavePatterns}
            disabled={isUpdating}
            className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md"
          >
            {isUpdating ? "Saving..." : "Save Patterns"}
          </button>
        </div>
      </div>
    </div>
  );
}
