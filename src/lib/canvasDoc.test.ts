import { describe, expect, it } from "vitest";
import { hasLocalChanges, mergeDocs, parseCanvas, toObsidianCanvas, type CanvasDoc, type CanvasNode } from "./canvasDoc";

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
