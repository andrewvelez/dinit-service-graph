import { describe, expect, test } from "bun:test";
import DirectedAcyclicGraph from "./directed-acyclic-graph.js";

/**
 * @typedef {Map<string, Set<string>>} AdjacencyList
 */

/**
 * Creates an adjacency list with explicit JSDoc-friendly types.
 *
 * @param {Array<[string, string[]]>} entries
 * @returns {AdjacencyList}
 */
function createAdjacencyList(entries) {
  /** @type {AdjacencyList} */
  const adjacencyList = new Map();

  for (const [vertex, neighbors] of entries) {
    adjacencyList.set(vertex, new Set(neighbors));
  }

  return adjacencyList;
}

/**
 * Validates that the provided order respects the direction of the provided edges.
 *
 * @param {string[]} order The topological order to verify.
 * @param {Array<[string, string]>} edges The list of edges [source, destination].
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

      expect(graph.topologicalSort()).toEqual([]);
    });

    test("accepts an empty explicit adjacency list", () => {
      const graph = new DirectedAcyclicGraph(new Map());

      expect(graph.topologicalSort()).toEqual([]);
    });

    test("creates a graph from an adjacency list", () => {
      const edges = /** @type {Array<[string, string]>} */ ([
        ["a", "b"],
        ["a", "c"],
        ["b", "d"],
        ["c", "d"],
      ]);

      const graph = new DirectedAcyclicGraph(
        createAdjacencyList([
          ["a", ["b", "c"]],
          ["b", ["d"]],
          ["c", ["d"]],
          ["d", []],
        ]),
      );

      const order = graph.topologicalSort();

      expect(order).toHaveLength(4);
      expect(new Set(order)).toEqual(new Set(["a", "b", "c", "d"]));
      expectValidTopologicalOrder(order, edges);
    });

    test("preserves isolated vertices from an adjacency list", () => {
      const graph = new DirectedAcyclicGraph(
        createAdjacencyList([
          ["a", []],
          ["b", []],
          ["c", []],
        ]),
      );

      expect(graph.topologicalSort()).toEqual(["a", "b", "c"]);
    });

    test("deep-copies the provided adjacency list", () => {
      const adjacencyList = createAdjacencyList([
        ["a", ["b"]],
        ["b", []],
      ]);

      const graph = new DirectedAcyclicGraph(adjacencyList);

      adjacencyList.get("a")?.add("c");
      adjacencyList.set("c", new Set());

      expect(graph.topologicalSort()).toEqual(["a", "b"]);
    });

    test("throws when the initial adjacency list references a missing vertex", () => {
      expect(() => {
        new DirectedAcyclicGraph(
          createAdjacencyList([
            ["a", ["b"]],
          ]),
        );
      }).toThrow("vertex a has an edge to missing vertex b");
    });

    test("throws when the initial adjacency list contains a cycle", () => {
      expect(() => {
        new DirectedAcyclicGraph(
          createAdjacencyList([
            ["a", ["b"]],
            ["b", ["c"]],
            ["c", ["a"]],
          ]),
        );
      }).toThrow("Graph contains a cycle, topological sort is not possible");
    });

    test("throws when the initial adjacency list contains a self-cycle", () => {
      expect(() => {
        new DirectedAcyclicGraph(
          createAdjacencyList([
            ["a", ["a"]],
          ]),
        );
      }).toThrow("Graph contains a cycle, topological sort is not possible");
    });
  });

  describe("addVertex", () => {
    test("adds a new vertex", () => {
      const graph = new DirectedAcyclicGraph();

      expect(graph.addVertex("a")).toBe(true);
      expect(graph.topologicalSort()).toEqual(["a"]);
    });

    test("does not add a duplicate vertex", () => {
      const graph = new DirectedAcyclicGraph();

      expect(graph.addVertex("a")).toBe(true);
      expect(graph.addVertex("a")).toBe(false);
      expect(graph.topologicalSort()).toEqual(["a"]);
    });

    test("adds isolated vertices in insertion order", () => {
      const graph = new DirectedAcyclicGraph();

      graph.addVertex("a");
      graph.addVertex("b");
      graph.addVertex("c");

      expect(graph.topologicalSort()).toEqual(["a", "b", "c"]);
    });
  });

  describe("addEdge", () => {
    test("adds an edge between existing vertices", () => {
      const graph = new DirectedAcyclicGraph();

      graph.addVertex("a");
      graph.addVertex("b");

      expect(graph.addEdge("a", "b")).toBe(true);
      expect(graph.topologicalSort()).toEqual(["a", "b"]);
    });

    test("does not add a duplicate edge", () => {
      const graph = new DirectedAcyclicGraph();

      graph.addVertex("a");
      graph.addVertex("b");

      expect(graph.addEdge("a", "b")).toBe(true);
      expect(graph.addEdge("a", "b")).toBe(false);
      expect(graph.topologicalSort()).toEqual(["a", "b"]);
    });

    test("throws when adding an edge from a missing source vertex", () => {
      const graph = new DirectedAcyclicGraph();

      graph.addVertex("b");

      expect(() => graph.addEdge("a", "b")).toThrow(
        "Source vertex a does not exist in the graph",
      );

      expect(graph.topologicalSort()).toEqual(["b"]);
    });

    test("throws when adding an edge to a missing destination vertex", () => {
      const graph = new DirectedAcyclicGraph();

      graph.addVertex("a");

      expect(() => graph.addEdge("a", "b")).toThrow(
        "Destination vertex b does not exist in the graph",
      );

      expect(graph.topologicalSort()).toEqual(["a"]);
    });

    test("throws and leaves the graph valid when adding an edge would create a cycle", () => {
      const graph = new DirectedAcyclicGraph(
        createAdjacencyList([
          ["a", ["b"]],
          ["b", ["c"]],
          ["c", []],
        ]),
      );

      expect(() => graph.addEdge("c", "a")).toThrow(
        "Adding edge c -> a would create a cycle in the graph",
      );

      expect(graph.topologicalSort()).toEqual(["a", "b", "c"]);

      graph.addVertex("d");
      expect(graph.addEdge("c", "d")).toBe(true);

      const order = graph.topologicalSort();

      expect(order).toHaveLength(4);
      expect(new Set(order)).toEqual(new Set(["a", "b", "c", "d"]));
      expectValidTopologicalOrder(order, [
        ["a", "b"],
        ["b", "c"],
        ["c", "d"],
      ]);
    });

    test("throws when adding a self-edge", () => {
      const graph = new DirectedAcyclicGraph();

      graph.addVertex("a");

      expect(() => graph.addEdge("a", "a")).toThrow(
        "Adding edge a -> a would create a cycle in the graph",
      );

      expect(graph.topologicalSort()).toEqual(["a"]);
    });

    test("continues working after a failed cyclic edge addition", () => {
      const graph = new DirectedAcyclicGraph(
        createAdjacencyList([
          ["a", ["b"]],
          ["b", ["c"]],
          ["c", []],
          ["d", []],
        ]),
      );

      expect(() => graph.addEdge("c", "a")).toThrow(
        "Adding edge c -> a would create a cycle in the graph",
      );

      expect(graph.addEdge("c", "d")).toBe(true);

      const order = graph.topologicalSort();

      expect(order).toHaveLength(4);
      expect(new Set(order)).toEqual(new Set(["a", "b", "c", "d"]));
      expectValidTopologicalOrder(order, [
        ["a", "b"],
        ["b", "c"],
        ["c", "d"],
      ]);
    });

    test("allows an edge that requires recalculating the topological order", () => {
      const graph = new DirectedAcyclicGraph();

      graph.addVertex("a");
      graph.addVertex("b");

      expect(graph.topologicalSort()).toEqual(["a", "b"]);
      expect(graph.addEdge("b", "a")).toBe(true);
      expect(graph.topologicalSort()).toEqual(["b", "a"]);
    });
  });

  describe("topologicalSort", () => {
    test("returns vertices in topological order", () => {
      const edges = /** @type {Array<[string, string]>} */ ([
        ["build", "test"],
        ["build", "lint"],
        ["test", "package"],
        ["lint", "package"],
        ["package", "publish"],
      ]);

      const graph = new DirectedAcyclicGraph(
        createAdjacencyList([
          ["build", ["test", "lint"]],
          ["test", ["package"]],
          ["lint", ["package"]],
          ["package", ["publish"]],
          ["publish", []],
        ]),
      );

      const order = graph.topologicalSort();

      expect(order).toHaveLength(5);
      expect(new Set(order)).toEqual(
        new Set(["build", "test", "lint", "package", "publish"]),
      );
      expectValidTopologicalOrder(order, edges);
    });

    test("returns isolated vertices too", () => {
      const graph = new DirectedAcyclicGraph(
        createAdjacencyList([
          ["a", ["b"]],
          ["b", []],
          ["c", []],
        ]),
      );

      expect(graph.topologicalSort()).toEqual(["a", "c", "b"]);
    });

    test("returned topological order can be mutated without corrupting the graph", () => {
      const graph = new DirectedAcyclicGraph(
        createAdjacencyList([
          ["a", ["b"]],
          ["b", []],
        ]),
      );

      const order = graph.topologicalSort();

      order.reverse();
      order.push("fake");

      expect(graph.topologicalSort()).toEqual(["a", "b"]);
    });
  });
});

