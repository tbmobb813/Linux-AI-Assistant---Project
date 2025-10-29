import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { useState } from "react";
import { useUiStore } from "../lib/stores/uiStore";
import { useSettingsStore } from "../lib/stores/settingsStore";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { isTauriEnvironment, invokeSafe } from "../lib/utils/tauri";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

interface Props {
  content: string;
}

export default function MarkdownContent({ content }: Props) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          code: CodeBlock,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function CodeBlock({ inline, className, children, ...props }: CodeProps) {
  const addToast = useUiStore((s) => s.addToast);
  const [showActions, setShowActions] = useState(false);

  // Extract language from className (format: language-xxx)
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  // Get the code content as string
  const codeString = String(children).replace(/\n$/, "");

  // Inline code (backticks)
  if (inline) {
    return (
      <code
        className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-sm"
        {...props}
      >
        {children}
      </code>
    );
  }

  // Block code (triple backticks)
  const handleCopy = async () => {
    try {
      if (isTauriEnvironment()) {
        await writeText(codeString);
      } else {
        await navigator.clipboard.writeText(codeString);
      }
      addToast({ message: "Code copied", type: "success", ttl: 1500 });
    } catch (e) {
      console.error("Failed to copy code:", e);
      addToast({ message: "Failed to copy", type: "error", ttl: 2000 });
    }
  };

  const handleSave = async () => {
    const filename = prompt(
      "Enter filename:",
      language ? `code.${language}` : "code.txt",
    );
    if (!filename) return;

    try {
      // Use the browser download API for now; can enhance with Tauri file dialog later
      const blob = new Blob([codeString], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({ message: `Saved as ${filename}`, type: "success", ttl: 2000 });
    } catch (e) {
      console.error("Failed to save code:", e);
      addToast({ message: "Failed to save file", type: "error", ttl: 2000 });
    }
  };

  const handleRun = async () => {
    const confirmRun = window.confirm(
      `Run this ${language || "code"} snippet?\n\nThis will execute:\n${codeString.substring(0, 100)}${codeString.length > 100 ? "..." : ""}\n\nOnly run trusted code!`,
    );
    if (!confirmRun) return;
    // Check settings
    try {
      const allow = useSettingsStore.getState().allowCodeExecution;
      if (!allow) {
        addToast({
          message: "Code execution is disabled in Settings",
          type: "error",
          ttl: 3000,
        });
        return;
      }
    } catch (e) {
      // fail open
    }
    (async () => {
      addToast({ message: "Running snippet...", type: "info", ttl: 1500 });
      try {
        const res = await invokeSafe("run_code", {
          language,
          code: codeString,
          timeout_ms: 15000,
        });
        if (!res) {
          addToast({
            message: "Execution unavailable (not in Tauri)",
            type: "error",
            ttl: 3000,
          });
          return;
        }
        const { stdout, stderr, timed_out } = res as any;
        const { exit_code } = res as any;
        // Show full output in modal
        // Use uiStore directly to set modal
        useUiStore.getState().showRunResult({
          stdout: stdout || "",
          stderr: stderr || "",
          exit_code: exit_code ?? null,
          timed_out: !!timed_out,
        });
      } catch (e) {
        console.error("run snippet failed", e);
        addToast({ message: "Run failed", type: "error", ttl: 3000 });
      }
    })();
  };

  // Determine if code is runnable (common shell/script languages)
  const isRunnable = [
    "bash",
    "sh",
    "zsh",
    "python",
    "node",
    "javascript",
  ].includes(language.toLowerCase());

  return (
    <div
      className="relative group my-2"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Language badge and action buttons */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-800 dark:bg-gray-900 rounded-t text-xs text-gray-400">
        <span>{language || "code"}</span>
        <div
          className={`flex gap-1 transition-opacity ${showActions ? "opacity-100" : "opacity-0"}`}
        >
          <button
            onClick={handleCopy}
            className="px-2 py-1 rounded hover:bg-gray-700 transition-colors"
            title="Copy code"
            aria-label="Copy code"
          >
            📋 Copy
          </button>
          <button
            onClick={handleSave}
            className="px-2 py-1 rounded hover:bg-gray-700 transition-colors"
            title="Save to file"
            aria-label="Save code to file"
          >
            💾 Save
          </button>
          {isRunnable && (
            <button
              onClick={handleRun}
              className="px-2 py-1 rounded hover:bg-gray-700 transition-colors text-yellow-400"
              title="Run code (with confirmation)"
              aria-label="Run code"
            >
              ▶ Run
            </button>
          )}
        </div>
      </div>

      {/* Code content */}
      <pre className="!mt-0 !rounded-t-none overflow-x-auto">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}
