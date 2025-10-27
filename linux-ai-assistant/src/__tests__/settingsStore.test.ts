import { vi } from "vitest";
import { act } from "react";
import { useSettingsStore } from "../lib/stores/settingsStore";
import * as tauriUtils from "../lib/utils/tauri";
import { database } from "../lib/api/database";

describe("settingsStore global shortcut", () => {
  beforeEach(() => {
    // Reset store state to defaults
    act(() => {
      useSettingsStore.setState({
        globalShortcut: "CommandOrControl+Space",
      } as any);
    });
    vi.restoreAllMocks();
  });

  test("registerGlobalShortcut calls safe wrapper and triggers window toggle", async () => {
    const toggleSpy = vi
      .spyOn(database.window, "toggle")
      .mockResolvedValue(undefined);

    // Spy on the safe wrapper and mock it to invoke the callback
    const registerSafeSpy = vi.spyOn(tauriUtils, "registerGlobalShortcutSafe");
    (registerSafeSpy as unknown as import("vitest").Mock).mockImplementation(
      async (_shortcut: string, cb: () => void) => {
        // Simulate successful registration and immediate callback invocation
        await cb();
        return true;
      },
    );

    await act(async () => {
      await useSettingsStore.getState().registerGlobalShortcut();
    });

    expect(registerSafeSpy).toHaveBeenCalledWith(
      "CommandOrControl+Space",
      expect.any(Function),
    );
    expect(toggleSpy).toHaveBeenCalled();
  });

  test("setGlobalShortcut persists and re-registers via safe wrapper", async () => {
    const setSpy = vi
      .spyOn(database.settings, "set")
      .mockResolvedValue(undefined);

    const registerSafeSpy = vi
      .spyOn(tauriUtils, "registerGlobalShortcutSafe")
      .mockResolvedValue(true);

    await act(async () => {
      await useSettingsStore.getState().setGlobalShortcut("Ctrl+Shift+K");
    });

    expect(setSpy).toHaveBeenCalledWith("globalShortcut", "Ctrl+Shift+K");
    expect(registerSafeSpy).toHaveBeenCalledWith(
      "Ctrl+Shift+K",
      expect.any(Function),
    );
  });
});
