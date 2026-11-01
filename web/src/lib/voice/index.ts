import { result } from "../types";
import { softmax } from "../image";
export interface GMM {
  weights: number[];
  means: number[][];
  covariances: number[][];
  covariance_type: string;
}
export interface VoiceModels {
  speakers: Record<string, GMM>;
}
function fft(re: Float64Array, im: Float64Array, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let b = n >> 1;
    for (; j & b; b >>= 1) j ^= b;
    j ^= b;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len *= 2) {
    const angle = ((inverse ? 2 : -2) * Math.PI) / len,
      wr = Math.cos(angle),
      wi = Math.sin(angle);
    for (let start = 0; start < n; start += len) {
      let ur = 1,
        ui = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = start + j,
          b = a + len / 2,
          vr = re[b] * ur - im[b] * ui,
          vi = re[b] * ui + im[b] * ur;
        re[b] = re[a] - vr;
        im[b] = im[a] - vi;
        re[a] += vr;
        im[a] += vi;
        const nr = ur * wr - ui * wi;
        ui = ur * wi + ui * wr;
        ur = nr;
      }
    }
  }
  if (inverse)
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
}
// Bluestein reduces the prime-sized 1103-point transform to a radix-2 convolution.
const N = 1103,
  M = 4096,
  cos = Float64Array.from({ length: N }, (_, i) =>
    Math.cos((Math.PI * ((i * i) % (2 * N))) / N),
  ),
  sin = Float64Array.from({ length: N }, (_, i) =>
    Math.sin((Math.PI * ((i * i) % (2 * N))) / N),
  );
const br = new Float64Array(M),
  bi = new Float64Array(M);
