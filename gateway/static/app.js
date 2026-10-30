// HumanAuth onboarding UI: collects selfie, document and voice, calls /api/verify, renders results.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const blobs = { selfie: null, document: null, voice: null };
  const LABELS = { face: "Liveness (selfie)", document: "Document", voice: "Voice", voice_deepfake: "Voice deepfake" };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function setMedia(id, node) {
    const box = $(id);
    box.replaceChildren(node);
  }

  function markDone(step, done) {
    document.querySelector(`[data-step="${step}"]`).classList.toggle("done", done);
  }

  function showImage(kind, blob) {
    blobs[kind] = blob;
    const img = el("img");
    img.alt = kind + " preview";
    img.src = URL.createObjectURL(blob);
    setMedia(kind + "-media", img);
    markDone(kind, true);
  }

  // ---- health / module status ----
  fetch("/api/health").then((r) => r.json()).then((h) => {
    const chips = $("module-status");
    for (const [name, m] of Object.entries(h.modules)) {
      const c = el("span", "chip " + (m.available ? "on" : "off"), (m.available ? "" : "! ") + (LABELS[name] || name));
      c.title = m.available ? "Model loaded" : m.reason;
      chips.appendChild(c);
    }
    const sel = $("claimed");
    sel.replaceChildren();
    if (!h.enrolled_speakers.length) {
      sel.appendChild(el("option", "", "No enrolled speakers"));
    } else {
      sel.appendChild(Object.assign(el("option", "", "Select..."), { value: "" }));
      for (const s of h.enrolled_speakers) sel.appendChild(Object.assign(el("option", "", s), { value: s }));
    }
  }).catch(() => { $("module-status").appendChild(el("span", "chip off", "Gateway offline")); });

  // ---- selfie ----
  $("selfie-file").addEventListener("change", (e) => e.target.files[0] && showImage("selfie", e.target.files[0]));
  $("document-file").addEventListener("change", (e) => e.target.files[0] && showImage("document", e.target.files[0]));

  let camStream = null;
  $("selfie-cam").addEventListener("click", async () => {
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    } catch (err) {
      $("form-msg").textContent = "Camera not available: upload a photo instead.";
      return;
    }
    const v = el("video");
    v.autoplay = true; v.playsInline = true; v.muted = true; v.srcObject = camStream;
    setMedia("selfie-media", v);
    $("selfie-snap").hidden = false;
  });
  $("selfie-snap").addEventListener("click", () => {
    const v = document.querySelector("#selfie-media video");
    if (!v) return;
    const c = el("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    camStream.getTracks().forEach((t) => t.stop());
    $("selfie-snap").hidden = true;
    c.toBlob((b) => showImage("selfie", b), "image/jpeg", 0.92);
  });

  // ---- voice: record PCM with Web Audio and encode a 16-bit mono WAV ----
  function encodeWav(samples, rate) {
    const buf = new ArrayBuffer(44 + samples.length * 2);
    const v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE");
    w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buf], { type: "audio/wav" });
  }

  function showAudio(blob) {
    blobs.voice = blob;
    const a = el("audio");
    a.controls = true;
    a.src = URL.createObjectURL(blob);
    setMedia("voice-media", a);
    markDone("voice", true);
  }

  $("voice-file").addEventListener("change", (e) => e.target.files[0] && showAudio(e.target.files[0]));
  $("voice-rec").addEventListener("click", async () => {
    const btn = $("voice-rec");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      $("form-msg").textContent = "Microphone not available: upload a WAV instead.";
      return;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    const chunks = [];
    proc.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    src.connect(proc); proc.connect(ctx.destination);
    btn.disabled = true; btn.classList.add("rec");
    let left = 4;
    btn.textContent = `Recording... ${left}`;
    const tick = setInterval(() => { left -= 1; if (left > 0) btn.textContent = `Recording... ${left}`; }, 1000);
    setTimeout(() => {
      clearInterval(tick);
      proc.disconnect(); src.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      const n = chunks.reduce((a, c) => a + c.length, 0);
      const all = new Float32Array(n);
      let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
      showAudio(encodeWav(all, ctx.sampleRate));
      ctx.close();
      btn.disabled = false; btn.classList.remove("rec"); btn.textContent = "Record again";
    }, 4000);
  });

  // ---- submit ----
  function badge(m) {
    if (m.status !== "ok") return el("span", "badge na", m.status === "not_provided" ? "skipped" : "unavailable");
    return el("span", "badge " + (m.passed ? "pass" : "fail"), m.passed ? "pass" : "fail");
  }

  function card(name, m) {
    const c = el("article", "card");
    const top = el("div", "card-top");
    top.append(el("h3", "", (LABELS[name] || name)), badge(m));
    c.appendChild(top);
    if (m.status === "ok") {
      c.appendChild(el("div", "score", m.score.toFixed(2)));
      const bar = el("div", "bar");
      const fill = el("span"); fill.style.width = (m.score * 100).toFixed(0) + "%";
      const tick = el("i"); tick.style.left = (m.threshold * 100).toFixed(0) + "%"; tick.title = "threshold " + m.threshold;
      bar.append(fill, tick);
      c.appendChild(bar);
    }
    c.appendChild(el("p", "", m.detail));
    if (m.latency_ms != null) c.appendChild(el("p", "ms", `${m.latency_ms.toFixed(0)} ms`));
    return c;
  }

  const VERDICT = { approve: "Verified", reject: "Not verified", review: "Needs manual review" };

  function render(r) {
    const d = $("decision");
    d.className = "decision " + r.decision;
    d.replaceChildren(
      el("div", "verdict", VERDICT[r.decision]),
      el("div", "meta", `Fused score ${r.fused_score == null ? "n/a" : r.fused_score.toFixed(2)} (threshold ${r.fusion_threshold})` +
        (r.liveness_veto ? " | liveness veto applied" : "") + ` | ${r.latency_ms.toFixed(0)} ms | nothing stored`)
    );
    const ul = el("ul");
    for (const reason of r.reasons) ul.appendChild(el("li", "", reason));
    d.appendChild(ul);
    const cards = $("cards");
    cards.replaceChildren(...Object.entries(r.modalities).map(([n, m]) => card(n, m)));
    $("result").hidden = false;
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("verify-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("form-msg");
    msg.textContent = "";
    if (!blobs.selfie && !blobs.document && !blobs.voice) { msg.textContent = "Add at least one item to verify."; return; }
    const fd = new FormData();
    if (blobs.selfie) fd.append("selfie", blobs.selfie, "selfie.jpg");
    if (blobs.document) fd.append("document", blobs.document, "document.jpg");
    if (blobs.voice) fd.append("voice", blobs.voice, "voice.wav");
    fd.append("claimed_identity", $("claimed").value);
    const btn = $("submit");
    btn.disabled = true; btn.textContent = "Verifying...";
    try {
      const res = await fetch("/api/verify", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) { msg.textContent = body.message || "Request failed."; return; }
      render(body);
    } catch (err) {
      msg.textContent = "Could not reach the gateway.";
    } finally {
      btn.disabled = false; btn.textContent = "Verify me";
    }
  });
})();
