import { invoke } from "@tauri-apps/api/core";
import type { ApiProfile, NewProfile } from "./types";

export async function createProfile(
  profileData: NewProfile,
): Promise<ApiProfile> {
  return invoke<ApiProfile>("create_profile", { profileData });
}

export async function getProfile(id: string): Promise<ApiProfile | null> {
  return invoke<ApiProfile | null>("get_profile", { id });
}

export async function getAllProfiles(): Promise<ApiProfile[]> {
  return invoke<ApiProfile[]>("get_all_profiles");
}

export async function getActiveProfile(): Promise<ApiProfile | null> {
  return invoke<ApiProfile | null>("get_active_profile");
}

export async function setActiveProfile(id: string): Promise<void> {
  return invoke<void>("set_active_profile", { id });
}

export async function updateProfile(
  id: string,
  profileData: NewProfile,
): Promise<ApiProfile> {
  return invoke<ApiProfile>("update_profile", { id, profileData });
}

export async function deleteProfile(id: string): Promise<void> {
  return invoke<void>("delete_profile", { id });
}
