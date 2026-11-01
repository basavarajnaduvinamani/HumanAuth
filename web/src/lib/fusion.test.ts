import { describe, it, expect } from "vitest";
import { fuse } from "./fusion";
import { CheckResult, Modality, result } from "./types";
const ok = (n: Modality, s: number) => result(n, s, s >= 0.5, `${n} ${s}`);
describe("gateway/tests/test_fusion.py case parity", () => {
  it("all_pass_approves", () => {
    const r = fuse([ok("face", 0.9), ok("document", 0.8), ok("voice", 0.95)]);
    expect(r.decision).toBe("approve");
    expect(r.liveness_veto).toBe(false);
    expect(r.fused_score).toBeCloseTo((0.9 + 0.8 + 0.95) / 3, 4);
  });
  it("liveness_veto_overrides_high_scores", () => {
    const r = fuse([ok("face", 0.2), ok("document", 1), ok("voice", 1)]);
    expect(r.decision).toBe("reject");
    expect(r.liveness_veto).toBe(true);
    expect(r.reasons[0]).toMatch(/^Liveness veto/);
  });
  it("veto_even_when_mean_is_above_threshold", () => {
    const r = fuse([ok("face", 0.49), ok("document", 1), ok("voice", 1)]);
    expect(r.fused_score!).toBeGreaterThan(0.66);
    expect(r.decision).toBe("reject");
  });
  it("document_failure_rejects", () => {
    const r = fuse([ok("face", 0.9), ok("document", 0.1), ok("voice", 0.9)]);
    expect(r.decision).toBe("reject");
    expect(r.liveness_veto).toBe(false);
    expect(r.reasons.some((x) => x.includes("Document check failed"))).toBe(
      true,
    );
  });
  it("unavailable_module_goes_to_review_not_approve", () => {
    const unavailable: CheckResult = {
      name: "document",
      status: "unavailable",
      score: null,
      passed: null,
      threshold: 0.5,
      detail: "weights missing",
    };
    const r = fuse([ok("face", 0.9), unavailable, ok("voice", 0.9)]);
    expect(r.decision).toBe("review");
    expect(r.reasons.join()).toContain("weights missing");
  });
  it("missing_liveness_never_approves", () => {
    const r = fuse([ok("document", 1), ok("voice", 1)]);
    expect(r.decision).toBe("review");
    expect(r.liveness_veto).toBe(false);
  });
  it("low_mean_rejects_even_if_each_passes", () => {
    const r = fuse([ok("face", 0.55), ok("document", 0.55), ok("voice", 0.55)]);
    expect(r.decision).toBe("reject");
    expect(r.reasons.join()).toContain("below");
  });
  it("weights_are_applied", () =>
    expect(
      fuse([ok("face", 1), ok("document", 0.6), ok("voice", 0.6)], {
        face: 2,
        document: 1,
        voice: 1,
      }).fused_score,
    ).toBe(0.8));
  it("failure_takes_priority_over_missing", () =>
    expect(fuse([ok("face", 0.9), ok("document", 0.1)]).decision).toBe(
      "reject",
    ));
});
