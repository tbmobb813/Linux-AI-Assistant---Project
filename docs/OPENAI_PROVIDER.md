# OpenAI provider (Tauri backend)

Overview

- This project includes a Tauri command `provider_openai_generate` which the frontend may call to generate assistant responses using OpenAI.

Configuration

- Set the environment variable `OPENAI_API_KEY` in the environment where the Tauri backend runs. Do NOT commit this value to source control.

Local development

- The frontend will use the local mock provider by default (DEV). To enable the backend provider locally while developing the Tauri app, set the environment variable before launching the app:

```bash
export OPENAI_API_KEY="sk_..."
export VITE_OPENAI_ENABLED=true
# Then run the Tauri dev script (example):
bash dev/tauri-dev.sh
```

CI

- If you want CI to exercise the real provider (not recommended for cost reasons), add a secret `OPENAI_API_KEY` in GitHub and set `VITE_OPENAI_ENABLED=true` in the workflow env for the job. Prefer using the mock provider for tests.

Security note

- Avoid exposing API keys to the renderer. This implementation keeps the key on the backend (Tauri) and the frontend invokes the backend command which performs the network call.
