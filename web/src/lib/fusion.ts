import { CheckResult, Modality, thresholds } from "./types";
const order: Modality[] = ["face", "document", "voice"];
const names = { face: "Liveness", document: "Document", voice: "Voice" };
export function fuse(
  results: CheckResult[],
  weights: Partial<Record<Modality, number>> = {},
  threshold = thresholds.fusion,
) {
  const byName = new Map(results.map((r) => [r.name, r]));
  const face = byName.get("face");
  const veto = Boolean(face && face.status === "ok" && !face.passed);
  const reasons: string[] = [];
  if (veto) reasons.push(`Liveness veto: ${face!.detail}`);
  const failed = order.flatMap((n) => {
    const r = byName.get(n);
    return n !== "face" && r?.status === "ok" && !r.passed ? [r] : [];
  });
  for (const r of failed)
    reasons.push(`${names[r.name]} check failed: ${r.detail}`);
  const missing = order.filter(
    (n) => !byName.has(n) || byName.get(n)!.status !== "ok",
  );
  for (const n of missing) {
    const r = byName.get(n);
    reasons.push(
      `${names[n]} check did not run: ${!r || r.status === "not_provided" ? "not provided" : r.detail || r.status}`,
    );
  }
  const scored = order.flatMap((n) => {
    const r = byName.get(n);
    return r?.status === "ok" ? [r] : [];
  });
  const total = scored.reduce((s, r) => s + (weights[r.name] ?? 1), 0);
  const mean = total
    ? scored.reduce((s, r) => s + (weights[r.name] ?? 1) * r.score!, 0) / total
    : null;
  let decision: "reject" | "review" | "approve";
  if (veto || failed.length) decision = "reject";
  else if (missing.length) {
    decision = "review";
    reasons.push("Sent to manual review: approval needs every enabled check.");
  } else if (mean! < threshold) {
    decision = "reject";
    reasons.push(
      `Fused score ${mean!.toFixed(2)} is below the ${threshold.toFixed(2)} threshold.`,
    );
  } else {
    decision = "approve";
    reasons.push(
      `All checks passed; fused score ${mean!.toFixed(2)} >= ${threshold.toFixed(2)}.`,
    );
  }
  return {
    decision,
    liveness_veto: veto,
    fused_score: mean === null ? null : Math.round(mean * 1e4) / 1e4,
    fusion_threshold: threshold,
    reasons,
  };
}
