Provider abstraction & CI notes

Provider abstraction

- Files:
  - `linux-ai-assistant/src/lib/providers/provider.ts` - Provider interface and factory (`getProvider`).
  - `linux-ai-assistant/src/lib/providers/mockProvider.ts` - Local mock provider used in development and tests.

How it works

- The `Provider` interface exposes `generateResponse(conversationId, messages)` returning a string with the assistant response.
- The chat store (`chatStore.ts`) uses `getProvider()` to obtain the provider instance and calls it to generate assistant replies, which are then persisted via the DB commands.

Swap in a real provider

- Implement a new provider module that implements the `Provider` interface (e.g., `openaiProvider.ts`) and update the factory in `provider.ts` to return it based on env (VITE\_ variables) or runtime configuration.
- For Tauri/native usage, consider exposing provider configuration via the backend and reading secrets from secure storage or environment variables; do not commit API keys into source.

CI and packaging

- Workflows added:
  - `.github/workflows/ci.yml` — consolidated CI that runs frontend TypeScript check, Vitest, starts a preview and runs `dev/smoke.sh`, then runs `cargo test`. Also includes a manual `package-linux` job to attempt a Tauri build.
  - `.github/workflows/ci-lite.yml` — a lightweight parallel workflow (kept for convenience).

Packaging notes

- Building a Tauri Linux bundle on a GitHub runner often requires additional host packages (GTK, libwebkit2gtk, AppImage tools, etc.). If the `pnpm exec tauri build` step fails, install the required apt packages or use a self-hosted runner pre-configured with GUI build deps.
- Locally, follow `SETUP_GUIDE.md` and ensure you have the native dependencies installed before running `pnpm exec tauri build`.

If you'd like, I can:

- Add an `openaiProvider` adapter that reads the API key from a GitHub secret and only enables in non-dev mode.
- Harden the packaging job to install required apt packages on the runner and upload produced artifacts (AppImage/DEB) as workflow artifacts.
