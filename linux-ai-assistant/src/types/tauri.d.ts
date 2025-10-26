declare module "@tauri-apps/api/tauri" {
  export function invoke<T = any>(
    cmd: string,
    args?: Record<string, any>
  ): Promise<T>;
}

declare module "@tauri-apps/api" {
  export { invoke } from "@tauri-apps/api/tauri";
}
