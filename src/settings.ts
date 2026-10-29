/**
 * SoundPlus settings — owner-only, on disk, key masked on every read.
 *
 * The provider API key lives ONLY in this file (never in code, never in
 * logs, never in any response). Every read path goes through maskKey(),
 * which exposes at most the last 4 characters.
 *
 * Location: $SOUNDPLUS_HOME/settings.json, default ~/.soundplus/.
 * The file is written with 0600 permissions.
 */

import { mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type Capabilities = {
  text: boolean;
  audio: boolean;
  image: boolean;
};

export type ModelEntry = {
  name: string;
  /** Empty = use the provider base URL. */
  baseUrl: string;
  capabilities: Capabilities;
};

export type McpServerEntry = {
  name: string;
  url: string;
  transport: "http";
};

export type Settings = {
  provider: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
  models: ModelEntry[];
  mcpServers: McpServerEntry[];
};

export const DEFAULT_CAPABILITIES: Capabilities = {
  text: true,
  audio: false,
  image: false,
};

export function defaultSettings(): Settings {
  return {
    provider: { baseUrl: "", apiKey: "", model: "" },
    models: [],
    mcpServers: [],
  };
}

/** At most the last 4 chars of a key, ever. Empty key -> "****". */
export function maskKey(key: string): string {
  if (!key) return "****";
  if (key.length <= 4) return "****";
  return `****${key.slice(-4)}`;
}

/** The settings view safe to send to any client: key masked, never raw. */
export function publicSettings(s: Settings): Omit<Settings, "provider"> & {
  provider: Omit<Settings["provider"], "apiKey"> & { apiKey: string };
} {
  return {
    ...s,
    provider: { ...s.provider, apiKey: maskKey(s.provider.apiKey) },
  };
}

export function settingsDir(home?: string): string {
  if (home) return home;
  const env = process.env.SOUNDPLUS_HOME;
  if (env) return env;
  return join(homedir(), ".soundplus");
}

export function settingsPath(home?: string): string {
  return join(settingsDir(home), "settings.json");
}

export function loadSettings(home?: string): Settings {
  const path = settingsPath(home);
  if (!existsSync(path)) return defaultSettings();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<Settings>;
    const base = defaultSettings();
    return {
      provider: { ...base.provider, ...(parsed.provider ?? {}) },
      models: Array.isArray(parsed.models) ? parsed.models : [],
      mcpServers: Array.isArray(parsed.mcpServers) ? parsed.mcpServers : [],
    };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(s: Settings, home?: string): void {
  const dir = settingsDir(home);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "settings.json");
  writeFileSync(path, JSON.stringify(s, null, 2), { mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // Best effort on filesystems that ignore modes.
  }
}
