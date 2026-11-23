import { describe, expect, it } from "vitest";
import { hasNewerLocal, mergeElements } from "./whiteboardMerge";

const el = (id: string, version: number, versionNonce = 1) => ({ id, version, versionNonce });

describe("mergeElements", () => {
  it("keeps the newer copy of each element and adds unseen ones", () => {
    const merged = mergeElements([el("a", 2), el("b", 1)], [el("a", 1), el("b", 3), el("c", 1)]);
    expect(merged).toEqual([el("a", 2), el("b", 3), el("c", 1)]);
  });

  it("breaks version ties by the lower versionNonce on both sides", () => {
    expect(mergeElements([el("a", 2, 9)], [el("a", 2, 4)])).toEqual([el("a", 2, 4)]);
    expect(mergeElements([el("a", 2, 4)], [el("a", 2, 9)])).toEqual([el("a", 2, 4)]);
  });
});

describe("hasNewerLocal", () => {
  it("detects local edits the remote copy lacks", () => {
    expect(hasNewerLocal([el("a", 2)], [el("a", 1)])).toBe(true);
    expect(hasNewerLocal([el("b", 1)], [el("a", 1)])).toBe(true);
    expect(hasNewerLocal([el("a", 1)], [el("a", 2)])).toBe(false);
  });
});
