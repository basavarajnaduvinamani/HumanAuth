import { it, expect } from "vitest";
import { receipt } from "./receipt";
import { result } from "./types";
it("allowlists receipt fields, excluding media even if present in runtime objects", () => {
  const r = {
    ...result("face", 0.9, true, "Live"),
    image: "private-image",
    audio: new Uint8Array([9, 1, 2]),
    extra: { selfie: "private" },
  };
  const body = JSON.stringify(receipt([r], []));
  expect(body).not.toContain("private");
  expect(body).not.toContain("selfie");
  expect(JSON.parse(body).decision).toBe("review");
});
