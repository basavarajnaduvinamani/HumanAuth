"""Voice check: closed-set speaker identification against the enrolled GMMs.

Features replicate extract_features() in modules/voice_authentication/main_functions.py
(20 MFCC + 20 deltas, nfft=1103). Enrollment (add_user.py) recorded 44.1 kHz
stereo int16, so uploads are converted to that format before feature extraction.

Limits, stated plainly: there is no background/impostor model, so an unknown
voice is still assigned to its nearest enrolled speaker, and this is speaker
matching, not synthetic-speech (deepfake) detection.
"""
import pickle

import numpy as np

from .base import Check, ModuleUnavailable, require_package

ENROLL_RATE = 44100

_ALLOWED = {
    ("sklearn.mixture._gaussian_mixture", "GaussianMixture"),
    ("numpy._core.multiarray", "_reconstruct"),
    ("numpy.core.multiarray", "_reconstruct"),
    ("numpy._core.multiarray", "scalar"),
    ("numpy.core.multiarray", "scalar"),
    ("numpy", "ndarray"),
    ("numpy", "dtype"),
}


class _GMMParams:
    """Stand-in for sklearn's GaussianMixture: only the fitted arrays are kept."""

    def __setstate__(self, state):
        self.__dict__.update(state)


class _RestrictedUnpickler(pickle.Unpickler):
    """Only lets a pickled diagonal GaussianMixture through; anything else is refused."""

    def find_class(self, module, name):
        if (module, name) not in _ALLOWED:
            raise pickle.UnpicklingError(f"refusing to load {module}.{name}")
        if name == "GaussianMixture":
            return _GMMParams
        return super().find_class(module, name)


def load_gmm(path):
    with open(path, "rb") as f:
        g = _RestrictedUnpickler(f).load()
    if getattr(g, "covariance_type", None) != "diag":
        raise ValueError(f"{path.name}: only diagonal-covariance GMMs are supported")
    return {"weights": np.asarray(g.weights_), "means": np.asarray(g.means_),
            "prec_chol": np.asarray(g.precisions_cholesky_)}


def gmm_mean_loglik(gmm, X):
    """Mean per-frame log-likelihood; equals sklearn GaussianMixture.score(X) for diag covariance."""
    mu, pc, w = gmm["means"], gmm["prec_chol"], gmm["weights"]
    d = X.shape[1]
    log_det = np.sum(np.log(pc), axis=1)
    diff = (X[:, None, :] - mu[None, :, :]) * pc[None, :, :]
    log_prob = -0.5 * (d * np.log(2 * np.pi) + np.sum(diff ** 2, axis=2)) + log_det
    weighted = log_prob + np.log(w)
    m = weighted.max(axis=1, keepdims=True)
    return float(np.mean(m[:, 0] + np.log(np.exp(weighted - m).sum(axis=1))))


def _scale(a):
    """sklearn.preprocessing.scale: per-column zero mean, unit variance (std 0 -> 1)."""
    std = a.std(axis=0)
    std[std == 0] = 1.0
    return (a - a.mean(axis=0)) / std


def calculate_delta(array):
    rows, _ = array.shape
    deltas = np.zeros((rows, 20))
    N = 2
    for i in range(rows):
        index = []
        for j in range(1, N + 1):
            first = max(i - j, 0)
            second = min(i + j, rows - 1)
            index.append((second, first))
        deltas[i] = (array[index[0][0]] - array[index[0][1]] +
                     2 * (array[index[1][0]] - array[index[1][1]])) / 10
    return deltas


def to_enrollment_format(rate, audio):
    """Resample to 44.1 kHz and make stereo int16, the format add_user.py recorded."""
    if audio.ndim == 1:
        audio = audio[:, None]
    if rate != ENROLL_RATE:
        n_out = int(round(audio.shape[0] * ENROLL_RATE / rate))
        t_in = np.arange(audio.shape[0]) / rate
        t_out = np.arange(n_out) / ENROLL_RATE
        audio = np.stack([np.interp(t_out, t_in, audio[:, c]) for c in range(audio.shape[1])], axis=1)
    if audio.shape[1] == 1:
        audio = np.repeat(audio, 2, axis=1)
    return np.clip(np.round(audio), -32768, 32767).astype(np.int16)


def extract_features(audio, rate, mfcc_module):
    mfcc_feat = mfcc_module.mfcc(audio, rate, 0.025, 0.01, 20, appendEnergy=True, nfft=1103)
    mfcc_feat = _scale(mfcc_feat)
    return np.hstack((mfcc_feat, calculate_delta(mfcc_feat)))


class VoiceCheck(Check):
    name = "voice"

    @property
    def threshold(self):
        return self.cfg.voice_threshold

    def _load(self):
        self.mfcc = require_package("python_speech_features")
        d = self.cfg.voice_models_dir
        files = sorted(d.glob("*.gmm")) if d.is_dir() else []
        if not files:
            raise ModuleUnavailable(f"No enrolled speaker models (*.gmm) found in {d}. "
                                    "Enroll speakers with modules/voice_authentication/add_user.py.")
        self.speakers = {f.stem: load_gmm(f) for f in files}

    def enrolled(self):
        try:
            self.ensure_loaded()
        except ModuleUnavailable:
            return []
        return sorted(self.speakers)

    def _run(self, inputs):
        rate, audio, claimed = inputs
        feats = extract_features(to_enrollment_format(rate, audio), ENROLL_RATE, self.mfcc)
        names = sorted(self.speakers)
        ll = np.array([gmm_mean_loglik(self.speakers[n], feats) for n in names])
        post = np.exp(ll - ll.max())
        post /= post.sum()
        best = names[int(np.argmax(ll))]
        target = claimed or best
        score = float(post[names.index(target)])
        passed = best == target and score >= self.threshold
        if claimed:
            detail = (f"Voice matches claimed speaker '{claimed}' (posterior {score:.2f})." if passed else
                      f"Voice is closest to '{best}', not the claimed '{claimed}' (posterior {score:.2f}).")
        else:
            detail = f"Closest enrolled speaker '{best}' (posterior {score:.2f}); no identity was claimed."
        extra = {"best_match": best, "claimed": claimed,
                 "mean_loglik": {n: round(float(v), 3) for n, v in zip(names, ll)},
                 "note": "closed-set speaker match; not a synthetic-speech detector"}
        return score, passed, ("match" if passed else "mismatch"), detail, extra
