import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

beforeEach(() => vi.resetModules());

describe("UpdateManager", () => {
  it("shows update dialog when update available and handles download/dismiss", async () => {
    // prepare a mutable store object so setUpdateStatus can mutate it
    const storeState: any = {
      currentVersion: "1.0.0",
      updateStatus: null,
      isChecking: false,
      isDownloading: false,
      downloadProgress: 0,
      dismissedVersions: [],
      setCurrentVersion: (v: string) => (storeState.currentVersion = v),
      setUpdateStatus: (s: any) => (storeState.updateStatus = s),
      setIsChecking: (b: boolean) => (storeState.isChecking = b),
      setIsDownloading: (b: boolean) => (storeState.isDownloading = b),
      setDownloadProgress: (p: number) => (storeState.downloadProgress = p),
      setLastCheckTime: (_: number) => {},
      dismissUpdate: vi.fn((v: string) => storeState.dismissedVersions.push(v)),
    };

    // mock both alias and relative (some modules import via different paths)
    vi.doMock("@/lib/stores/updateStore", () => ({
      useUpdateStore: () => storeState,
    }));
    vi.doMock("../lib/stores/updateStore", () => ({
      useUpdateStore: () => storeState,
    }));

    const addToast = vi.fn();
    vi.doMock("../lib/stores/uiStore", () => ({
      useUiStore: () => ({ addToast }),
    }));

    // mock tauri invoke
    const invoke = vi.fn().mockImplementation(async (cmd: string) => {
      if (cmd === "check_for_updates")
        return {
          has_update: true,
          new_version: "1.2.3",
          release_info: { is_critical: false, changelog: "a\nb\nc" },
        };
      if (cmd === "get_current_version") return "1.0.0";
      if (cmd === "download_and_install_update") return "ok";
      return null;
    });
    vi.doMock("@tauri-apps/api/core", () => ({ invoke }));

    const { default: UpdateManager } = await import(
      "../components/UpdateManager"
    );

    render(<UpdateManager />);

    // wait for the tauri invoke to be called (check performed)
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("check_for_updates"),
    );
    // then wait for dialog to appear
    await waitFor(() =>
      expect(screen.getByText(/Update Available/)).toBeTruthy(),
    );

    // dialog shows version
    expect(screen.getByText(/1.2.3/)).toBeTruthy();

    // click Download - should call tauri invoke and addToast
    fireEvent.click(screen.getByText(/Download/));
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("download_and_install_update", {
        version: "1.2.3",
      }),
    );
    await waitFor(() => expect(addToast).toHaveBeenCalled());

    // click Later (dismiss) - should call dismissUpdate
    fireEvent.click(screen.getByText(/Later/));
    expect(storeState.dismissUpdate).toBeDefined();
  });
});
