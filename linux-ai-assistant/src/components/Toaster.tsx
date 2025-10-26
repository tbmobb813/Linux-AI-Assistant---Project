import { useUiStore } from "../lib/stores/uiStore";

export default function Toaster() {
  const { toasts, removeToast } = useUiStore();

  return (
    <div className="fixed top-4 right-4 w-80 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`p-2 rounded shadow-md text-sm pointer-events-auto transform transition-all duration-200 ease-out ${
            t.type === "error"
              ? "bg-red-600 text-white"
              : t.type === "success"
              ? "bg-green-600 text-white"
              : "bg-gray-800 text-white"
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex justify-between items-center">
            <div className="flex-1 pr-2">{t.message}</div>
            <div className="flex items-center gap-2">
              {t.action && (
                <button
                  className="text-xs px-2 py-1 bg-blue-600 rounded"
                  onClick={() => {
                    try {
                      t.action?.onClick();
                    } catch (e) {
                      // swallow
                    }
                    removeToast(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                className="ml-2 text-xs opacity-75"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss"
              >
                x
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
