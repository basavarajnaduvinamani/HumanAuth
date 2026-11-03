import { describe, expect, it } from "vitest";
import {
  locateCard,
  rectifyCard,
  type Pixels,
  type Quad,
} from "./document-localization";
function image(rectangles: number[][]): Pixels {
  const width = 200,
    height = 140,
    data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const bright = rectangles.some(
        ([l, t, r, b]) => x >= l && x <= r && y >= t && y <= b,
      );
      const at = 4 * (y * width + x);
      data.fill(bright ? 230 : 20, at, at + 3);
      data[at + 3] = 255;
    }
  return { width, height, data };
}
describe("classical card localisation candidate", () => {
  it("finds an isolated card without treating its boundary as authenticity", () => {
    const found = locateCard(image([[25, 25, 175, 115]]));
    expect(found?.quad).toEqual([
      { x: 25, y: 25 },
      { x: 175, y: 25 },
      { x: 175, y: 115 },
      { x: 25, y: 115 },
    ]);
  });
  it("requests review for blank, clipped, or ambiguous multi-card captures", () => {
    expect(locateCard(image([]))).toBeNull();
    expect(locateCard(image([[0, 0, 199, 139]]))).toBeNull();
    expect(
      locateCard(
        image([
          [10, 30, 85, 110],
          [115, 30, 190, 110],
        ]),
      ),
    ).toBeNull();
  });
  it("maps all four corners through perspective correction", () => {
    const source = image([]);
    for (let y = 0; y < source.height; y++)
      for (let x = 0; x < source.width; x++) {
        const at = 4 * (y * source.width + x);
        source.data[at] = x;
        source.data[at + 1] = y;
      }
    const quad: Quad = [
      { x: 20, y: 20 },
      { x: 170, y: 35 },
      { x: 150, y: 120 },
      { x: 35, y: 110 },
    ];
    const result = rectifyCard(source, quad, 100, 70);
    for (const [at, point] of [
      [0, quad[0]],
      [99 * 4, quad[1]],
      [(70 * 100 - 1) * 4, quad[2]],
      [69 * 100 * 4, quad[3]],
    ] as const) {
      expect(result.data[at]).toBeCloseTo(point.x, 0);
      expect(result.data[at + 1]).toBeCloseTo(point.y, 0);
    }
    expect(source.data[0]).toBe(0);
  });
  it("rejects malformed buffers and degenerate geometry", () => {
    expect(() =>
      locateCard({ width: 200, height: 140, data: new Uint8ClampedArray(4) }),
    ).toThrow("Invalid image");
    expect(() =>
      rectifyCard(image([]), [
        { x: 5, y: 5 },
        { x: 5, y: 5 },
        { x: 5, y: 5 },
        { x: 5, y: 5 },
      ]),
    ).toThrow("quadrilateral");
  });
});
