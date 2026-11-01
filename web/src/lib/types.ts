export type Modality = "face" | "document" | "voice";
export interface CheckResult {
  name: Modality;
  status: "ok" | "unavailable" | "error" | "not_provided";
  score: number | null;
  passed: boolean | null;
  threshold: number;
  detail: string;
  latency_ms?: number | null;
  mode?: "live" | "replay";
  backend?: string;
  guidance?: string;
}
export interface RGB {
  data: Uint8Array;
  width: number;
  height: number;
}
export interface ModelEntry {
  file: string;
  size_bytes: number;
  sha256: string;
  source_path: string;
  precision: string;
  licence_note: string;
}
export const thresholds = {
  face: 0.5,
  document: 0.5,
  voice: 0.5,
  fusion: 0.66,
};
export function result(
  name: Modality,
  score: number,
  passed: boolean,
  detail: string,
): CheckResult {
  return {
    name,
    status: "ok",
    score,
    passed,
    threshold: thresholds[name],
    detail,
    mode: "live",
  };
}
