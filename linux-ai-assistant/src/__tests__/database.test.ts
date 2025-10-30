import { describe, test, expect, vi, beforeEach } from "vitest";
import { database } from "../lib/api/database";
import { setMockInvoke } from "../lib/tauri-shim";

describe("database settings JSON roundtrip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("setJSON and getJSON roundtrip preserves object structure", async () => {
    const testData = {
      apiKey: "sk-test123",
      endpoint: "https://api.example.com",
      timeout: 30000,
      enabled: true,
    };

    // Mock the underlying invoke to return the JSON string we "set"
    let stored: string | null = null;
    setMockInvoke(async (cmd: string, args?: any) => {
      if (cmd === "set_setting") {
        stored = args.value;
        return null as any;
      }
      if (cmd === "get_setting") {
        return stored as any;
      }
      return null as any;
    });

    // Set the JSON
    await database.settings.setJSON("testKey", testData);

    // Get it back
    const retrieved =
      await database.settings.getJSON<typeof testData>("testKey");

    expect(retrieved).toEqual(testData);
    expect(retrieved?.apiKey).toBe("sk-test123");
    expect(retrieved?.timeout).toBe(30000);
    expect(retrieved?.enabled).toBe(true);
  });

  test("getJSON returns null for non-existent key", async () => {
    setMockInvoke(async () => null as any);

    const result = await database.settings.getJSON("nonExistentKey");
    expect(result).toBeNull();
  });
});
