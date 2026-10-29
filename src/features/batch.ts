/**
 * F29 — Batch Mixing and Mastering (standalone port).
 *
 * Process many projects, stems, or versions with a reusable
 * workflow and delivery requirements. The default workflow is
 * F6 export verification; callers may inject their own. One
 * item's failure never stops the batch — it is recorded per item.
 */

import { verifyExport, type ExportSettings, type ExportReport } from "./mastering.ts";

export type BatchItem = {
  name: string;
  samples: ArrayLike<number>;
  settings: ExportSettings;
};

export type BatchResult = {
  name: string;
  passed: boolean;
  report?: ExportReport;
  error?: string;
};

export function runBatch(
  items: BatchItem[],
  workflow: (samples: ArrayLike<number>, settings: ExportSettings) => ExportReport = verifyExport,
): BatchResult[] {
  const out: BatchResult[] = [];
  for (const item of items) {
    try {
      const report = workflow(item.samples, item.settings);
      out.push({ name: item.name, passed: report.passes, report });
    } catch (e) {
      out.push({
        name: item.name,
        passed: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return out;
}
