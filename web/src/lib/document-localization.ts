/** Classical card-boundary proposal. A quad is geometry, never authenticity.
 * Ambiguous/low-contrast captures return null and require recapture/review.
 * This candidate is not yet wired into the product or benchmark-qualified.
 */
export type Point = { x: number; y: number };
export type Quad = [Point, Point, Point, Point];
export type Pixels = { width: number; height: number; data: Uint8ClampedArray };
const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function area(points: Point[]) {
  return (
    Math.abs(
      points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p.x * q.y - q.x * p.y;
      }, 0),
    ) / 2
  );
}
function hull(points: Point[]) {
  const ordered = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const halves: Point[][] = [];
  for (const list of [ordered, [...ordered].reverse()]) {
    const half: Point[] = [];
    for (const p of list) {
      while (half.length > 1 && cross(half.at(-2)!, half.at(-1)!, p) <= 0)
        half.pop();
      half.push(p);
    }
    half.pop();
    halves.push(half);
  }
  return halves.flat();
}
function validate(image: Pixels) {
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width < 2 ||
    image.height < 2 ||
    image.width * image.height > 24_000_000 ||
    image.data.length !== image.width * image.height * 4
  )
    throw new Error("Invalid image dimensions");
}

export function locateCard(
  image: Pixels,
): { quad: Quad; method: string } | null {
  validate(image);
  const scale = Math.min(1, 256 / Math.max(image.width, image.height));
  const w = Math.max(2, Math.round(image.width * scale)),
    h = Math.max(2, Math.round(image.height * scale));
  const gray = new Uint8Array(w * h),
    histogram = new Uint32Array(256);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const at =
        4 *
        (Math.min(image.height - 1, Math.floor(y / scale)) * image.width +
          Math.min(image.width - 1, Math.floor(x / scale)));
      const alpha = image.data[at + 3] / 255;
      const value = Math.round(
        alpha *
          (0.299 * image.data[at] +
            0.587 * image.data[at + 1] +
            0.114 * image.data[at + 2]) +
          (1 - alpha) * 255,
      );
      gray[y * w + x] = value;
      histogram[value]++;
    }
  const total = w * h;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let lowCount = 0,
    lowSum = 0,
    threshold = 0,
    bestVariance = 0;
  for (let i = 0; i < 255; i++) {
    lowCount += histogram[i];
    lowSum += i * histogram[i];
    if (!lowCount || lowCount === total) continue;
    const delta = lowSum / lowCount - (sum - lowSum) / (total - lowCount);
    const variance = lowCount * (total - lowCount) * delta * delta;
    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = i;
    }
  }
  if (bestVariance / (total * total) < 25) return null;
  const candidates: { quad: Quad; score: number }[] = [];
  for (const bright of [false, true]) {
    const seen = new Uint8Array(total),
      queue = new Int32Array(total);
    const belongs = (i: number) => gray[i] > threshold === bright;
    for (let origin = 0; origin < total; origin++) {
      if (seen[origin] || !belongs(origin)) continue;
      let start = 0,
        end = 1;
      queue[0] = origin;
      seen[origin] = 1;
      const boundary: Point[] = [];
      while (start < end) {
        const at = queue[start++],
          x = at % w,
          y = Math.floor(at / w);
        let edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
        const neighbors = [
          x > 0 ? at - 1 : -1,
          x + 1 < w ? at + 1 : -1,
          y > 0 ? at - w : -1,
          y + 1 < h ? at + w : -1,
        ];
        for (const next of neighbors) {
          if (next < 0 || !belongs(next)) {
            edge = true;
            continue;
          }
          if (!seen[next]) {
            seen[next] = 1;
            queue[end++] = next;
          }
        }
        if (edge) boundary.push({ x, y });
      }
      if (end < total * 0.05 || boundary.length < 4) continue;
      const polygon = hull(boundary);
      while (polygon.length > 4) {
        let smallest = Infinity,
          index = 0;
        for (let i = 0; i < polygon.length; i++) {
          const loss = Math.abs(
            cross(
              polygon[(i + polygon.length - 1) % polygon.length],
              polygon[i],
              polygon[(i + 1) % polygon.length],
            ),
          );
          if (loss < smallest) {
            smallest = loss;
            index = i;
          }
        }
        polygon.splice(index, 1);
      }
      if (polygon.length !== 4) continue;
      const quadArea = area(polygon),
        fill = end / quadArea;
      if (
        quadArea < 0.1 * total ||
        quadArea > 0.97 * total ||
        fill < 0.7 ||
        fill > 1.15
      )
        continue;
      if (
        polygon.filter(
          (p) => p.x <= 1 || p.y <= 1 || p.x >= w - 2 || p.y >= h - 2,
        ).length > 1
      )
        continue;
      let first = 0;
      for (let i = 1; i < 4; i++)
        if (polygon[i].x + polygon[i].y < polygon[first].x + polygon[first].y)
          first = i;
      const quad = [...polygon.slice(first), ...polygon.slice(0, first)].map(
        (p) => ({ x: p.x / scale, y: p.y / scale }),
      ) as Quad;
      candidates.push({ quad, score: quadArea * Math.min(fill, 1) });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  if (!candidates.length) return null;
  // Several disconnected cards of similar size need a human choice.
  if (candidates[1] && candidates[1].score > candidates[0].score * 0.7)
    return null;
  return {
    quad: candidates[0].quad,
    method: "Otsu components / convex hull / quadrilateral",
  };
}

function solve(matrix: number[][]): number[] {
  const n = matrix.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col]))
        pivot = row;
    [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
    if (Math.abs(matrix[col][col]) < 1e-10)
      throw new Error("Degenerate card quadrilateral");
    const divisor = matrix[col][col];
    for (let j = col; j <= n; j++) matrix[col][j] /= divisor;
    for (let row = 0; row < n; row++)
      if (row !== col) {
        const factor = matrix[row][col];
        for (let j = col; j <= n; j++)
          matrix[row][j] -= factor * matrix[col][j];
      }
  }
  return matrix.map((row) => row[n]);
}

