import { vi } from "vitest";
import { act } from "react";
import { useSettingsStore } from "../lib/stores/settingsStore";
import * as globalShortcut from "@tauri-apps/plugin-global-shortcut";
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

  test("registerGlobalShortcut registers and triggers window toggle", async () => {
    const toggleSpy = vi
      .spyOn(database.window, "toggle")
      .mockResolvedValue(undefined);

    // Override the mocked register to immediately invoke the callback once
    const registerMock = vi.spyOn(globalShortcut, "register");
    (registerMock as unknown as import("vitest").Mock).mockImplementation(
      async (...args: any[]) => {
        const cb = args[1];
        if (typeof cb === "function") {
          await cb();
        }
      },
    );

    await act(async () => {
      await useSettingsStore.getState().registerGlobalShortcut();
    });

    expect(registerMock).toHaveBeenCalledWith(
      "CommandOrControl+Space",
      expect.any(Function),
    );
    expect(toggleSpy).toHaveBeenCalled();
  });

  test("setGlobalShortcut persists and re-registers", async () => {
    const setSpy = vi
      .spyOn(database.settings, "set")
      .mockResolvedValue(undefined);

    const registerMock = vi.spyOn(globalShortcut, "register");
    (registerMock as unknown as import("vitest").Mock).mockResolvedValue(
      undefined as any,
    );

    await act(async () => {
      await useSettingsStore.getState().setGlobalShortcut("Ctrl+Shift+K");
    });

    expect(setSpy).toHaveBeenCalledWith("globalShortcut", "Ctrl+Shift+K");
    expect(registerMock).toHaveBeenCalledWith(
      "Ctrl+Shift+K",
      expect.any(Function),
    );
  });
});
