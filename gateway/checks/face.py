"""Face liveness: YOLOv5s-face detector + MiniFASNet anti-spoofing, both ONNX.

Wraps the existing classes in modules/face_anti_spoofing/src unchanged and
mirrors make_prediction() in modules/face_anti_spoofing/video_predict.py.
"""
import warnings

import numpy as np

from .base import Check, MODULES_DIR, import_from_path, require_file, require_package

SRC = MODULES_DIR / "face_anti_spoofing" / "src"


def increased_crop(img, bbox, bbox_inc=1.5):
    """Square crop around the face box, padded with black. Copied from video_predict.py."""
    import cv2
    real_h, real_w = img.shape[:2]
    x, y, w, h = bbox
    w, h = w - x, h - y
    l = max(w, h)
    xc, yc = x + w / 2, y + h / 2
    x, y = int(xc - l * bbox_inc / 2), int(yc - l * bbox_inc / 2)
    x1 = 0 if x < 0 else x
    y1 = 0 if y < 0 else y
    x2 = real_w if x + l * bbox_inc > real_w else x + int(l * bbox_inc)
    y2 = real_h if y + l * bbox_inc > real_h else y + int(l * bbox_inc)
    img = img[y1:y2, x1:x2, :]
    img = cv2.copyMakeBorder(img, y1 - y, int(l * bbox_inc - y2 + y), x1 - x, int(l * bbox_inc) - x2 + x,
                             cv2.BORDER_CONSTANT, value=[0, 0, 0])
    return img


class FaceLivenessCheck(Check):
    name = "face"

    @property
    def threshold(self):
        return self.cfg.liveness_threshold

    def _load(self):
        require_package("onnxruntime")
        require_package("cv2", "opencv-python-headless")
        require_file(self.cfg.face_detector_path, "Face detector (yolov5s-face.onnx)")
        require_file(self.cfg.antispoof_path, "Anti-spoofing model (AntiSpoofing_*.onnx)")
        det_pkg = import_from_path("humanauth_face_detector", SRC / "face_detector/__init__.py",
                                   package_dir=SRC / "face_detector")
        fas = import_from_path("humanauth_face_antispoof", SRC / "FaceAntiSpoofing.py")
        with warnings.catch_warnings():  # the repo classes ask for CUDA first, then fall back to CPU
            warnings.simplefilter("ignore", UserWarning)
            self.detector = det_pkg.YOLOv5(str(self.cfg.face_detector_path))
            self.antispoof = fas.AntiSpoof(str(self.cfg.antispoof_path))
        if not self.detector.ort_session or not self.antispoof.ort_session:
            raise RuntimeError("ONNX session could not be created")

    def _run(self, rgb):
        boxes = self.detector([rgb], max_detection=2)[0]
        n_faces = int(boxes.shape[0])
        if n_faces == 0:
            return 0.0, False, "no_face", "No face found in the selfie.", {"faces": 0}
        if n_faces > 1:
            return 0.0, False, "multiple_faces", "More than one face in the selfie.", {"faces": n_faces}
        bbox = boxes.flatten()[:4].astype(int)
        pred = self.antispoof([increased_crop(rgb, bbox, bbox_inc=1.5)])[0]
        live = float(pred[0][0])          # class 0 = live (video_predict.py)
        passed = int(np.argmax(pred)) == 0 and live >= self.threshold
        label = "live" if passed else "spoof"
        detail = (f"Live-face probability {live:.2f}" +
                  ("" if passed else f" is below the {self.threshold:.2f} threshold or the face was classed as spoof."))
        return live, passed, label, detail, {"faces": 1, "bbox": [int(v) for v in bbox]}
