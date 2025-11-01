import { useState, useEffect } from "react";
import { useUiStore } from "../lib/stores/uiStore";
import { withErrorHandling } from "../lib/utils/errorHandler";
import { User, Plus, Check, Edit2, Trash2, Settings } from "lucide-react";
import {
  getAllProfiles,
  getActiveProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  setActiveProfile,
} from "../lib/api/profiles";
import type { ApiProfile, NewProfile } from "../lib/api/types";

interface ProfileSettingsProps {
  onClose: () => void;
}

export default function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const addToast = useUiStore((s) => s.addToast);
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<ApiProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewProfile>({
    name: "",
    description: "",
    default_model: "gpt-4o-mini",
    default_provider: "openai",
    system_prompt: "",
  });

  const loadProfiles = async () => {
    const result = await withErrorHandling(
      async () => {
        const [profilesData, activeData] = await Promise.all([
          getAllProfiles(),
          getActiveProfile(),
        ]);
        setProfiles(profilesData);
        setActiveProfileState(activeData);
      },
      "ProfileSettings.loadProfiles",
      "Failed to load profiles",
    );

    if (result === null) {
      addToast({
        message: "Failed to load profiles",
        type: "error",
        ttl: 3000,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleCreateProfile = async () => {
    if (!formData.name.trim()) {
      addToast({
        message: "Profile name is required",
        type: "error",
        ttl: 3000,
      });
      return;
    }

    setCreating(true);
    const result = await withErrorHandling(
      async () => {
        await createProfile(formData);
        await loadProfiles();
        setFormData({
          name: "",
          description: "",
          default_model: "gpt-4o-mini",
          default_provider: "openai",
          system_prompt: "",
        });
        addToast({
          message: "Profile created successfully",
          type: "success",
          ttl: 3000,
        });
      },
      "ProfileSettings.handleCreateProfile",
      "Failed to create profile",
    );

    if (result === null) {
      addToast({
        message: "Failed to create profile",
        type: "error",
        ttl: 3000,
      });
    }
    setCreating(false);
  };

  const handleUpdateProfile = async (id: string) => {
    if (!formData.name.trim()) {
      addToast({
        message: "Profile name is required",
        type: "error",
        ttl: 3000,
      });
      return;
    }

    const result = await withErrorHandling(
      async () => {
        await updateProfile(id, formData);
        await loadProfiles();
        setEditing(null);
        setFormData({
          name: "",
          description: "",
          default_model: "gpt-4o-mini",
          default_provider: "openai",
          system_prompt: "",
        });
        addToast({
          message: "Profile updated successfully",
          type: "success",
          ttl: 3000,
        });
      },
      "ProfileSettings.handleUpdateProfile",
      "Failed to update profile",
    );

    if (result === null) {
      addToast({
        message: "Failed to update profile",
        type: "error",
        ttl: 3000,
      });
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (profiles.length <= 1) {
      addToast({
        message: "Cannot delete the last profile",
        type: "error",
        ttl: 3000,
      });
      return;
    }

    const result = await withErrorHandling(
      async () => {
        await deleteProfile(id);
        await loadProfiles();
        addToast({
          message: "Profile deleted successfully",
          type: "success",
          ttl: 3000,
        });
      },
      "ProfileSettings.handleDeleteProfile",
      "Failed to delete profile",
    );

    if (result === null) {
      addToast({
        message: "Failed to delete profile",
        type: "error",
        ttl: 3000,
      });
    }
  };

  const handleSetActiveProfile = async (id: string) => {
    const result = await withErrorHandling(
      async () => {
        await setActiveProfile(id);
        await loadProfiles();
        addToast({
          message: "Active profile changed",
          type: "success",
          ttl: 2000,
        });
      },
      "ProfileSettings.handleSetActiveProfile",
      "Failed to change active profile",
    );

    if (result === null) {
      addToast({
        message: "Failed to change active profile",
        type: "error",
        ttl: 3000,
      });
    }
  };

  const startEditing = (profile: ApiProfile) => {
    setEditing(profile.id);
    setFormData({
      name: profile.name,
      description: profile.description || "",
      default_model: profile.default_model,
      default_provider: profile.default_provider,
      system_prompt: profile.system_prompt || "",
    });
  };

  const cancelEditing = () => {
    setEditing(null);
    setFormData({
      name: "",
      description: "",
      default_model: "gpt-4o-mini",
      default_provider: "openai",
      system_prompt: "",
    });
  };

  if (loading) {
    return (
      <div className="w-96 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">
            Loading profiles...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[480px] max-h-[600px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Profile Settings
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Active Profile Display */}
      {activeProfile && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Active Profile
            </span>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <div className="font-medium">{activeProfile.name}</div>
            {activeProfile.description && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {activeProfile.description}
              </div>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {activeProfile.default_provider} • {activeProfile.default_model}
            </div>
          </div>
        </div>
      )}

      {/* Create New Profile Form */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Create New Profile
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <input
              type="text"
              placeholder="Profile name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={formData.default_provider}
              onChange={(e) =>
                setFormData({ ...formData, default_provider: e.target.value })
              }
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
              <option value="ollama">Ollama</option>
            </select>

            <input
              type="text"
              placeholder="Model (e.g., gpt-4o-mini)"
              value={formData.default_model}
              onChange={(e) =>
                setFormData({ ...formData, default_model: e.target.value })
              }
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <textarea
              placeholder="System prompt (optional)"
              value={formData.system_prompt}
              onChange={(e) =>
                setFormData({ ...formData, system_prompt: e.target.value })
              }
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <button
            onClick={handleCreateProfile}
            disabled={creating || !formData.name.trim()}
            className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-md"
          >
            {creating ? "Creating..." : "Create Profile"}
          </button>
        </div>
      </div>

      {/* Profiles List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          All Profiles
        </h3>
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`p-3 border rounded-lg ${
              profile.is_active
                ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            }`}
          >
            {editing === profile.id ? (
              // Edit Form
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <div className="flex gap-2">
                  <select
                    value={formData.default_provider}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        default_provider: e.target.value,
                      })
                    }
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Gemini</option>
                    <option value="ollama">Ollama</option>
                  </select>
                  <input
                    type="text"
                    value={formData.default_model}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        default_model: e.target.value,
                      })
                    }
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <textarea
                  placeholder="System prompt"
                  value={formData.system_prompt}
                  onChange={(e) =>
                    setFormData({ ...formData, system_prompt: e.target.value })
                  }
                  rows={2}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateProfile(profile.id)}
                    className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Display Mode
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {profile.name}
                      </span>
                      {profile.is_active && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    {profile.description && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {profile.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {profile.default_provider} • {profile.default_model}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!profile.is_active && (
                      <button
                        onClick={() => handleSetActiveProfile(profile.id)}
                        className="p-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded"
                        title="Set as active"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => startEditing(profile)}
                      className="p-1 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                      title="Edit profile"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {profiles.length > 1 && (
                      <button
                        onClick={() => handleDeleteProfile(profile.id)}
                        className="p-1 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                        title="Delete profile"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md"
        >
          Close
        </button>
      </div>
    </div>
  );
}
