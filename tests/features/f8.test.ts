/**
 * Tests: F8 transactional undo and mix versions.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createVersion,
  listVersions,
  recordModification,
  rollbackToVersion,
  modificationHistory,
} from "../../src/features/versions.ts";
import { openDb, createProject } from "../../src/db.ts";

describe("F8 undo and versions", () => {
  test("versions snapshot, rollback restores and records", () => {
    const db = openDb(mkdtempSync(join(tmpdir(), "soundplus-v-")));
    const p = createProject(db, "proj-a", "Song A");
    const v1 = createVersion(db, p.id, "rough", { volume: 0.5 });
    createVersion(db, p.id, "polished", { volume: 0.8 });
    expect(listVersions(db, p.id).map((v) => v.label)).toEqual(["rough", "polished"]);
    recordModification(db, p.id, "eq", { volume: 0.5 }, { volume: 0.8 });
    const back = rollbackToVersion(db, p.id, v1.id);
    expect(back?.restoredState).toEqual({ volume: 0.5 });
    expect(modificationHistory(db, p.id).map((a) => a.kind)).toEqual([
      "modification",
      "rollback",
    ]);
    expect(rollbackToVersion(db, p.id, 9999)).toBeNull();
  });
});
