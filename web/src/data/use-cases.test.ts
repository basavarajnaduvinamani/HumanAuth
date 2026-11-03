import { describe, expect, it } from "vitest";
import data from "./use-cases.json";

describe("research source integrity", () => {
  it("resolves every citation to a versioned primary source", () => {
    const sources = data.sources as Record<
      string,
      { url: string; version: string; kind: string }
    >;
    for (const item of [...data.cases, ...data.entry_scenarios]) {
      expect(item.sources.length, item.id).toBeGreaterThan(0);
      for (const id of item.sources) {
        expect(sources[id], `${item.id}: ${id}`).toBeDefined();
        expect(new URL(sources[id].url).protocol).toBe("https:");
        expect(sources[id].version.length).toBeGreaterThan(10);
        expect(sources[id].kind).not.toBe("secondary");
      }
    }
  });
  it("keeps row anchors unique and the required workflow boundaries explicit", () => {
    expect(new Set(data.cases.map((item) => item.id)).size).toBe(
      data.cases.length,
    );
    const byId = Object.fromEntries(data.cases.map((item) => [item.id, item]));
    for (const id of ["bank-onboarding", "pension", "documents", "digiyatra"])
      expect(byId[id]).toBeDefined();
    expect(byId["bank-onboarding"].voice).toContain("audio only");
    expect(byId.nist.voice).toContain("Excluded");
    expect(byId.documents.boundary).toContain("issuer");
    expect(
      data.entry_scenarios.find((item) => item.id === "service-desk")?.proposal,
    ).toContain("eligibility decisions outside");
  });
});
