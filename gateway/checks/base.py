"""Common result type and lazy-loading base class for the three checks."""
import importlib.util
import sys
import threading
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional

MODULES_DIR = Path(__file__).resolve().parents[2] / "modules"


class ModuleUnavailable(RuntimeError):
    """The module cannot run here (weights missing, dependency missing, load failed)."""


@dataclass
class ModalityResult:
    name: str
    status: str                      # "ok" | "unavailable" | "error" | "not_provided"
    score: Optional[float] = None    # 0..1, higher = more trustworthy
    passed: Optional[bool] = None
    threshold: Optional[float] = None
    label: Optional[str] = None
    detail: str = ""
    extra: dict = field(default_factory=dict)
    latency_ms: Optional[float] = None

    def to_dict(self):
        return asdict(self)


class Check:
    """A check loads its model on first use and keeps it in memory.

    Subclasses implement `_load()` (raise ModuleUnavailable with a clear reason)
    and `_run(inputs)` returning (score, passed, label, detail, extra).
    """

    name = "check"

    def __init__(self, cfg):
        self.cfg = cfg
        self._lock = threading.Lock()
        self._loaded = False
        self._error = None

    def ensure_loaded(self):
        with self._lock:
            if self._loaded:
                return
            if self._error is not None:
                raise ModuleUnavailable(self._error)
            try:
                self._load()
            except ModuleUnavailable as e:
                self._error = str(e)
                raise
            except Exception as e:  # broken weights, version mismatch, ...
                self._error = f"{self.name} module failed to load: {type(e).__name__}: {e}"
                raise ModuleUnavailable(self._error) from e
            self._loaded = True

    def availability(self):
        try:
            self.ensure_loaded()
            return {"available": True, "reason": None}
        except ModuleUnavailable as e:
            return {"available": False, "reason": str(e)}

    def run(self, inputs):
        try:
            self.ensure_loaded()
        except ModuleUnavailable as e:
            return ModalityResult(self.name, "unavailable", detail=str(e))
        t0 = time.perf_counter()
        try:
            score, passed, label, detail, extra = self._run(inputs)
        except Exception as e:
            return ModalityResult(self.name, "error", detail=f"Inference failed: {type(e).__name__}",
                                  latency_ms=(time.perf_counter() - t0) * 1000)
        return ModalityResult(self.name, "ok", score=float(score), passed=bool(passed),
                              threshold=self.threshold, label=label, detail=detail, extra=extra,
                              latency_ms=(time.perf_counter() - t0) * 1000)

    @property
    def threshold(self):
        return None

    def _load(self):
        raise NotImplementedError

    def _run(self, inputs):
        raise NotImplementedError


def require_file(path, what):
    if not path.is_file():
        raise ModuleUnavailable(f"{what} weights not found at {path}. "
                                "Restore the file from the repository or set the matching HUMANAUTH_* variable.")


def require_package(name, pip_name=None):
    try:
        return importlib.import_module(name)
    except ImportError:
        raise ModuleUnavailable(f"Python package '{pip_name or name}' is not installed "
                                f"(pip install {pip_name or name}).")


def import_from_path(module_name, path, package_dir=None):
    """Import a repo file by path under a unique name (the module folders all use `src`)."""
    if module_name in sys.modules:
        return sys.modules[module_name]
    kwargs = {"submodule_search_locations": [str(package_dir)]} if package_dir else {}
    spec = importlib.util.spec_from_file_location(module_name, str(path), **kwargs)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    try:
        spec.loader.exec_module(mod)
    except Exception:
        del sys.modules[module_name]
        raise
    return mod
