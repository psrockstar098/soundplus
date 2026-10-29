/**
 * F8 — Transactional Undo and Mix Versions (standalone port).
 *
 * Extends the per-project action history (Phase 2): every AI
 * modification is recorded with before/after states, named mix
 * versions snapshot full states for comparison, and rollback
 * restores a version's state and records the rollback as an action.
 *
 * Honest boundary: in this engine, rollback restores the RECORDED
 * state object and logs the rollback. Applying that state to a live
 * DAW happens through the bridge's tools in Phase 4 — the engine
 * never claims the DAW already moved.
 */

import { openDb, recordAction, listActions } from "../db.ts";

export type MixVersion = {
  id: number;
  project_id: string;
  label: string;
  state: string;
  created_at: string;
};

type Db = ReturnType<typeof openDb>;

export function ensureVersionTables(db: Db): void {
  db.rawRun(`CREATE TABLE IF NOT EXISTS mix_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL,
    label TEXT NOT NULL, state TEXT NOT NULL, created_at TEXT NOT NULL
  )`);
  db.rawRun(`CREATE INDEX IF NOT EXISTS idx_versions_project ON mix_versions(project_id)`);
}

export function createVersion(db: Db, projectId: string, label: string, state: unknown): MixVersion {
  ensureVersionTables(db);
  const now = new Date().toISOString();
  const row = db.rawGet<{ id: number }>(
    "INSERT INTO mix_versions (project_id, label, state, created_at) VALUES (?, ?, ?, ?) RETURNING id",
    [projectId, label, JSON.stringify(state ?? null), now],
  );
  const saved = db.rawGet<MixVersion>("SELECT * FROM mix_versions WHERE id = ?", [row?.id ?? -1]);
  if (!saved) throw new Error("failed to create version");
  return saved;
}

export function listVersions(db: Db, projectId: string): MixVersion[] {
  ensureVersionTables(db);
  return db.rawAll<MixVersion>(
    "SELECT * FROM mix_versions WHERE project_id = ? ORDER BY id ASC",
    [projectId],
  );
}

export function recordModification(
  db: Db,
  projectId: string,
  tool: string,
  before: unknown,
  after: unknown,
): void {
  recordAction(db, projectId, "modification", `${tool} changed the mix`, { tool, before, after });
}

/** Restore a version's recorded state; returns it for the bridge to apply. */
export function rollbackToVersion(
  db: Db,
  projectId: string,
  versionId: number,
): { restoredState: unknown; version: MixVersion } | null {
  ensureVersionTables(db);
  const version = db.rawGet<MixVersion>(
    "SELECT * FROM mix_versions WHERE id = ? AND project_id = ?",
    [versionId, projectId],
  );
  if (!version) return null;
  const restoredState = JSON.parse(version.state) as unknown;
  recordAction(db, projectId, "rollback", `rolled back to version "${version.label}"`, {
    versionId: version.id,
    label: version.label,
  });
  return { restoredState, version };
}

export function modificationHistory(db: Db, projectId: string) {
  return listActions(db, projectId).filter(
    (a) => a.kind === "modification" || a.kind === "rollback",
  );
}
