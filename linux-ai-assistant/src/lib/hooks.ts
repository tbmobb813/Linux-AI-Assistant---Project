import { useEffect, useState } from "react";

interface UseKeyboardShortcutsProps {
  onCommandPalette?: () => void;
  onNewConversation?: () => void;
  onSettings?: () => void;
}

export const useKeyboardShortcuts = ({
  onCommandPalette,
  onNewConversation,
  onSettings,
}: UseKeyboardShortcutsProps = {}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette - Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onCommandPalette?.();
        return;
      }

      // New Conversation - Ctrl+N or Cmd+N
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        onNewConversation?.();
        return;
      }

      // Settings - Ctrl+, or Cmd+,
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        onSettings?.();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCommandPalette, onNewConversation, onSettings]);
};

// Hook for managing command palette state
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  // Listen for custom events
  useEffect(() => {
    const handleOpenCommandPalette = () => open();

    document.addEventListener("open-command-palette", handleOpenCommandPalette);
    return () =>
      document.removeEventListener(
        "open-command-palette",
        handleOpenCommandPalette,
      );
  }, []);

  return { isOpen, open, close, toggle };
};

// Hook for smooth animations and transitions
export const useAnimations = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to trigger entrance animations
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return { isVisible };
};

// Hook for managing loading states with micro-interactions
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [progress, setProgress] = useState(0);

  const startLoading = () => {
    setIsLoading(true);
    setProgress(0);
  };

  const updateProgress = (value: number) => {
    setProgress(Math.max(0, Math.min(100, value)));
  };

  const finishLoading = () => {
    setProgress(100);
    setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, 300);
  };

  return {
    isLoading,
    progress,
    startLoading,
    updateProgress,
    finishLoading,
  };
};

export default {
  useKeyboardShortcuts,
  useCommandPalette,
  useAnimations,
  useLoadingState,
};
