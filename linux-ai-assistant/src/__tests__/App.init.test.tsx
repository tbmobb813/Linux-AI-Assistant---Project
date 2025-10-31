// vitest globals (describe/it/expect/vi) are available in the test env
import { render, waitFor } from "@testing-library/react";

beforeEach(() => {
  vi.resetModules();
});

describe("App initialization", () => {
  it("calls loadSettings and registerGlobalShortcut on mount", async () => {
    const loadSettings = vi.fn().mockResolvedValue(undefined);
    const registerGlobalShortcut = vi.fn().mockResolvedValue(undefined);

    // Mock settings store before importing App
    vi.doMock("../lib/stores/settingsStore", () => ({
      useSettingsStore: () => ({
        loadSettings,
        registerGlobalShortcut,
        globalShortcut: "",
        theme: "light",
      }),
    }));

    // Make withErrorHandling call the passed function so the mount flow runs
    vi.doMock("../lib/utils/errorHandler", () => ({
      withErrorHandling: async (fn: any) => await fn(),
    }));

    const App = (await import("../App")).default;
    render(<App />);

    // wait for the mocked functions to be called by mounted effects
    await waitFor(() => expect(loadSettings).toHaveBeenCalled(), {
      timeout: 3000,
    });
    await waitFor(() => expect(registerGlobalShortcut).toHaveBeenCalled(), {
      timeout: 3000,
    });
  });
});
