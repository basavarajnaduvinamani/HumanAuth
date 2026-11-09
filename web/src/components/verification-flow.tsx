"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import manifest from "../../public/models/manifest.json";
import { CheckResult, Modality } from "../lib/types";
import { infer, wipeInference } from "../lib/browser-inference";
import { receipt } from "../lib/receipt";
import { ResultSheet } from "./result-sheet";
import { useHydrated } from "../lib/use-hydrated";
const steps = ["Consent", "Face", "Document", "Voice", "Result"];
type Progress = {
  file: string;
  loaded: number;
  total: number;
  cached: boolean;
};
function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const n = buffer.length,
    out = new ArrayBuffer(44 + n * 2),
    d = new DataView(out),
    put = (offset: number, s: string) =>
      [...s].forEach((c, i) => d.setUint8(offset + i, c.charCodeAt(0)));
  put(0, "RIFF");
  d.setUint32(4, 36 + n * 2, true);
  put(8, "WAVE");
  put(12, "fmt ");
  d.setUint32(16, 16, true);
  d.setUint16(20, 1, true);
  d.setUint16(22, 1, true);
  d.setUint32(24, buffer.sampleRate, true);
  d.setUint32(28, buffer.sampleRate * 2, true);
  d.setUint16(32, 2, true);
  d.setUint16(34, 16, true);
  put(36, "data");
  d.setUint32(40, n * 2, true);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < n; i++)
    d.setInt16(
      44 + i * 2,
      Math.max(-32768, Math.min(32767, Math.round(channel[i] * 32767))),
      true,
    );
  return out;
}
export function VerificationFlow() {
  const hydrated = useHydrated();
  const [step, setStep] = useState(0),
    [consent, setConsent] = useState(false),
    [results, setResults] = useState<CheckResult[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState<Progress | null>(null),
    [speaker, setSpeaker] = useState("Sample speaker A"),
    [camera, setCamera] = useState(false),
    [recording, setRecording] = useState(false),
    [feedback, setFeedback] = useState("Position one face inside the guide."),
    [levels, setLevels] = useState<number[]>(Array(24).fill(0)),
    [sampleSession, setSampleSession] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    audioContext = useRef<AudioContext | null>(null),
    started = useRef(false),
    generation = useRef(0),
    recorder = useRef<MediaRecorder | null>(null);
  const stopCapture = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera(false);
  };
  useEffect(
    () => () => {
      generation.current++;
      stream.current?.getTracks().forEach((t) => t.stop());
      if (timer.current) clearTimeout(timer.current);
      void audioContext.current?.close();
      wipeInference();
    },
    [],
  );
  const processInput = async (
    name: Modality,
    bytes: ArrayBuffer,
    advance = true,
    synthetic?: {
      speaker: "Sample speaker A" | "Sample speaker B";
      phrase: number;
    },
  ) => {
    setError("");
    setBusy(true);
    setProgress(null);
    const gen = generation.current;
    try {
      const output = await infer(
        name,
        bytes,
        speaker,
        (p) => {
          if (gen === generation.current) setProgress(p);
        },
        synthetic,
      );
      if (gen !== generation.current) return;
      setResults((prev) => [...prev.filter((r) => r.name !== name), output]);
      if (advance) setStep({ face: 2, document: 3, voice: 4 }[name]);
      return output;
    } catch (e) {
      if (gen === generation.current)
        setError(
          e instanceof Error ? e.message : "Unable to process this input.",
        );
    } finally {
      if (gen === generation.current) {
        setBusy(false);
        setProgress(null);
      }
    }
  };
  const sample = async (name: Modality, advance = true) => {
    try {
      if (name === "voice")
        return processInput(name, new ArrayBuffer(0), advance, {
          speaker:
            speaker === "Sample speaker B"
              ? "Sample speaker B"
              : "Sample speaker A",
          phrase: 0,
        });
      const filename =
        name === "face" ? "synthetic-face-a.png" : "document.png";
      const r = await fetch("/samples/" + filename);
      if (!r.ok) throw Error("Sample download failed. Please retry.");
      return processInput(name, await r.arrayBuffer(), advance);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Sample download failed. Please retry.",
      );
      setBusy(false);
    }
  };
  const runSamples = async () => {
    setConsent(true);
    setSampleSession(true);
    setError("");
    setBusy(true);
    const gen = generation.current;
    try {
      for (const [index, name] of (
        ["face", "document", "voice"] as const
      ).entries()) {
        if (gen !== generation.current) return;
        setStep(index + 1);
        const r = await sample(name, false);
        if (!r || gen !== generation.current) return;
      }
      setStep(4);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Sample data could not be loaded.",
      );
    } finally {
      if (gen === generation.current) setBusy(false);
    }
  };
  const launchSamples = useEffectEvent(() => {
    void runSamples();
  });
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("sample") === "1")
      queueMicrotask(() => {
        launchSamples();
      });
  }, []); // One launch per mounted session.
  useEffect(() => {
    if (camera && video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current
        .play()
        .catch(() =>
          setError("Camera preview could not start. Try uploading an image."),
        );
    }
  }, [camera]);
  const startCamera = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera capture is unavailable. Use an updated browser over HTTPS, or upload an image.",
      );
      return;
    }
    try {
      stopCapture();
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 } },
        audio: false,
      });
      setCamera(true);
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access in your browser settings, or upload an image."
          : "No camera is available. Connect a camera or upload an image.",
      );
    }
  };
  useEffect(() => {
    if (!camera) return;
    const interval = setInterval(() => {
      const v = video.current;
      if (!v?.videoWidth) return;
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, 32, 32);
      const pixels = ctx.getImageData(0, 0, 32, 32).data;
      let sum = 0;
      for (let i = 0; i < pixels.length; i += 4)
        sum += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      setFeedback(
        sum / 1024 < 45
          ? "More light: the camera image is dark."
          : "Keep one face in the guide. Capture when ready.",
      );
    }, 700);
    return () => clearInterval(interval);
  }, [camera]);
  useEffect(() => {
    if (!camera) return;
    let cancelled = false,
      inFlight = false;
    const gen = generation.current;
    const interval = setInterval(() => {
      void (async () => {
        const v = video.current;
        if (inFlight || !v?.videoWidth) return;
        inFlight = true;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          canvas.getContext("2d")!.drawImage(v, 0, 0);
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png"),
          );
          if (!blob || cancelled) return;
          const r = await infer(
            "face",
            await blob.arrayBuffer(),
            "Sample speaker A",
            () => {},
          );
          if (!cancelled && gen === generation.current)
            setFeedback(r.guidance || r.detail);
        } catch {
          if (!cancelled)
            setFeedback("Capture when ready, or use an image sample.");
        } finally {
          inFlight = false;
        }
      })();
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [camera]);
  const capture = async () => {
    const v = video.current;
    if (!v?.videoWidth) {
      setError("Wait for the camera preview.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) return;
    stopCapture();
    const r = await processInput("face", await blob.arrayBuffer(), false);
    if (r?.passed) setStep(2);
    else if (r)
      setError(
        `${r.detail} Move closer and keep one face in view, or continue with this result.`,
      );
  };
  const upload = async (file: File | undefined, name: Modality) => {
    if (!file) return;
    const max = (name === "voice" ? 10 : 8) * 1024 * 1024;
    if (file.size > max) {
      setError(
        `${name === "voice" ? "Voice clip" : "Image"} is larger than ${name === "voice" ? 10 : 8} MB.`,
      );
      return;
    }
    stopCapture();
    await processInput(name, await file.arrayBuffer());
  };
  const record = async () => {
    setError("");
    try {
      stopCapture();
      if (!navigator.mediaDevices?.getUserMedia)
        throw Error("Microphone capture is unavailable in this browser.");
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = input;
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(input);
      recorder.current = rec;
      const ctx = new AudioContext();
      audioContext.current = ctx;
      const source = ctx.createMediaStreamSource(input),
        analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      setRecording(true);
      const waveform = setInterval(() => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        setLevels(Array.from(data.slice(0, 24), (v) => v / 255));
      }, 80);
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        clearInterval(waveform);
        setRecording(false);
        stopCapture();
        try {
          const buffer = await ctx.decodeAudioData(
            await new Blob(chunks, { type: rec.mimeType }).arrayBuffer(),
          );
          const wav = encodeWav(buffer);
          await ctx.close();
          audioContext.current = null;
          await processInput("voice", wav);
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Audio could not be decoded. Try the bundled sample.",
          );
        }
      };
      rec.start();
      timer.current = setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, 4000);
    } catch (e) {
      setRecording(false);
      stopCapture();
      setError(
        e instanceof Error
          ? e.message
          : "Microphone permission denied. Try the bundled sample.",
      );
    }
  };
  const reset = () => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current) {
      recorder.current.onstop = null;
      recorder.current.ondataavailable = null;
      if (recorder.current.state === "recording") recorder.current.stop();
      recorder.current = null;
    }
    stopCapture();
    void audioContext.current?.close();
    audioContext.current = null;
    wipeInference();
    setResults([]);
    setStep(0);
    setConsent(false);
    setError("");
    setBusy(false);
    setProgress(null);
    setSampleSession(false);
    setRecording(false);
    setLevels(Array(24).fill(0));
    window.history.replaceState(null, "", "/verify");
  };
  const download = () => {
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(receipt(results, manifest.models), null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "humanauth-receipt.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const name = (["face", "document", "voice"] as const)[Math.max(0, step - 1)];
  return (
    <div className="verify-shell">
      <div className="verify-top">
        <h1>Verify with HumanAuth</h1>
        <span className="session-label mono">
          {sampleSession ? "Sample session" : "On your device"}
        </span>
      </div>
      <ol className="stepper" aria-label="Verification steps">
        {steps.map((s, i) => (
          <li key={s} aria-current={step === i ? "step" : undefined}>
            <span className="number">{i < step ? "✓" : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <div className="flow-actions">
            <button
              className="text-button"
              onClick={() => {
                setError("");
                void sample(name);
              }}
              disabled={busy}
            >
              Try the bundled sample
            </button>
          </div>
        </div>
      )}
      {step === 4 ? (
        <div className="results-layout">
          <div aria-live="polite">
            <ResultSheet results={results} sample={sampleSession} />
          </div>
          <aside className="results-aside">
            <h2>Keep the reasoning.</h2>
            <p>
              Download a receipt with decisions, scores, model hashes and
              timings. No images or audio are included.
            </p>
            <button className="button" onClick={download}>
              Download receipt (JSON)
            </button>
            <button className="button secondary" onClick={reset}>
              Start over
            </button>
            <details>
              <summary>Technical details</summary>
              {manifest.models.map((m) => (
                <div key={m.file}>
                  <p className="source">
                    {m.file} · {m.precision}
                    <br />
                    {m.sha256}
                  </p>
                </div>
              ))}
              <p className="source">
                {results.map((r) => `${r.name}: ${r.backend}`).join("\n")}
              </p>
            </details>
            <p className="source">
              Cold timings include loading and model initialization. Warm
              timings reuse sessions.
            </p>
            <Link className="text-button" href="/evidence">
              Read the evidence
            </Link>
          </aside>
        </div>
      ) : (
        <div className="flow-panel">
          <section className="flow-main">
            <p className="eyebrow">
              {step === 0 ? "Before we begin" : `Check: ${name}`}
            </p>
            <h2>
              {
                [
                  "Your device. Your choice.",
                  "Is a live face present?",
                  "Inspect the document.",
                  "Does the voice match?",
                ][step]
              }
            </h2>
            {step === 0 ? (
              <>
                <p>
                  The checks run in your browser. Your camera image, document
                  and audio stay in memory for this session. Only model files
                  are cached.
                </p>
                <p className="caption">
                  First use downloads{" "}
                  {(
                    manifest.models.reduce(
                      (n, model) => n + model.size_bytes,
                      0,
                    ) / 1e6
                  ).toFixed(1)}{" "}
                  MB of models, plus the browser runtime. Slow connections can
                  take several minutes. Cached models avoid another download;
                  initialization still takes time.
                </p>
                <label className="consent-label">
                  <input
                    type="checkbox"
                    disabled={!hydrated}
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I understand these checks are a demonstration, and consent
                    to local processing of the inputs I choose.
                  </span>
                </label>
                <div className="flow-actions">
                  <button
                    className="button"
                    disabled={!hydrated || !consent}
                    onClick={() => {
                      setStep(1);
                      if (
                        new URLSearchParams(window.location.search).has(
                          "camera",
                        )
                      )
                        void startCamera();
                    }}
                  >
                    Continue
                  </button>
                  <button
                    className="text-button"
                    disabled={!hydrated}
                    onClick={() => {
                      void runSamples();
                    }}
                  >
                    Use sample data
                  </button>
                </div>
              </>
            ) : (
              <>
                {step === 1 && (
                  <>
                    <p>
                      One face, facing the camera in even light. This checks
                      liveness, not whether the face matches an ID photo.
                    </p>
                    <div className="capture-area">
                      {camera ? (
                        <>
                          <video
                            ref={video}
                            autoPlay
                            playsInline
                            muted
                            aria-label="Live camera preview"
                          />
                          <div className="face-guide" />
                        </>
                      ) : (
                        <p className="capture-placeholder">
                          Camera access starts only when you choose it. You can
                          also upload an image or use the bundled sample.
                        </p>
                      )}
                    </div>
                    <p className="caption" aria-live="polite">
                      {camera ? feedback : "Images stay on your device."}
                    </p>
                    <div className="flow-actions">
                      {camera ? (
                        <button
                          className="button"
                          onClick={() => {
                            void capture();
                          }}
                          disabled={busy}
                        >
                          Capture face
                        </button>
                      ) : (
                        <button
                          className="button secondary"
                          onClick={() => {
                            void startCamera();
                          }}
                          disabled={busy}
                        >
                          Open camera
                        </button>
                      )}
                      {results.some((r) => r.name === "face") && (
                        <button
                          className="text-button"
                          onClick={() => setStep(2)}
                        >
                          Continue with this result
                        </button>
                      )}
                    </div>
                  </>
                )}
                {step === 2 && (
                  <>
                    <p>
                      The classifier scores the whole image. It was trained on
                      region crops, so a whole-document score is a demo signal.
                    </p>
                    <div className="capture-area">
                      <div className="card-guide" />
                      <p className="capture-placeholder">
                        Choose a document photo below, or use our synthetic
                        SPECIMEN. Avoid sharing a real ID in screenshots.
                      </p>
                    </div>
                  </>
                )}
                {step === 3 && (
                  <>
                    <p>
                      This matches only Sample speaker A and Sample speaker B,
                      the enrolled speakers. For visitors, the bundled Sample
                      speaker A sample is the realistic path. It does not detect
                      synthetic speech.
                    </p>
                    <label className="field-label" htmlFor="speaker">
                      Claimed enrolled speaker
                    </label>
                    <select
                      id="speaker"
                      value={speaker}
                      onChange={(e) => setSpeaker(e.target.value)}
                      disabled={busy || recording}
                    >
                      <option>Sample speaker A</option>
                      <option>Sample speaker B</option>
                    </select>
                    <svg
                      className="recording"
                      viewBox="0 0 300 80"
                      role="img"
                      aria-label={
                        recording
                          ? "Live microphone waveform"
                          : "Microphone is off"
                      }
                    >
                      {levels.map((v, i) => (
                        <rect
                          key={i}
                          x={i * 12 + 6}
                          y={40 - Math.max(2, v * 35)}
                          width="3"
                          height={Math.max(4, v * 70)}
                          fill="currentColor"
                        />
                      ))}
                    </svg>
                    <button
                      className="button secondary"
                      onClick={() => {
                        void record();
                      }}
                      disabled={busy || recording}
                    >
                      {recording
                        ? "Recording for 4 seconds…"
                        : "Record 4 seconds"}
                    </button>
                  </>
                )}
                <label className="upload-label">
                  {step === 3
                    ? "Upload 16-bit PCM WAV"
                    : "Upload JPEG, PNG or WebP"}
                  <input
                    type="file"
                    accept={
                      step === 3
                        ? ".wav,audio/wav"
                        : "image/jpeg,image/png,image/webp"
                    }
                    capture={step === 2 ? "environment" : undefined}
                    disabled={busy || recording}
                    onChange={(e) => {
                      void upload(e.target.files?.[0], name);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="flow-actions">
                  <button
                    className="button"
                    disabled={busy || recording}
                    onClick={() => {
                      void sample(name);
                    }}
                  >
                    {busy
                      ? "Processing…"
                      : `Use ${step === 1 ? "face" : step === 2 ? "SPECIMEN" : "Sample speaker A voice"} sample`}
                  </button>
                  <button className="text-button" onClick={reset}>
                    Start over
                  </button>
                </div>
              </>
            )}
            {busy && (
              <div className="loading-panel" role="status" aria-live="polite">
                <p>
                  {progress
                    ? `${progress.cached ? "Using cached model" : "Downloading"} ${progress.file}`
                    : "Running the local checks…"}
                </p>
                {progress && (
                  <>
                    <progress
                      aria-label="Model download progress"
                      max={progress.total}
                      value={progress.loaded}
                    />
                    <p className="loading-detail mono">
                      {progress.loaded.toLocaleString()} /{" "}
                      {progress.total.toLocaleString()} bytes
                    </p>
                  </>
                )}
                <p className="caption">
                  The page stays responsive. Inference runs in a worker.
                </p>
              </div>
            )}
          </section>
          <aside className="flow-aside">
            <h3>
              {step === 0 ? "What will be checked" : "What this check means"}
            </h3>
            {step === 0 ? (
              <ul>
                <li>Face liveness using YOLOv5s-face and MiniFASNet.</li>
                <li>Document signal using the team’s ResNet18.</li>
                <li>Closed-set voice matching using MFCC and GMMs.</li>
              </ul>
            ) : (
              <>
                <p>
                  {step === 1
                    ? "The liveness result can veto the final decision. A missing face or multiple faces fails the check."
                    : step === 2
                      ? "Real class index: 1. No normalization beyond 0–1 pixel scaling. A rejected SPECIMEN is an expected demo outcome."
                      : "Unknown visitors are still assigned to a nearest enrolled speaker. A high posterior is not proof of identity."}
                </p>
                <p className="source">
                  Threshold: 0.50 · {manifest.parity[name].mode} in Node parity.
                </p>
              </>
            )}
            <p className="note">
              No account, remote inference server or API key.
            </p>
            <Link href="/evidence" className="text-button">
              Inspect measurements
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
