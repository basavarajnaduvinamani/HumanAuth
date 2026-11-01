import { RGB, result } from "./types";
import {
  letterbox,
  detections,
  increasedCrop,
  preprocessLiveness,
  postprocessLiveness,
} from "./face";
import { preprocessDocument, postprocessDocument } from "./document";
export type Runner = (
  file: string,
  x: Float32Array,
  dims: number[],
) => Promise<{ data: Float32Array; dims: readonly number[] }>;
export async function checkImage(
  name: "face" | "document",
  im: RGB,
  run: Runner,
  documentFile = "document-fp32.onnx",
) {
  if (name === "document") {
    const out = await run(
      documentFile,
      preprocessDocument(im),
      [1, 3, 224, 224],
    );
    return postprocessDocument(Array.from(out.data));
  }
  const det = await run("yolov5s-face.onnx", letterbox(im), [1, 3, 640, 640]),
    boxes = detections(det.data, det.dims, im);
  if (boxes.length !== 1) {
    const r = result(
      "face",
      0,
      false,
      boxes.length
        ? "More than one face in the selfie."
        : "No face found in the selfie.",
    );
    r.guidance = boxes.length
      ? "One face only. Keep other faces outside the frame."
      : "Move closer and face the camera.";
    return r;
  }
  const crop = increasedCrop(im, boxes[0]),
    out = await run(
      "AntiSpoofing_bin_1.5_128.onnx",
      preprocessLiveness(crop),
      [1, 3, 128, 128],
    );
  const r = postprocessLiveness(Array.from(out.data));
  r.guidance =
    (boxes[0][2] - boxes[0][0]) / im.width < 0.18
      ? "Move closer. Your face is small in the frame."
      : "One face found. Hold still and capture when ready.";
  return r;
}
