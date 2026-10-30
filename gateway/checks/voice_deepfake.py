"""Optional recovered Deep4SNet; weights stay outside the repository.

The local source classifies rendered amplitude histograms, not spectrograms.
Match its low-pass filter, histogram rendering and image transforms in memory.
This is an uncalibrated demo check, not a claimed held-out detector.
"""
import io
import math
import threading

import numpy as np

from .base import Check, require_file, require_package

_RENDER_LOCK = threading.Lock()


def audio_histogram(rate, audio, librosa, signal):
    from matplotlib.figure import Figure
    from matplotlib.backends.backend_agg import FigureCanvasAgg
    from PIL import Image

    mono = audio.astype(np.float32) / 32768.0
    if mono.ndim == 2:
        mono = mono.mean(axis=1)
    mono = librosa.resample(mono, orig_sr=rate, target_sr=44100)
    b, a = signal.butter(4, 4000.0 / (44100 / 2), btype="low")
    filtered = signal.filtfilt(b, a, mono)
    hist, bins = np.histogram(filtered, bins=256, range=(-1, 1))
    # Explicit defaults match the recovered plt.figure()/savefig pipeline and
    # avoid changing process-wide plotting state or creating biometric files.
    with _RENDER_LOCK:
        fig = Figure(figsize=(6.4, 4.8), dpi=100)
        FigureCanvasAgg(fig)
        ax = fig.subplots()
        ax.bar(bins[:-1], hist, width=bins[1] - bins[0], color="black")
        buf = io.BytesIO()
        fig.savefig(buf, format="png")
        buf.seek(0)
        with Image.open(buf) as image:
            return image.convert("RGB")


class VoiceDeepfakeCheck(Check):
    name = "voice_deepfake"

    @property
    def threshold(self):
        return 0.5  # argmax real/fake rule from the existing local detector

    def _load(self):
        require_file(self.cfg.voice_deepfake_model_path, "Local Deep4SNet")
        self.torch = require_package("torch")
        tv = require_package("torchvision")
        self.librosa = require_package("librosa")
        self.signal = require_package("scipy.signal", "scipy")
        require_package("matplotlib")
        from modules.local_recovered.deep4snet import Deep4SNet
        checkpoint = self.torch.load(str(self.cfg.voice_deepfake_model_path),
                                     map_location="cpu", weights_only=True)
        self.model = Deep4SNet()
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()
        self.transform = tv.transforms.Compose([
            tv.transforms.Resize((128, 128)),
            tv.transforms.Grayscale(num_output_channels=1),
            tv.transforms.ToTensor(),
            tv.transforms.Normalize(mean=[0.5], std=[0.5]),
        ])

    def _run(self, inputs):
        rate, audio = inputs
        image = audio_histogram(rate, audio, self.librosa, self.signal)
        with self.torch.no_grad():
            prob = self.torch.softmax(self.model(self.transform(image).unsqueeze(0)), dim=1)[0]
        score = float(prob[0])  # recovered source: real=0, fake=1
        if not math.isfinite(score):
            raise ValueError("Non-finite Deep4SNet output")
        passed = score >= self.threshold
        return (score, passed, "real_voice" if passed else "synthetic_voice",
                "Optional local Deep4SNet histogram classifier; uncalibrated demo signal.",
                {"model": "Deep4SNet", "class_order": ["real", "fake"],
                 "scope": "not the report's CNN-LSTM; no new accuracy claim"})
