import { it, expect } from "vitest";
import { decodeWav, enrollmentPCM, meanLogLikelihood } from "./index";
function wav(seconds: number, silent = false) {
  const n = Math.round(seconds * 16000),
    b = new ArrayBuffer(44 + n * 2),
    d = new DataView(b);
  const str = (o: number, s: string) =>
    [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  str(8, "WAVE");
  str(12, "fmt ");
  d.setUint32(16, 16, true);
  d.setUint16(20, 1, true);
  d.setUint16(22, 1, true);
  d.setUint32(24, 16000, true);
  d.setUint16(34, 16, true);
  str(36, "data");
  d.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) d.setInt16(44 + i * 2, silent ? 0 : 100, true);
  return b;
}
it("rejects too-short and silent clips, accepts valid PCM", () => {
  expect(() => decodeWav(wav(0.1))).toThrow("shorter than 1 s");
  expect(() => decodeWav(wav(1, true))).toThrow("silent");
  expect(decodeWav(wav(1)).samples.length).toBe(16000);
});
it("resamples and duplicates mono using the enrollment convention", () => {
  expect(
    Array.from(enrollmentPCM(new Float64Array([0, 100, 200]), 44100, 1)),
  ).toEqual([0, 0, 100, 100, 200, 200]);
});
it("scores a diagonal unit Gaussian analytically", () => {
  expect(
    meanLogLikelihood(
      {
        covariance_type: "diag",
        weights: [1],
        means: [[0, 0]],
        covariances: [[1, 1]],
      },
      [[0, 0]],
    ),
  ).toBeCloseTo(-Math.log(2 * Math.PI), 12);
});