export function rectifyCard(
  image: Pixels,
  quad: Quad,
  width = 448,
  height = 280,
): Pixels {
  validate(image);
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 2 ||
    height < 2 ||
    width * height > 2_000_000
  )
    throw new Error("Invalid crop dimensions");
  if (
    quad.length !== 4 ||
    quad.some(
      (p) =>
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        p.x < 0 ||
        p.y < 0 ||
        p.x > image.width - 1 ||
        p.y > image.height - 1,
    ) ||
    area(quad) < 4
  )
    throw new Error("Invalid card quadrilateral");
  const matrix: number[][] = [];
  for (const [i, [u, v]] of [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ].entries()) {
    const { x, y } = quad[i];
    matrix.push([u, v, 1, 0, 0, 0, -u * x, -v * x, x]);
    matrix.push([0, 0, 0, u, v, 1, -u * y, -v * y, y]);
  }
  const m = solve(matrix),
    data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1),
        v = y / (height - 1),
        denominator = m[6] * u + m[7] * v + 1;
      const sx = Math.min(
        image.width - 1,
        Math.max(0, (m[0] * u + m[1] * v + m[2]) / denominator),
      );
      const sy = Math.min(
        image.height - 1,
        Math.max(0, (m[3] * u + m[4] * v + m[5]) / denominator),
      );
      const left = Math.floor(sx),
        top = Math.floor(sy),
        right = Math.min(image.width - 1, left + 1),
        bottom = Math.min(image.height - 1, top + 1),
        fx = sx - left,
        fy = sy - top;
      const at = 4 * (y * width + x);
      for (let c = 0; c < 3; c++)
        data[at + c] =
          (1 - fy) *
            ((1 - fx) * image.data[4 * (top * image.width + left) + c] +
              fx * image.data[4 * (top * image.width + right) + c]) +
          fy *
            ((1 - fx) * image.data[4 * (bottom * image.width + left) + c] +
              fx * image.data[4 * (bottom * image.width + right) + c]);
      data[at + 3] = 255;
    }
  return { width, height, data };
}
