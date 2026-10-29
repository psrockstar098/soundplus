/**
 * Capability gating — the chatbox only offers what the picked model can
 * actually do. Unsupported inputs stay disabled in the UI and are
 * REJECTED by the chat endpoint, never silently sent to a provider.
 */

import type { Capabilities, ModelEntry, Settings } from "./settings.ts";
import { DEFAULT_CAPABILITIES } from "./settings.ts";

export type InputKind = "text" | "audio" | "image";

export function modelCapabilities(s: Settings, modelName?: string): Capabilities {
  const name = modelName ?? s.provider.model;
  const entry: ModelEntry | undefined = s.models.find((m) => m.name === name);
  if (!entry) return { ...DEFAULT_CAPABILITIES };
  return { ...DEFAULT_CAPABILITIES, ...entry.capabilities };
}

/** Which chatbox inputs are enabled for the current model. */
export function enabledInputs(s: Settings, modelName?: string): Record<InputKind, boolean> {
  const caps = modelCapabilities(s, modelName);
  return { text: caps.text, audio: caps.audio, image: caps.image };
}

/** Null when the input kind is allowed, otherwise the rejection reason. */
export function gateInput(s: Settings, kind: InputKind, modelName?: string): string | null {
  const enabled = enabledInputs(s, modelName);
  if (enabled[kind]) return null;
  return `input "${kind}" is not supported by the selected model`;
}
