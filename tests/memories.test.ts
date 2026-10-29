/**
 * Tests: per-project history isolation, profile distillation from real
 * actions only, producer correction (edit/delete). No real DAWs.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  openDb,
  createProject,
  listProjects,
  recordAction,
  listActions,
  listProfile,
  editProfileFact,
  deleteProfileFact,
  distillProfile,
} from "../src/db.ts";

function freshDb() {
  return openDb(mkdtempSync(join(tmpdir(), "soundplus-db-")));
}

describe("per-project history", () => {
  test("actions are strictly isolated per project", () => {
    const db = freshDb();
    const a = createProject(db, "proj-a", "Song A");
    const b = createProject(db, "proj-b", "Song B");
    recordAction(db, a.id, "chat", "mix the drums", { role: "user" });
    recordAction(db, b.id, "chat", "master this", { role: "user" });
    const aActions = listActions(db, a.id);
    expect(aActions.length).toBe(1);
    expect(aActions[0].summary).toBe("mix the drums");
    expect(listProjects(db).map((p) => p.name)).toEqual(["Song A", "Song B"]);
  });
});

describe("producer profile", () => {
  test("distillation uses only real tool actions, nothing invented", () => {
    const db = freshDb();
    const p = createProject(db, "proj-a", "Song A");
    expect(distillProfile(db)).toEqual([]);
    recordAction(db, p.id, "chat", "hello", { role: "user" });
    expect(distillProfile(db)).toEqual([]);
    recordAction(db, p.id, "tool", "set volume", { tool: "flstudio.set_volume" });
    recordAction(db, p.id, "tool", "set volume again", { tool: "flstudio.set_volume" });
    const added = distillProfile(db);
    expect(added.length).toBe(1);
    expect(added[0].fact).toBe("Used flstudio.set_volume 2 times");
    // Second run adds nothing new for the same tool.
    expect(distillProfile(db)).toEqual([]);
    expect(listProfile(db).length).toBe(1);
  });

  test("producer can edit and delete facts", () => {
    const db = freshDb();
    const p = createProject(db, "proj-a", "Song A");
    recordAction(db, p.id, "tool", "x", { tool: "cubase.get_project" });
    const [fact] = distillProfile(db);
    const edited = editProfileFact(db, fact.id, "Prefers Cubase projects");
    expect(edited?.fact).toBe("Prefers Cubase projects");
    expect(edited?.edited).toBe(1);
    expect(deleteProfileFact(db, fact.id)).toBe(true);
    expect(listProfile(db)).toEqual([]);
  });
});