for (let i = 0; i < N; i++) {
  br[i] = cos[i];
  bi[i] = sin[i];
  if (i) {
    br[M - i] = cos[i];
    bi[M - i] = sin[i];
  }
}
fft(br, bi);
export function powerSpectrum(frame: Float64Array) {
  const ar = new Float64Array(M),
    ai = new Float64Array(M);
  for (let i = 0; i < N; i++) {
    ar[i] = frame[i] * cos[i];
    ai[i] = -frame[i] * sin[i];
  }
  fft(ar, ai);
  for (let i = 0; i < M; i++) {
    const r = ar[i] * br[i] - ai[i] * bi[i];
    ai[i] = ar[i] * bi[i] + ai[i] * br[i];
    ar[i] = r;
  }
  fft(ar, ai, true);
  const p = new Float64Array(552);
  for (let i = 0; i < 552; i++) p[i] = (ar[i] ** 2 + ai[i] ** 2) / N;
  return p;
}
export function enrollmentPCM(
  samples: Float64Array,
  rate: number,
  channels: number,
): Int16Array {
  const frames = samples.length / channels,
    outN = Math.round((frames * 44100) / rate),
    out = new Int16Array(outN * 2);
  for (let i = 0; i < outN; i++)
    for (let c = 0; c < 2; c++) {
      const pos = (i * rate) / 44100,
        k = Math.min(Math.floor(pos), frames - 1),
        j = Math.min(k + 1, frames - 1),
        a = samples[k * channels + Math.min(c, channels - 1)],
        b = samples[j * channels + Math.min(c, channels - 1)];
      const v = a + (b - a) * (pos - k),
        lo = Math.floor(v),
        rounded = v - lo === 0.5 ? lo + (lo % 2 !== 0 ? 1 : 0) : Math.round(v);
      out[i * 2 + c] = Math.max(-32768, Math.min(32767, rounded));
    }
  return out;
}
export function features(stereo: Int16Array): number[][] {
  const signal = new Float64Array(stereo.length);
  signal[0] = stereo[0];
  signal[1] = stereo[1];
  for (let i = 2; i < signal.length; i++)
    signal[i] = stereo[i] - 0.97 * stereo[i - 2];
  const frameLen = 1103,
    step = 441,
    count =
      signal.length <= frameLen
        ? 1
        : 1 + Math.ceil((signal.length - frameLen) / step);
  const bins = Array.from({ length: 28 }, (_, i) =>
    Math.floor(
      ((N + 1) *
        700 *
        (10 ** ((2595 * Math.log10(1 + 22050 / 700) * i) / 27 / 2595) - 1)) /
        44100,
    ),
  );
  const matrix: number[][] = [];
  for (let f = 0; f < count; f++) {
    const frame = new Float64Array(N);
    frame.set(signal.subarray(f * step, Math.min(signal.length, f * step + N)));
    const p = powerSpectrum(frame),
      energy = p.reduce((s, v) => s + v, 0) || Number.EPSILON;
    const banks = Array.from({ length: 26 }, (_, j) => {
      let s = 0;
      for (let k = bins[j]; k < bins[j + 1]; k++)
        s += (p[k] * (k - bins[j])) / (bins[j + 1] - bins[j]);
      for (let k = bins[j + 1]; k < bins[j + 2]; k++)
        s += (p[k] * (bins[j + 2] - k)) / (bins[j + 2] - bins[j + 1]);
      return Math.log(s || Number.EPSILON);
    });
    const cep = Array.from(
      { length: 20 },
      (_, j) =>
        banks.reduce(
          (s, v, k) => s + v * Math.cos((Math.PI * j * (2 * k + 1)) / 52),
          0,
        ) *
        Math.sqrt((j === 0 ? 1 : 2) / 26) *
        (1 + 11 * Math.sin((Math.PI * j) / 22)),
    );
    cep[0] = Math.log(energy);
    matrix.push(cep);
  }
  for (let c = 0; c < 20; c++) {
    const mean = matrix.reduce((s, r) => s + r[c], 0) / count,
      std =
        Math.sqrt(matrix.reduce((s, r) => s + (r[c] - mean) ** 2, 0) / count) ||
        1;
    for (const row of matrix) row[c] = (row[c] - mean) / std;
  }
  return matrix.map((row, i) => [
    ...row,
    ...Array.from(
      { length: 20 },
      (_, c) =>
        (matrix[Math.min(count - 1, i + 1)][c] -
          matrix[Math.max(0, i - 1)][c] +
          2 *
            (matrix[Math.min(count - 1, i + 2)][c] -
              matrix[Math.max(0, i - 2)][c])) /
        10,
    ),
  ]);
}
export function meanLogLikelihood(g: GMM, x: number[][]) {
  if (g.covariance_type !== "diag")
    throw Error("Only diagonal covariance is supported");
  return (
    x.reduce((sum, row) => {
      const ll = g.weights.map(
        (w, k) =>
          Math.log(w) -
          0.5 *
            (row.length * Math.log(2 * Math.PI) +
              row.reduce(
                (s, v, c) =>
                  s +
                  Math.log(g.covariances[k][c]) +
                  (v - g.means[k][c]) ** 2 / g.covariances[k][c],
                0,
              )),
      );
      const m = Math.max(...ll);
      return sum + m + Math.log(ll.reduce((s, v) => s + Math.exp(v - m), 0));
    }, 0) / x.length
  );
}
export function checkVoice(
  pcm: Float64Array,
  rate: number,
  channels: number,
  models: VoiceModels,
  claimed = "Raj",
) {
  const x = features(enrollmentPCM(pcm, rate, channels)),
    names = Object.keys(models.speakers).sort();
  if (!names.includes(claimed)) throw Error("Choose an enrolled speaker");
  const ll = names.map((n) => meanLogLikelihood(models.speakers[n], x)),
    post = softmax(ll),
    best = names[ll.indexOf(Math.max(...ll))],
    score = post[names.indexOf(claimed)];
  return result(
    "voice",
    score,
    best === claimed && score >= 0.5,
    `Closest enrolled speaker '${best}'; claimed '${claimed}'. Closed-set speaker match, not synthetic-speech detection.`,
  );
}
export function decodeWav(bytes: ArrayBuffer) {
  const d = new DataView(bytes),
    str = (o: number, n: number) =>
      String.fromCharCode(...new Uint8Array(bytes, o, n));
  if (bytes.byteLength > 10 * 1024 * 1024)
    throw Error("Voice clip is larger than 10 MB.");
  if (bytes.byteLength < 44 || str(0, 4) !== "RIFF" || str(8, 4) !== "WAVE")
    throw Error("Upload a WAV file (16-bit PCM).");
  let offset = 12,
    rate = 0,
    channels = 0,
    width = 0,
    format = 0,
    start = 0,
    size = 0;
  while (offset + 8 <= d.byteLength) {
    const id = str(offset, 4),
      n = d.getUint32(offset + 4, true);
    if (offset + 8 + n > d.byteLength) throw Error("Truncated WAV file.");
    if (id === "fmt ") {
      format = d.getUint16(offset + 8, true);
      channels = d.getUint16(offset + 10, true);
      rate = d.getUint32(offset + 12, true);
      width = d.getUint16(offset + 22, true);
    }
    if (id === "data") {
      start = offset + 8;
      size = n;
    }
    offset += 8 + n + (n % 2);
  }
  if (
    format !== 1 ||
    width !== 16 ||
    ![1, 2].includes(channels) ||
    rate < 8000 ||
    rate > 96000 ||
    !start
  )
    throw Error("WAV must be mono or stereo 16-bit PCM, 8–96 kHz.");
  const samples = Float64Array.from({ length: Math.floor(size / 2) }, (_, i) =>
      d.getInt16(start + i * 2, true),
    ),
    seconds = samples.length / channels / rate;
  if (seconds < 1) throw Error("Voice clip is shorter than 1 s.");
  if (seconds > 20) throw Error("Voice clip is longer than 20 s.");
  if (!samples.some((x) => x !== 0)) throw Error("Voice clip is silent.");
  return { samples, rate, channels };
}
