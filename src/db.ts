/**
 * SoundPlus memories — Yatta's built-in database.
 *
 * Two memories, both local:
 *   (1) per-project action history — strictly isolated per project_id.
 *       An action recorded under project A is never visible under B.
 *   (2) cross-project producer profile — distilled ONLY from real
 *       recorded actions, never invented. The producer corrects it
 *       with edit/delete; distillation never overwrites a hand-edited
 *       fact, it only adds new ones.
 *
 * Tables are created with plain SQL through Yatta's rawRun (the same
 * helpers proven in the $12 entry) — no guessed schema API.
 */

import { createDatabase } from "yatta.js/db";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { settingsDir } from "./settings.ts";

export type Project = { id: string; name: string; created_at: string };
export type Action = {
  id: number;
  project_id: string;
  kind: string;
  summary: string;
  detail: string;
  created_at: string;
};
export type ProfileFact = {
  id: number;
  fact: string;
  source_action_id: number | null;
  edited: number;
  created_at: string;
};

type Db = ReturnType<typeof createDatabase>;

export function openDb(home?: string): Db {
  const dir = settingsDir(home);
  mkdirSync(dir, { recursive: true });
  const db = createDatabase({ path: join(dir, "soundplus.db") });
  db.rawRun(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL
  )`);
  db.rawRun(`CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL,
    kind TEXT NOT NULL, summary TEXT NOT NULL, detail TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);
  db.rawRun(`CREATE INDEX IF NOT EXISTS idx_actions_project ON actions(project_id)`);
  db.rawRun(`CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT, fact TEXT NOT NULL,
    source_action_id INTEGER, edited INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);
  return db;
}

const now = () => new Date().toISOString();

export function createProject(db: Db, id: string, name: string): Project {
  const p: Project = { id, name, created_at: now() };
  db.rawRun("INSERT INTO projects (id, name, created_at) VALUES (?, ?, ?)", [
    p.id,
    p.name,
    p.created_at,
  ]);
  return p;
}

export function listProjects(db: Db): Project[] {
  return db.rawAll<Project>("SELECT id, name, created_at FROM projects ORDER BY created_at ASC");
}

export function getProject(db: Db, id: string): Project | undefined {
  return db.rawGet<Project>("SELECT id, name, created_at FROM projects WHERE id = ?", [id]);
}

export function recordAction(
  db: Db,
  projectId: string,
  kind: string,
  summary: string,
  detail: unknown,
): Action {
  const row = db.rawGet<{ id: number }>(
    "INSERT INTO actions (project_id, kind, summary, detail, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id",
    [projectId, kind, summary, JSON.stringify(detail ?? null), now()],
  );
  const saved = db.rawGet<Action>("SELECT * FROM actions WHERE id = ?", [row?.id ?? -1]);
  if (!saved) throw new Error("failed to record action");
  return saved;
}

export function listActions(db: Db, projectId: string): Action[] {
  return db.rawAll<Action>(
    "SELECT * FROM actions WHERE project_id = ? ORDER BY id ASC",
    [projectId],
  );
}

export function listProfile(db: Db): ProfileFact[] {
  return db.rawAll<ProfileFact>("SELECT * FROM profile ORDER BY id ASC");
}

export function editProfileFact(db: Db, id: number, fact: string): ProfileFact | undefined {
  db.rawRun("UPDATE profile SET fact = ?, edited = 1 WHERE id = ?", [fact, id]);
  return db.rawGet<ProfileFact>("SELECT * FROM profile WHERE id = ?", [id]);
}

export function deleteProfileFact(db: Db, id: number): boolean {
  const r = db.rawRun("DELETE FROM profile WHERE id = ?", [id]);
  return r.changes === 1;
}

/**
 * Distill profile facts strictly from recorded tool actions.
 * One fact per tool: "Used <tool> N time(s)". A fact is added only
 * when no fact for that tool exists yet — hand-edited facts are
 * never overwritten, and no fact is created without a real action.
 */
export function distillProfile(db: Db): ProfileFact[] {
  const counts = db.rawAll<{ tool: string; n: number; last_id: number }>(
    `SELECT json_extract(detail, '$.tool') AS tool, COUNT(*) AS n,
            MAX(id) AS last_id FROM actions WHERE kind = 'tool'
     GROUP BY tool HAVING tool IS NOT NULL`,
  );
  const existingFacts = listProfile(db).map((f) => f.fact);
  const added: ProfileFact[] = [];
  for (const c of counts) {
    // A fact for this tool already exists (same "Used <tool> ..." prefix).
    if (existingFacts.some((fact) => fact.startsWith(`Used ${c.tool} `))) continue;
    const fact = `Used ${c.tool} ${c.n} time${c.n === 1 ? "" : "s"}`;
    const row = db.rawGet<{ id: number }>(
      "INSERT INTO profile (fact, source_action_id, edited, created_at) VALUES (?, ?, 0, ?) RETURNING id",
      [fact, c.last_id, now()],
    );
    const saved = db.rawGet<ProfileFact>("SELECT * FROM profile WHERE id = ?", [row?.id ?? -1]);
    if (saved) added.push(saved);
  }
  return added;
}
