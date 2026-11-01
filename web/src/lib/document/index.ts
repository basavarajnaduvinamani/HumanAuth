import { chw, resizePIL, softmax } from "../image";
import { RGB, result } from "../types";
export const preprocessDocument = (im: RGB) => chw(resizePIL(im, 224, 224));
export function postprocessDocument(logits: number[], realIndex = 1) {
  const score = softmax(logits)[realIndex];
  return result(
    "document",
    score,
    score >= 0.5,
    `Genuine-document probability ${score.toFixed(2)}. Whole-image score; model was trained on region crops.`,
  );
}