/**
 * @param {string[][]} actual
 * @param {string[][]} expected
 */
function expectLevelsToEqual(actual, expected) {
  expect(actual).toEqual(expected);
}

describe("DirectedAcyclicGraph.topologicalLevels", () => {
  test("returns an empty array for an empty graph", () => {
    const graph = new DirectedAcyclicGraph();

    expectLevelsToEqual(graph.topologicalLevels(), []);
  });

  test("puts a single vertex on level 0", () => {
    const graph = new DirectedAcyclicGraph();

    graph.addVertex("a");

    expectLevelsToEqual(graph.topologicalLevels(), [["a"]]);
  });

  test("puts disconnected vertices on level 0", () => {
    const graph = new DirectedAcyclicGraph();

    graph.addVertex("a");
    graph.addVertex("b");
    graph.addVertex("c");

    expectLevelsToEqual(graph.topologicalLevels(), [["a", "b", "c"]]);
  });

  test("puts a simple chain into separate levels", () => {
    const graph = new DirectedAcyclicGraph();

    graph.addVertex("a");
    graph.addVertex("b");
    graph.addVertex("c");

    graph.addEdge("a", "b");
    graph.addEdge("b", "c");

    expectLevelsToEqual(graph.topologicalLevels(), [["a"], ["b"], ["c"]]);
  });

  test("puts multiple starting vertices on level 0", () => {
    const graph = new DirectedAcyclicGraph();

    graph.addVertex("database");
    graph.addVertex("network");
    graph.addVertex("api");
    graph.addVertex("frontend");

    graph.addEdge("database", "api");
    graph.addEdge("network", "api");
    graph.addEdge("api", "frontend");

    expectLevelsToEqual(graph.topologicalLevels(), [
      ["database", "network"],
      ["api"],
      ["frontend"],
    ]);
  });

  test("puts a vertex with multiple dependencies one level after its deepest dependency", () => {
    const graph = new DirectedAcyclicGraph();

    graph.addVertex("a");
    graph.addVertex("b");
    graph.addVertex("c");
    graph.addVertex("d");

    graph.addEdge("a", "b");
    graph.addEdge("b", "c");
    graph.addEdge("a", "d");
    graph.addEdge("c", "d");

    expectLevelsToEqual(graph.topologicalLevels(), [["a"], ["b"], ["c"], ["d"]]);
  });

  test("allows a vertex with multiple level 0 dependencies to appear on level 1", () => {
    const graph = new DirectedAcyclicGraph();

    graph.addVertex("a");
    graph.addVertex("b");
    graph.addVertex("c");

    graph.addEdge("a", "c");
    graph.addEdge("b", "c");

    expectLevelsToEqual(graph.topologicalLevels(), [["a", "b"], ["c"]]);
  });

  test("keeps unrelated vertices at level 0", () => {
    const graph = new DirectedAcyclicGraph();

    graph.addVertex("a");
    graph.addVertex("b");
    graph.addVertex("c");
    graph.addVertex("d");

    graph.addEdge("a", "b");
    graph.addEdge("b", "c");

    expectLevelsToEqual(graph.topologicalLevels(), [["a", "d"], ["b"], ["c"]]);
  });

  test("handles branching edges", () => {
    const graph = new DirectedAcyclicGraph();

    graph.addVertex("a");
    graph.addVertex("b");
    graph.addVertex("c");
    graph.addVertex("d");

    graph.addEdge("a", "b");
    graph.addEdge("a", "c");
    graph.addEdge("b", "d");
    graph.addEdge("c", "d");

    expectLevelsToEqual(graph.topologicalLevels(), [["a"], ["b", "c"], ["d"]]);
  });

  test("updates levels after adding an edge that changes the cached topological order", () => {
    const graph = new DirectedAcyclicGraph();

    graph.addVertex("a");
    graph.addVertex("b");
    graph.addVertex("c");

    graph.addEdge("b", "c");
    graph.addEdge("a", "b");

    expectLevelsToEqual(graph.topologicalLevels(), [["a"], ["b"], ["c"]]);
  });

  test("returns levels from a constructor-provided adjacency list", () => {
    const graph = new DirectedAcyclicGraph(
      new Map([
        ["a", new Set(["b", "c"])],
        ["b", new Set(["d"])],
        ["c", new Set(["d"])],
        ["d", new Set()],
      ]),
    );

    expectLevelsToEqual(graph.topologicalLevels(), [["a"], ["b", "c"], ["d"]]);
  });

  test("does not mutate the graph", () => {
    const graph = new DirectedAcyclicGraph();

    graph.addVertex("a");
    graph.addVertex("b");
    graph.addVertex("c");

    graph.addEdge("a", "b");
    graph.addEdge("b", "c");

    const firstResult = graph.topologicalLevels();
    const secondResult = graph.topologicalLevels();

    expectLevelsToEqual(firstResult, [["a"], ["b"], ["c"]]);
    expectLevelsToEqual(secondResult, [["a"], ["b"], ["c"]]);
  });

  test("returns a new outer array each time", () => {
    const graph = new DirectedAcyclicGraph();

    graph.addVertex("a");

    const firstResult = graph.topologicalLevels();
    const secondResult = graph.topologicalLevels();

    expect(firstResult).not.toBe(secondResult);
    expect(firstResult).toEqual(secondResult);
  });
});