# Move Tauri backend into crate and fix frontend invoke keys

## Summary

This branch moves the Tauri backend Rust modules into `linux-ai-assistant/src-tauri/src` and splits combined files into proper `commands/` and `database/` submodules. It also fixes the frontend Tauri invoke wrapper to use snake_case payload keys matching the Rust command parameters and adds typed invoke generics for safer TypeScript checks.

## Changes

- Moved backend modules from top-level `src/` into `linux-ai-assistant/src-tauri/src/`
  - `commands/` (conversations, messages, settings)
  - `database/` (schema, conversations, messages, settings)
- Updated frontend API wrapper `lib/api/types.ts` to use `system_prompt`, `conversation_id`, `tokens_used` and added `invoke<T>()` generics.
- Committed changes on branch `fix/move-tauri-backend`.

## Why

Tauri expects the Rust source for the app to live in the `src-tauri` crate. The previous placement caused the crate to miss module definitions. The frontend and backend argument naming needed to match exactly for Tauri's invoke argument mapping.

## How to test

1. From a system (non-snap) terminal, run:

```bash
cd linux-ai-assistant
npm ci
npx tsc --noEmit
npm run tauri dev
```

2. The app should start and open the Tauri window. If you see a symbol lookup error referencing `libpthread` or `GLIBC_PRIVATE`, run the dev commands from a non-snap-wrapped terminal (for example a terminal launched from the system menu, not from a snap-packaged VS Code).

## Notes

- I intentionally added typed invoke calls to catch mismatches earlier.
- Consider adding a CI job that runs the frontend `npx tsc --noEmit` and Rust `cargo check` to catch regressions.
Title: Move Tauri backend into crate and fix frontend invoke keys

Summary
-------

This branch moves the Tauri backend Rust modules into `linux-ai-assistant/src-tauri/src` and splits combined files into proper `commands/` and `database/` submodules. It also fixes the frontend Tauri invoke wrapper to use snake_case payload keys matching the Rust command parameters and adds typed invoke generics for safer TypeScript checks.

Changes
-------

- Moved backend modules from top-level `src/` into `linux-ai-assistant/src-tauri/src/`
  - `commands/` (conversations, messages, settings)
  - `database/` (schema, conversations, messages, settings)
- Updated frontend API wrapper `lib/api/types.ts` to use `system_prompt`, `conversation_id`, `tokens_used` and added `invoke<T>()` generics.
- Committed changes on branch `fix/move-tauri-backend`.

Why
---

Tauri expects the Rust source for the app to live in the `src-tauri` crate. The previous placement caused the crate to miss module definitions. The frontend and backend argument naming needed to match exactly for Tauri's invoke argument mapping.

How to test
-----------

1. From a system (non-snap) terminal, run:

```bash
cd linux-ai-assistant
npm ci
npx tsc --noEmit
npm run tauri dev
```

2. The app should start and open the Tauri window. If you see a symbol lookup error referencing `libpthread` or `GLIBC_PRIVATE`, run the dev commands from a non-snap-wrapped terminal (for example a terminal launched from the system menu, not from a snap-packaged VS Code).

Notes
-----

- I intentionally added typed invoke calls to catch mismatches earlier.
- Consider adding a CI job that runs the frontend `npx tsc --noEmit` and Rust `cargo check` to catch regressions.
