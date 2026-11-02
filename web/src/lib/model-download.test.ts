import { expect, it, vi } from "vitest";
import { downloadModel } from "./model-download";

it("discards interrupted response bytes and retries once with a fresh fetch", async () => {
  let reads = 0;
  const broken = new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      if (reads++ === 0) controller.enqueue(new Uint8Array([99, 99]));
      else controller.error(new TypeError("Error in input stream"));
    },
  }));
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(broken)
    .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])));
  const progress: number[] = [];
  const bytes = await downloadModel("https://example.test/model", (n) => progress.push(n), fetcher);
  expect(Array.from(new Uint8Array(bytes))).toEqual([1, 2, 3]);
  expect(progress).toEqual([2, 0, 3]);
  expect(fetcher.mock.calls.map((call) => call[1]?.cache)).toEqual(["force-cache", "reload"]);
});

it("bounds transport retries and reports a designed failure", async () => {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline"));
  await expect(downloadModel("https://example.test/model", () => undefined, fetcher))
    .rejects.toThrow("Model download failed. Check your connection and retry.");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
