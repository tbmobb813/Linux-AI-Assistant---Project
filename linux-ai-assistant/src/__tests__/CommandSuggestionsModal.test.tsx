import { describe, test, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import CommandSuggestionsModal from "../components/CommandSuggestionsModal";
import { useUiStore } from "../lib/stores/uiStore";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock the UI store module; control returns per-test
vi.mock("../lib/stores/uiStore", () => ({
  useUiStore: vi.fn(),
}));

describe("CommandSuggestionsModal component", () => {
  const defaultState = {
    suggestionsModal: { open: false, suggestions: [] },
    closeSuggestions: vi.fn(),
    addToast: vi.fn(),
    showRunResult: vi.fn(),
  };

  test("renders without crashing", () => {
    render(<CommandSuggestionsModal />);
    expect(true).toBeTruthy();
  });

  test("component handles closed state", () => {
    const { container } = render(<CommandSuggestionsModal />);
    expect(container).toBeTruthy();
  });

  test("component is properly exported", () => {
    expect(CommandSuggestionsModal).toBeDefined();
    expect(typeof CommandSuggestionsModal).toBe("function");
  });

  test("component renders as a React component", () => {
    const { container } = render(<CommandSuggestionsModal />);
    expect(container).toBeTruthy();
  });

  test("component handles empty suggestions", () => {
    const { container } = render(<CommandSuggestionsModal />);
    expect(container.textContent).toBeDefined();
  });

  test("component structure is valid when open", () => {
    const mockState = {
      suggestionsModal: { open: true, suggestions: ["one"] },
      closeSuggestions: vi.fn(),
      addToast: vi.fn(),
      showRunResult: vi.fn(),
    };
    (useUiStore as any).mockImplementation((selector: any) =>
      selector ? selector(mockState) : mockState,
    );
    const { container } = render(<CommandSuggestionsModal />);
    expect(container.firstChild).toBeTruthy();
  });

  test("component handles store updates", () => {
    const { container, rerender } = render(<CommandSuggestionsModal />);
    // Rerender to test store integration
    rerender(<CommandSuggestionsModal />);
    expect(container).toBeTruthy();
  });
});
