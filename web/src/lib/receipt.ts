import { CheckResult, ModelEntry } from "./types";
import { fuse } from "./fusion";
export function receipt(results: CheckResult[], models: ModelEntry[]) {
  return {
    schema_version: 1,
    created_at: new Date().toISOString(),
    ...fuse(results),
    checks: results.map((r) => ({
      name: r.name,
      status: r.status,
      score: r.score,
      passed: r.passed,
      threshold: r.threshold,
      detail: r.detail,
      latency_ms: r.latency_ms ?? null,
      mode: r.mode ?? "live",
      backend: r.backend ?? "unknown",
    })),
    models: models.map((m) => ({
      file: m.file,
      sha256: m.sha256,
      precision: m.precision,
    })),
    notice:
      "Research decision receipt, not a proof of identity. Contains no images or audio.",
  };
}
