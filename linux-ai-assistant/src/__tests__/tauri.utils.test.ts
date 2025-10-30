import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => vi.resetModules());

describe("tauri utils invokeSafe and isTauriEnvironment", () => {
  it("invokeSafe returns null when not in Tauri", async () => {
    const { invokeSafe } = await import("../lib/utils/tauri");
    // ensure no __TAURI__ flag
    // @ts-ignore
    if (typeof window !== "undefined") delete (window as any).__TAURI__;

    const res = await invokeSafe("cmd");
    expect(res).toBeNull();
  });

  it("invokeSafe calls tauri invoke when in Tauri", async () => {
    // set __TAURI__ flag
    // @ts-ignore
    (global as any).window = (global as any).window || {};
    // @ts-ignore
    (window as any).__TAURI__ = {};

    // mock dynamic import of @tauri-apps/api/core
    vi.doMock("@tauri-apps/api/core", () => ({
      invoke: async (cmd: string) => `ok:${cmd}`,
    }));

    const { invokeSafe } = await import("../lib/utils/tauri");
    const res = await invokeSafe("mycmd", { a: 1 });
    expect(res).toBe("ok:mycmd");
  });
});
