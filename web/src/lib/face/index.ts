import { chw, resizeCV, roundEven, softmax } from "../image";
import { RGB, result } from "../types";
export function letterbox(im: RGB, size = 640, color = 114) {
  const ratio = size / Math.max(im.width, im.height),
    w = roundEven(im.width * ratio),
    h = roundEven(im.height * ratio);
  const left = Math.round((size - w) / 2 - 0.1),
    top = Math.round((size - h) / 2 - 0.1);
  const resized = resizeCV(im, w, h),
    data = new Uint8Array(size * size * 3).fill(color);
  for (let y = 0; y < h; y++)
    data.set(
      resized.data.subarray(y * w * 3, (y + 1) * w * 3),
      ((top + y) * size + left) * 3,
    );
  return chw({ data, width: size, height: size });
}
export function increasedCrop(im: RGB, box: number[], inc = 1.5): RGB {
  const [x1, y1, x2, y2] = box,
    l = Math.max(x2 - x1, y2 - y1),
    size = Math.trunc(l * inc);
  const x = Math.trunc((x1 + x2) / 2 - (l * inc) / 2),
    y = Math.trunc((y1 + y2) / 2 - (l * inc) / 2);
  // cv2 bottom padding uses int(l*inc-y2+y), preserving Python truncation.
  const ex = Math.min(im.width, x + size),
    ey = Math.min(im.height, y + size),
    sx = Math.max(0, x),
    sy = Math.max(0, y);
  const height = ey - sy + (sy - y) + Math.trunc(l * inc - ey + y),
    width = size;
  if (width <= 0 || height <= 0) throw Error("Invalid face crop");
  const data = new Uint8Array(width * height * 3);
  for (let yy = sy; yy < ey; yy++)
    for (let xx = sx; xx < ex; xx++)
      for (let c = 0; c < 3; c++)
        data[((yy - y) * width + xx - x) * 3 + c] =
          im.data[(yy * im.width + xx) * 3 + c];
  return { data, width, height };
}
export function preprocessLiveness(im: RGB) {
  const r = 128 / Math.max(im.width, im.height),
    w = Math.trunc(im.width * r),
    h = Math.trunc(im.height * r),
    p = resizeCV(im, w, h);
  const data = new Uint8Array(128 * 128 * 3),
    left = Math.floor((128 - w) / 2),
    top = Math.floor((128 - h) / 2);
  for (let y = 0; y < h; y++)
    data.set(
      p.data.subarray(y * w * 3, (y + 1) * w * 3),
      ((y + top) * 128 + left) * 3,
    );
  return chw({ data, width: 128, height: 128 });
}
export function detections(
  raw: Float32Array,
  dims: readonly number[],
  im: RGB,
): number[][] {
  const stride = dims[dims.length - 1],
    candidates: { box: number[]; score: number; cls: number }[] = [];
  for (let i = 0; i < raw.length; i += stride) {
    if (raw[i + 4] <= 0.25) continue;
    let cls = 0,
      p = raw[i + 5];
    for (let c = 6; c < stride; c++)
      if (raw[i + c] > p) {
        p = raw[i + c];
        cls = c - 5;
      }
    const score = Math.fround(p * raw[i + 4]);
    if (score <= 0.25) continue;
    candidates.push({
      box: [
        raw[i] - raw[i + 2] / 2,
        raw[i + 1] - raw[i + 3] / 2,
        raw[i] + raw[i + 2] / 2,
        raw[i + 1] + raw[i + 3] / 2,
      ],
      score,
      cls,
    });
  }
  candidates.sort((a, b) => b.score - a.score);
  const keep: typeof candidates = [];
  const iou = (a: number[], b: number[]) => {
    const inter =
      Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) *
      Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    return (
      inter /
      ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter)
    );
  };
  for (const c of candidates.slice(0, 30000)) {
    if (!keep.some((k) => k.cls === c.cls && iou(k.box, c.box) > 0.45))
      keep.push(c);
    if (keep.length === 2) break;
  }
  const gain = 640 / Math.max(im.width, im.height),
    pad = [(640 - im.width * gain) / 2, (640 - im.height * gain) / 2];
  return keep.map((k) =>
    k.box.map((v, j) =>
      roundEven(
        Math.max(
          0,
          Math.min(j % 2 ? im.height : im.width, (v - pad[j % 2]) / gain),
        ),
      ),
    ),
  );
}
export function postprocessLiveness(logits: number[]) {
  const p = softmax(logits),
    score = p[0];
  return result(
    "face",
    score,
    p.indexOf(Math.max(...p)) === 0 && score >= 0.5,
    `Live-face probability ${score.toFixed(2)}.`,
  );
}
