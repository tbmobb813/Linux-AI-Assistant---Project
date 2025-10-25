# Changelog

All notable changes to this repository are documented in this file.

## 2025-10-25 — Rebase & Lockfile consolidation

- Rebased branch `fix/tauri-shim-typechecks` onto `fix/move-tauri-backend` and resolved merge conflicts across multiple files (package manifests, docs, frontend/backend type payloads).
- Regenerated `pnpm-lock.yaml` and removed legacy `package-lock.json` artifacts to standardize on pnpm workspace lockfile strategy.
- Removed an invalid devDependency: `@types/testing-library__react@^14.0.0` (no published version) to allow dependency resolution.
- Verified local quality gates: TypeScript checks, Vite build, Vitest unit tests, and Rust `cargo check` — all passed locally.

Notes:
- If you are a contributor, please re-run `pnpm install` at the repo root and re-run your local checks.
