"""Document check: the team's ResNet18 forgery classifier (forgery_classifier.pth).

Same preprocessing as modules/document_forgery_detection/src/models/predict_single_image.py
(Resize 224x224, ToTensor, no normalisation) on the whole uploaded image. The
annotation-box cropping in predict_model.py is not used: at onboarding time
there are no ground-truth boxes. The classifier was trained on annotated
regions, so a whole-document score is outside what it was trained on; treat it
as a demo signal, not a measured forgery detector.
"""
from .base import Check, require_file, require_package


def _strip_prefix(state_dict):
    """The repo's scripts load the same file as bare resnet18 or wrapped in .model / .convnet."""
    for prefix in ("model.", "convnet.", "module."):
        if all(k.startswith(prefix) for k in state_dict):
            return {k[len(prefix):]: v for k, v in state_dict.items()}
    return state_dict


class DocumentCheck(Check):
    name = "document"

    @property
    def threshold(self):
        return self.cfg.document_threshold

    def _load(self):
        torch = require_package("torch")
        tv = require_package("torchvision")
        require_file(self.cfg.document_model_path, "Document classifier (forgery_classifier.pth)")
        order = self.cfg.document_class_order
        if sorted(order) != ["fake", "real"]:
            raise RuntimeError(f"document_class_order must be a permutation of real,fake, got {order}")
        torch.set_num_threads(max(1, torch.get_num_threads()))
        model = tv.models.resnet18(weights=None)
        model.fc = torch.nn.Linear(model.fc.in_features, 2)
        state = torch.load(str(self.cfg.document_model_path), map_location="cpu", weights_only=True)
        model.load_state_dict(_strip_prefix(state))
        model.eval()
        self.torch = torch
        self.model = model
        self.transform = tv.transforms.Compose([tv.transforms.Resize((224, 224)), tv.transforms.ToTensor()])
        self.real_index = order.index("real")

    def _run(self, rgb):
        from PIL import Image
        x = self.transform(Image.fromarray(rgb)).unsqueeze(0)
        with self.torch.no_grad():
            probs = self.torch.softmax(self.model(x), dim=1)[0]
        genuine = float(probs[self.real_index])
        passed = genuine >= self.threshold
        label = "genuine" if passed else "forged"
        detail = (f"Genuine-document probability {genuine:.2f}" +
                  ("" if passed else f", below the {self.threshold:.2f} threshold."))
        return genuine, passed, label, detail, {"class_order": list(self.cfg.document_class_order),
                                                "note": "whole-image score; model was trained on region crops"}
