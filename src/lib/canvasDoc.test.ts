import { describe, expect, it } from "vitest";
import { cloneItems, hasLocalChanges, mergeDocs, parseCanvas, restoreDoc, toObsidianCanvas, type CanvasDoc, type CanvasNode } from "./canvasDoc";

const node = (id: string, ts: number, text = id): CanvasNode => ({ id, ts, type: "text", x: 0, y: 0, width: 10, height: 10, text });

describe("mergeDocs", () => {
  it("keeps the newest copy of each node and adds unseen ones", () => {
    const local: CanvasDoc = { nodes: [node("a", 2, "mine"), node("b", 1)], edges: [] };
    const remote: CanvasDoc = { nodes: [node("a", 1, "theirs"), node("c", 1)], edges: [] };
    const merged = mergeDocs(local, remote);
    expect(merged.nodes.map((n) => [n.id, n.text])).toEqual([["a", "mine"], ["b", "b"], ["c", "c"]]);
  });

  it("lets a deletion win over older copies and drops edges to deleted nodes", () => {
    const local: CanvasDoc = { nodes: [node("b", 1)], edges: [], deleted: { a: 5 } };
    const remote: CanvasDoc = {
      nodes: [node("a", 3), node("b", 1)],
      edges: [{ id: "e", fromNode: "a", toNode: "b", ts: 3 }],
    };
    const merged = mergeDocs(local, remote);
    expect(merged.nodes.map((n) => n.id)).toEqual(["b"]);
    expect(merged.edges).toEqual([]);
    expect(merged.deleted).toEqual({ a: 5 });
  });

  it("keeps a node edited after it was deleted elsewhere", () => {
    const merged = mergeDocs({ nodes: [node("a", 9)], edges: [] }, { nodes: [], edges: [], deleted: { a: 5 } });
    expect(merged.nodes.map((n) => n.id)).toEqual(["a"]);
  });
});

describe("hasLocalChanges", () => {
  it("detects newer local nodes and deletions", () => {
    const remote: CanvasDoc = { nodes: [node("a", 1)], edges: [] };
    expect(hasLocalChanges({ nodes: [node("a", 2)], edges: [] }, remote)).toBe(true);
    expect(hasLocalChanges({ nodes: [node("a", 1)], edges: [], deleted: { b: 3 } }, remote)).toBe(true);
    expect(hasLocalChanges({ nodes: [node("a", 1)], edges: [] }, remote)).toBe(false);
  });
});

describe("restoreDoc", () => {
  it("brings back removed and changed items as fresh edits that survive a merge", () => {
    const before: CanvasDoc = { nodes: [node("a", 1, "old"), node("b", 1)], edges: [] };
    const now: CanvasDoc = { nodes: [node("a", 5, "new"), node("c", 5)], edges: [], deleted: { b: 5 } };
    const restored = restoreDoc(before, now, 9);
    expect(restored.nodes.map((n) => [n.id, n.text, n.ts])).toEqual([["a", "old", 9], ["b", "b", 9]]);
    expect(restored.deleted?.c).toBe(9);
    const merged = mergeDocs(restored, now);
    expect(merged.nodes.map((n) => [n.id, n.text]).sort()).toEqual([["a", "old"], ["b", "b"]]);
  });

  it("keeps unchanged items as they are", () => {
    const same = node("a", 3);
    expect(restoreDoc({ nodes: [same], edges: [] }, { nodes: [same], edges: [] }, 9).nodes[0].ts).toBe(3);
  });
});

describe("parseCanvas / toObsidianCanvas", () => {
  it("drops malformed items and round-trips without merge stamps", () => {
    const doc = parseCanvas({
      nodes: [node("a", 4), { id: "bad", type: "text" }],
      edges: [{ id: "e1", fromNode: "a", toNode: "a" }, { id: "e2", fromNode: "a", toNode: "missing" }],
    });
    expect(doc.nodes.map((n) => n.id)).toEqual(["a"]);
    expect(doc.edges.map((e) => e.id)).toEqual(["e1"]);
    expect(toObsidianCanvas(doc).nodes[0]).not.toHaveProperty("ts");
  });
});

describe("cloneItems", () => {
  it("gives copies new ids, shifts them, keeps groups first and relinks inner edges only", () => {
    const g: CanvasNode = { ...node("g", 1), type: "group" };
    const out = cloneItems([node("a", 1), g, node("b", 1)], [
      { id: "e1", fromNode: "a", toNode: "b" },
      { id: "e2", fromNode: "a", toNode: "z" },
    ], 40, 7);
    expect(out.nodes[0].type).toBe("group");
    expect(out.nodes.every((n) => !["a", "b", "g"].includes(n.id) && n.x === 40 && n.ts === 7)).toBe(true);
    expect(out.edges).toHaveLength(1);
    const ids = new Set(out.nodes.map((n) => n.id));
    expect(ids.has(out.edges[0].fromNode) && ids.has(out.edges[0].toNode)).toBe(true);
  });
});
