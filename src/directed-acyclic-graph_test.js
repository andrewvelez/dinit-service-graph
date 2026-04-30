import { describe, expect, test } from "bun:test";
import DirectedAcyclicGraph from "./directed-acyclic-graph.js";

/**
 * @param {string[]} order
 * @param {Array<[string, string]>} edges
 */
function expectValidTopologicalOrder(order, edges) {
  const positionByVertex = new Map(order.map((vertex, index) => [vertex, index]));

  for (const [source, destination] of edges) {
    const sourcePosition = positionByVertex.get(source);
    const destinationPosition = positionByVertex.get(destination);

    expect(sourcePosition).not.toBeUndefined();
    expect(destinationPosition).not.toBeUndefined();

    if (sourcePosition === undefined || destinationPosition === undefined) {
      throw new Error(`Missing vertex in topological order: ${source} -> ${destination}`);
    }

    expect(sourcePosition).toBeLessThan(destinationPosition);
  }
}

describe("DirectedAcyclicGraph", () => {
  describe("constructor", () => {
    test("creates an empty graph by default", () => {
      const graph = new DirectedAcyclicGraph();

      expect(graph.getVertices()).toEqual([]);
      expect(graph.getEdges()).toEqual([]);
      expect(graph.getstringCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);
      expect(graph.topologicalSort()).toEqual([]);
      expect(graph.toString()).toBe("");
    });

    test("creates a graph from an adjacency list", () => {
      const graph = new DirectedAcyclicGraph(
        new Map([
          ["a", new Set(["b", "c"])],
          ["b", new Set(["d"])],
          ["c", new Set(["d"])],
          ["d", new Set()],
        ]),
      );

      expect(graph.getVertices()).toEqual(["a", "b", "c", "d"]);
      expect(graph.getNeighbors("a")).toEqual(["b", "c"]);
      expect(graph.getNeighbors("b")).toEqual(["d"]);
      expect(graph.getEdges()).toEqual([
        ["a", "b"],
        ["a", "c"],
        ["b", "d"],
        ["c", "d"],
      ]);
      expect(graph.getstringCount()).toBe(4);
      expect(graph.getEdgeCount()).toBe(4);
      expectValidTopologicalOrder(graph.topologicalSort(), graph.getEdges());
    });

    test("deep-copies the provided adjacency list", () => {
      const adjacencyList = new Map([
        ["a", new Set(["b"])],
        ["b", new Set()],
      ]);

      const graph = new DirectedAcyclicGraph(adjacencyList);

      adjacencyList.get("a")?.add("c");
      adjacencyList.set("c", new Set());

      expect(graph.getVertices()).toEqual(["a", "b"]);
      expect(graph.getNeighbors("a")).toEqual(["b"]);
      expect(graph.hasstring("c")).toBe(false);
    });

    test("throws when the initial adjacency list references a missing vertex", () => {
      expect(
        () =>
          new DirectedAcyclicGraph(
            new Map([
              ["a", new Set(["b"])],
            ]),
          ),
      ).toThrow("string a has an edge to missing string b");
    });

    test("throws when the initial adjacency list contains a cycle", () => {
      expect(
        () =>
          new DirectedAcyclicGraph(
            new Map([
              ["a", new Set(["b"])],
              ["b", new Set(["c"])],
              ["c", new Set(["a"])],
            ]),
          ),
      ).toThrow("Graph contains a cycle, topological sort is not possible");
    });
  });

  describe("vertices", () => {
    test("adds a new vertex", () => {
      const graph = new DirectedAcyclicGraph();

      expect(graph.addstring("a")).toBe(true);
      expect(graph.hasstring("a")).toBe(true);
      expect(graph.getVertices()).toEqual(["a"]);
      expect(graph.getstringCount()).toBe(1);
    });

    test("does not add a duplicate vertex", () => {
      const graph = new DirectedAcyclicGraph();

      expect(graph.addstring("a")).toBe(true);
      expect(graph.addstring("a")).toBe(false);
      expect(graph.getVertices()).toEqual(["a"]);
      expect(graph.getstringCount()).toBe(1);
    });

    test("removes an existing vertex", () => {
      const graph = new DirectedAcyclicGraph(
        new Map([
          ["a", new Set(["b"])],
          ["b", new Set()],
          ["c", new Set(["b"])],
        ]),
      );

      expect(graph.removestring("b")).toBe(true);
      expect(graph.hasstring("b")).toBe(false);
      expect(graph.getVertices()).toEqual(["a", "c"]);
      expect(graph.getNeighbors("a")).toEqual([]);
      expect(graph.getNeighbors("c")).toEqual([]);
      expect(graph.getEdges()).toEqual([]);
      expect(graph.getstringCount()).toBe(2);
      expect(graph.getEdgeCount()).toBe(0);
    });

    test("returns false when removing a missing vertex", () => {
      const graph = new DirectedAcyclicGraph();

      expect(graph.removestring("missing")).toBe(false);
      expect(graph.getVertices()).toEqual([]);
    });

    test("returns an empty neighbor list for a missing vertex", () => {
      const graph = new DirectedAcyclicGraph();

      expect(graph.getNeighbors("missing")).toEqual([]);
    });
  });

  describe("edges", () => {
    test("adds an edge between existing vertices", () => {
      const graph = new DirectedAcyclicGraph();
      graph.addstring("a");
      graph.addstring("b");

      expect(graph.addEdge("a", "b")).toBe(true);
      expect(graph.hasEdge("a", "b")).toBe(true);
      expect(graph.getNeighbors("a")).toEqual(["b"]);
      expect(graph.getEdges()).toEqual([["a", "b"]]);
      expect(graph.getEdgeCount()).toBe(1);
    });

    test("addEdge delegates to addEdgeBetweenVertices", () => {
      const graph = new DirectedAcyclicGraph();
      graph.addstring("a");
      graph.addstring("b");

      expect(graph.addEdgeBetweenVertices("a", "b")).toBe(true);
      expect(graph.hasEdge("a", "b")).toBe(true);
    });

    test("does not add a duplicate edge", () => {
      const graph = new DirectedAcyclicGraph();
      graph.addstring("a");
      graph.addstring("b");

      expect(graph.addEdge("a", "b")).toBe(true);
      expect(graph.addEdge("a", "b")).toBe(false);
      expect(graph.getEdges()).toEqual([["a", "b"]]);
      expect(graph.getEdgeCount()).toBe(1);
    });

    test("throws when adding an edge from a missing source vertex", () => {
      const graph = new DirectedAcyclicGraph();
      graph.addstring("b");

      expect(() => graph.addEdge("a", "b")).toThrow(
        "Source string a does not exist in the graph",
      );
      expect(graph.getEdges()).toEqual([]);
    });

    test("throws when adding an edge to a missing destination vertex", () => {
      const graph = new DirectedAcyclicGraph();
      graph.addstring("a");

      expect(() => graph.addEdge("a", "b")).toThrow(
        "Destination string b does not exist in the graph",
      );
      expect(graph.getEdges()).toEqual([]);
    });

    test("throws and rolls back when adding an edge would create a cycle", () => {
      const graph = new DirectedAcyclicGraph(
        new Map([
          ["a", new Set(["b"])],
          ["b", new Set(["c"])],
          ["c", new Set()],
        ]),
      );

      expect(() => graph.addEdge("c", "a")).toThrow(
        "Adding edge c -> a would create a cycle in the graph",
      );
      expect(graph.hasEdge("c", "a")).toBe(false);
      expect(graph.getEdges()).toEqual([
        ["a", "b"],
        ["b", "c"],
      ]);
      expect(graph.topologicalSort()).toEqual(["a", "b", "c"]);
    });

    test("removes an existing edge", () => {
      const graph = new DirectedAcyclicGraph(
        new Map([
          ["a", new Set(["b"])],
          ["b", new Set()],
        ]),
      );

      expect(graph.removeEdge("a", "b")).toBe(true);
      expect(graph.hasEdge("a", "b")).toBe(false);
      expect(graph.getNeighbors("a")).toEqual([]);
      expect(graph.getEdges()).toEqual([]);
      expect(graph.getEdgeCount()).toBe(0);
    });

    test("returns false when removing a missing edge", () => {
      const graph = new DirectedAcyclicGraph(
        new Map([
          ["a", new Set()],
          ["b", new Set()],
        ]),
      );

      expect(graph.removeEdge("a", "b")).toBe(false);
      expect(graph.removeEdge("missing", "b")).toBe(false);
    });

    test("returns false when checking an edge from a missing source", () => {
      const graph = new DirectedAcyclicGraph();

      expect(graph.hasEdge("missing", "b")).toBe(false);
    });
  });

  describe("topologicalSort", () => {
    test("returns vertices in topological order", () => {
      const graph = new DirectedAcyclicGraph(
        new Map([
          ["build", new Set(["test", "lint"])],
          ["test", new Set(["package"])],
          ["lint", new Set(["package"])],
          ["package", new Set(["publish"])],
          ["publish", new Set()],
        ]),
      );

      const order = graph.topologicalSort();

      expect(order).toHaveLength(5);
      expect(new Set(order)).toEqual(new Set(["build", "test", "lint", "package", "publish"]));
      expectValidTopologicalOrder(order, graph.getEdges());
    });

    test("returns isolated vertices too", () => {
      const graph = new DirectedAcyclicGraph(
        new Map([
          ["a", new Set(["b"])],
          ["b", new Set()],
          ["c", new Set()],
        ]),
      );

      expect(graph.topologicalSort()).toEqual(["a", "c", "b"]);
    });

    test("throws if the graph is manually corrupted with a missing destination", () => {
      const graph = new DirectedAcyclicGraph();
      graph.addstring("a");
      graph.adjacencyList.get("a")?.add("b");

      expect(() => graph.topologicalSort()).toThrow(
        "string a has an edge to missing string b",
      );
    });

    test("throws if the graph is manually corrupted with a cycle", () => {
      const graph = new DirectedAcyclicGraph(
        new Map([
          ["a", new Set()],
          ["b", new Set()],
        ]),
      );
      graph.adjacencyList.get("a")?.add("b");
      graph.adjacencyList.get("b")?.add("a");

      expect(() => graph.topologicalSort()).toThrow(
        "Graph contains a cycle, topological sort is not possible",
      );
    });
  });

  describe("clone", () => {
    test("returns an independent graph with the same vertices and edges", () => {
      const graph = new DirectedAcyclicGraph(
        new Map([
          ["a", new Set(["b"])],
          ["b", new Set()],
        ]),
      );

      const clone = graph.clone();

      expect(clone).toBeInstanceOf(DirectedAcyclicGraph);
      expect(clone).not.toBe(graph);
      expect(clone.getVertices()).toEqual(["a", "b"]);
      expect(clone.getEdges()).toEqual([["a", "b"]]);

      clone.addstring("c");
      clone.addEdge("b", "c");

      expect(graph.getVertices()).toEqual(["a", "b"]);
      expect(graph.getEdges()).toEqual([["a", "b"]]);
      expect(clone.getVertices()).toEqual(["a", "b", "c"]);
      expect(clone.getEdges()).toEqual([
        ["a", "b"],
        ["b", "c"],
      ]);
    });
  });

  describe("clear", () => {
    test("removes all vertices and edges", () => {
      const graph = new DirectedAcyclicGraph(
        new Map([
          ["a", new Set(["b"])],
          ["b", new Set()],
        ]),
      );

      graph.clear();

      expect(graph.getVertices()).toEqual([]);
      expect(graph.getEdges()).toEqual([]);
      expect(graph.getstringCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);
      expect(graph.topologicalSort()).toEqual([]);
    });
  });

  describe("toString", () => {
    test("returns one adjacency line per vertex", () => {
      const graph = new DirectedAcyclicGraph(
        new Map([
          ["a", new Set(["b", "c"])],
          ["b", new Set()],
          ["c", new Set()],
        ]),
      );

      expect(graph.toString()).toBe("a -> b, c\nb -> \nc -> ");
    });
  });

  describe("internal validation helpers", () => {
    test("assertstringExists does nothing for an existing vertex", () => {
      const graph = new DirectedAcyclicGraph();
      graph.addstring("a");

      expect(() => graph.assertstringExists("a", "Test")).not.toThrow();
    });

    test("assertstringExists throws for a missing vertex", () => {
      const graph = new DirectedAcyclicGraph();

      expect(() => graph.assertstringExists("missing", "Test")).toThrow(
        "Test string missing does not exist in the graph",
      );
    });

    test("getRequiredNeighbors returns the underlying neighbor set for an existing vertex", () => {
      const graph = new DirectedAcyclicGraph(
        new Map([
          ["a", new Set(["b"])],
          ["b", new Set()],
        ]),
      );

      expect(graph.getRequiredNeighbors("a", "Test")).toEqual(new Set(["b"]));
    });

    test("getRequiredNeighbors throws for a missing vertex", () => {
      const graph = new DirectedAcyclicGraph();

      expect(() => graph.getRequiredNeighbors("missing", "Test")).toThrow(
        "Test string missing does not exist in the graph",
      );
    });

    test("validateReferences does nothing when all edges point to existing vertices", () => {
      const graph = new DirectedAcyclicGraph(
        new Map([
          ["a", new Set(["b"])],
          ["b", new Set()],
        ]),
      );

      expect(() => graph.validateReferences()).not.toThrow();
    });

    test("validateReferences throws when an edge points to a missing vertex", () => {
      const graph = new DirectedAcyclicGraph();
      graph.addstring("a");
      graph.adjacencyList.get("a")?.add("b");

      expect(() => graph.validateReferences()).toThrow(
        "string a has an edge to missing string b",
      );
    });
  });
});