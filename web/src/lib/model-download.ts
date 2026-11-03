// A failed body stream must never become a cached or partially loaded model.
export async function downloadModel(
  url: string,
  progress: (loaded: number) => void,
  fetcher: typeof fetch = fetch,
): Promise<ArrayBuffer> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetcher(url, {
        cache: attempt === 0 ? "force-cache" : "reload",
      });
    } catch {
      if (attempt === 0) {
        progress(0);
        continue;
      }
      throw Error("Model download failed. Check your connection and retry.");
    }
    if (!response.ok || !response.body)
      throw Error(`Model download failed (${response.status}). Retry when connected.`);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        progress(loaded);
      }
    } catch {
      await reader.cancel().catch(() => undefined);
      if (attempt === 0) {
        progress(0);
        continue;
      }
      throw Error("Model download interrupted. Check your connection and retry.");
    } finally {
      reader.releaseLock();
    }
    const joined = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.length;
    }
    return joined.buffer;
  }
  throw Error("Model download failed. Check your connection and retry.");
}
