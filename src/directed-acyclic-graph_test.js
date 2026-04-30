// directed-acyclic-graph.test.js
import { describe, it, expect, beforeEach } from "bun:test";
import DirectedAcyclicGraph from "./directed-acyclic-graph";

/**
 * @typedef {import("./directed-acyclic-graph").default<*>} DirectedAcyclicGraphType
 */

/**
 * Test suite for the DirectedAcyclicGraph class.
 */
describe("DirectedAcyclicGraph", () => {
  /**
   * Graph instance used for testing.
   * @type {DirectedAcyclicGraph<string>}
   */
  let graph;

  /**
   * Set up a fresh graph before each test.
   * @returns {void}
   */
  beforeEach(() => {
    graph = new DirectedAcyclicGraph();
  });

  /**
   * Tests for the constructor.
   */
  describe("constructor", () => {
    /**
     * Test that the constructor creates an empty graph.
     * @returns {void}
     */
    it("should create an empty graph", () => {
      expect(graph.getVertexCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);
      expect(graph.getVertices()).toEqual([]);
      expect(graph.getEdges()).toEqual([]);
    });

    /**
     * Test that the constructor initializes a graph from an adjacency list.
     * @returns {void}
     */
    it("should create a graph from an existing adjacency list", () => {
      /** @type {Map<string, Set<string>>} */
      const adjacencyList = new Map([
        ["A", new Set(["B", "C"])],
        ["B", new Set(["C"])],
        ["C", new Set()],
      ]);

      /** @type {DirectedAcyclicGraph<string>} */
      const g = new DirectedAcyclicGraph(adjacencyList);
      expect(g.getVertexCount()).toBe(3);
      expect(g.getEdgeCount()).toBe(3);
      expect(g.getVertices().sort()).toEqual(["A", "B", "C"]);
      expect(g.hasEdge("A", "B")).toBe(true);
      expect(g.hasEdge("A", "C")).toBe(true);
      expect(g.hasEdge("B", "C")).toBe(true);
    });

    /**
     * Test that the constructor throws for cyclic adjacency lists.
     * @returns {void}
     */
    it("should throw error if initial adjacency list contains a cycle", () => {
      /** @type {Map<string, Set<string>>} */
      const adjacencyList = new Map([
        ["A", new Set(["B"])],
        ["B", new Set(["C"])],
        ["C", new Set(["A"])],
      ]);

      expect(() => new DirectedAcyclicGraph(adjacencyList)).toThrow(
        "Graph contains a cycle, topological sort is not possible"
      );
    });

    /**
     * Test that the constructor throws for missing vertex references.
     * @returns {void}
     */
    it("should throw error if initial adjacency list references missing vertices", () => {
      /** @type {Map<string, Set<string>>} */
      const adjacencyList = new Map([
        ["A", new Set(["B"])],
        // B is missing
      ]);

      expect(() => new DirectedAcyclicGraph(adjacencyList)).toThrow(
        "Vertex A has an edge to missing vertex B"
      );
    });

    /**
     * Test that the constructor creates an independent copy of the adjacency list.
     * @returns {void}
     */
    it("should create an independent copy of the adjacency list", () => {
      /** @type {Map<string, Set<string>>} */
      const adjacencyList = new Map([["A", new Set(["B"])]]);
      /** @type {DirectedAcyclicGraph<string>} */
      const g = new DirectedAcyclicGraph(adjacencyList);

      // Modify the original map
      adjacencyList.set("C", new Set());
      
      expect(g.hasVertex("C")).toBe(false);
    });
  });

  /**
   * Tests for the addVertex method.
   */
  describe("addVertex", () => {
    /**
     * Test adding a new vertex.
     * @returns {void}
     */
    it("should add a new vertex and return true", () => {
      /** @type {boolean} */
      const result = graph.addVertex("A");
      expect(result).toBe(true);
      expect(graph.hasVertex("A")).toBe(true);
      expect(graph.getVertexCount()).toBe(1);
    });

    /**
     * Test that adding a duplicate vertex returns false.
     * @returns {void}
     */
    it("should return false if vertex already exists", () => {
      graph.addVertex("A");
      /** @type {boolean} */
      const result = graph.addVertex("A");
      expect(result).toBe(false);
      expect(graph.getVertexCount()).toBe(1);
    });

    /**
     * Test adding multiple vertices.
     * @returns {void}
     */
    it("should add multiple vertices", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      expect(graph.getVertexCount()).toBe(3);
    });

    /**
     * Test adding vertices of different types.
     * @returns {void}
     */
    it("should handle vertices of different types", () => {
      /** @type {DirectedAcyclicGraph<number|string|{id: number}>} */
      const mixedGraph = new DirectedAcyclicGraph();
      mixedGraph.addVertex(1);
      mixedGraph.addVertex("string");
      mixedGraph.addVertex({ id: 1 });
      expect(mixedGraph.getVertexCount()).toBe(3);
    });
  });

  /**
   * Tests for the removeVertex method.
   */
  describe("removeVertex", () => {
    /**
     * Set up a graph with multiple vertices.
     * @returns {void}
     */
    beforeEach(() => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
    });

    /**
     * Test removing an existing vertex.
     * @returns {void}
     */
    it("should remove a vertex and return true", () => {
      /** @type {boolean} */
      const result = graph.removeVertex("A");
      expect(result).toBe(true);
      expect(graph.hasVertex("A")).toBe(false);
      expect(graph.getVertexCount()).toBe(2);
    });

    /**
     * Test removing a non-existent vertex returns false.
     * @returns {void}
     */
    it("should return false if vertex does not exist", () => {
      /** @type {boolean} */
      const result = graph.removeVertex("D");
      expect(result).toBe(false);
    });

    /**
     * Test that removing a vertex removes all connected edges.
     * @returns {void}
     */
    it("should remove all edges connected to the deleted vertex", () => {
      graph.addEdge("A", "B");
      graph.addEdge("A", "C");
      graph.addEdge("B", "C");

      graph.removeVertex("A");

      expect(graph.hasEdge("A", "B")).toBe(false);
      expect(graph.hasEdge("A", "C")).toBe(false);
      expect(graph.hasEdge("B", "C")).toBe(true);
      expect(graph.getEdgeCount()).toBe(1);
    });

    /**
     * Test that removing a vertex also removes incoming edges.
     * @returns {void}
     */
    it("should remove incoming edges to the deleted vertex", () => {
      graph.addEdge("A", "B");
      graph.addEdge("A", "C");

      graph.removeVertex("B");

      expect(graph.hasEdge("A", "B")).toBe(false);
      expect(graph.hasEdge("A", "C")).toBe(true);
    });
  });

  /**
   * Tests for the addEdge and addEdgeBetweenVertices methods.
   */
  describe("addEdge / addEdgeBetweenVertices", () => {
    /**
     * Set up a graph with multiple vertices.
     * @returns {void}
     */
    beforeEach(() => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
    });

    /**
     * Test adding a valid edge.
     * @returns {void}
     */
    it("should add an edge and return true", () => {
      /** @type {boolean} */
      const result = graph.addEdge("A", "B");
      expect(result).toBe(true);
      expect(graph.hasEdge("A", "B")).toBe(true);
      expect(graph.getEdgeCount()).toBe(1);
    });

    /**
     * Test that addEdge and addEdgeBetweenVertices are aliases.
     * @returns {void}
     */
    it("should be aliases of each other", () => {
      /** @type {boolean} */
      const result1 = graph.addEdge("A", "B");
      graph.removeEdge("A", "B");
      /** @type {boolean} */
      const result2 = graph.addEdgeBetweenVertices("A", "B");
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(graph.hasEdge("A", "B")).toBe(true);
    });

    /**
     * Test adding a duplicate edge returns false.
     * @returns {void}
     */
    it("should return false if edge already exists", () => {
      graph.addEdge("A", "B");
      /** @type {boolean} */
      const result = graph.addEdge("A", "B");
      expect(result).toBe(false);
      expect(graph.getEdgeCount()).toBe(1);
    });

    /**
     * Test that adding an edge with a non-existent source throws.
     * @returns {void}
     */
    it("should throw error if source vertex does not exist", () => {
      expect(() => graph.addEdge("D", "A")).toThrow(
        "Source vertex D does not exist in the graph"
      );
    });

    /**
     * Test that adding an edge with a non-existent destination throws.
     * @returns {void}
     */
    it("should throw error if destination vertex does not exist", () => {
      expect(() => graph.addEdge("A", "D")).toThrow(
        "Destination vertex D does not exist in the graph"
      );
    });

    /**
     * Test that adding a cycle-creating edge throws.
     * @returns {void}
     */
    it("should throw error if edge would create a cycle", () => {
      graph.addEdge("A", "B");
      graph.addEdge("B", "C");

      expect(() => graph.addEdge("C", "A")).toThrow(
        "Adding edge C -> A would create a cycle in the graph"
      );
    });

    /**
     * Test that edge addition is rolled back when a cycle is detected.
     * @returns {void}
     */
    it("should roll back edge addition when a cycle is detected", () => {
      graph.addEdge("A", "B");
      graph.addEdge("B", "C");

      try {
        graph.addEdge("C", "A");
      } catch (/** @type {*} */ e) {
        // Expected error
      }

      expect(graph.hasEdge("C", "A")).toBe(false);
      expect(graph.getEdgeCount()).toBe(2);
    });

    /**
     * Test that self-loops always create cycles.
     * @returns {void}
     */
    it("should allow adding self-loop if it doesn't create a cycle (which it always does)", () => {
      expect(() => graph.addEdge("A", "A")).toThrow();
      expect(graph.hasEdge("A", "A")).toBe(false);
    });

    /**
     * Test complex valid edge additions.
     * @returns {void}
     */
    it("should handle complex valid edge additions", () => {
      graph.addEdge("A", "B");
      graph.addEdge("A", "C");
      graph.addEdge("B", "C");

      expect(graph.getEdgeCount()).toBe(3);
      expect(graph.hasEdge("A", "B")).toBe(true);
      expect(graph.hasEdge("A", "C")).toBe(true);
      expect(graph.hasEdge("B", "C")).toBe(true);
    });

    /**
     * Test cycle detection in more complex graphs.
     * @returns {void}
     */
    it("should detect cycles in more complex graphs", () => {
      graph.addVertex("D");
      graph.addEdge("A", "B");
      graph.addEdge("B", "C");
      graph.addEdge("A", "D");
      graph.addEdge("D", "B");

      expect(() => graph.addEdge("C", "D")).toThrow();
    });
  });

  /**
   * Tests for the removeEdge method.
   */
  describe("removeEdge", () => {
    /**
     * Set up a graph with an edge.
     * @returns {void}
     */
    beforeEach(() => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addEdge("A", "B");
    });

    /**
     * Test removing an existing edge.
     * @returns {void}
     */
    it("should remove an edge and return true", () => {
      /** @type {boolean} */
      const result = graph.removeEdge("A", "B");
      expect(result).toBe(true);
      expect(graph.hasEdge("A", "B")).toBe(false);
      expect(graph.getEdgeCount()).toBe(0);
    });

    /**
     * Test removing a non-existent edge returns false.
     * @returns {void}
     */
    it("should return false if edge does not exist", () => {
      /** @type {boolean} */
      const result = graph.removeEdge("A", "C");
      expect(result).toBe(false);
    });

    /**
     * Test removing an edge with a non-existent source returns false.
     * @returns {void}
     */
    it("should return false if source vertex does not exist", () => {
      /** @type {boolean} */
      const result = graph.removeEdge("D", "A");
      expect(result).toBe(false);
    });

    /**
     * Test that removing an edge doesn't affect other edges.
     * @returns {void}
     */
    it("should not affect other edges", () => {
      graph.addVertex("C");
      graph.addEdge("A", "C");

      graph.removeEdge("A", "B");

      expect(graph.hasEdge("A", "C")).toBe(true);
      expect(graph.getEdgeCount()).toBe(1);
    });
  });

  /**
   * Tests for the topologicalSort method.
   */
  describe("topologicalSort", () => {
    /**
     * Test topological sort on an empty graph.
     * @returns {void}
     */
    it("should return an empty array for an empty graph", () => {
      /** @type {string[]} */
      const result = graph.topologicalSort();
      expect(result).toEqual([]);
    });

    /**
     * Test topological sort on a single vertex graph.
     * @returns {void}
     */
    it("should return single vertex for a graph with one vertex", () => {
      graph.addVertex("A");
      /** @type {string[]} */
      const result = graph.topologicalSort();
      expect(result).toEqual(["A"]);
    });

    /**
     * Test topological sort on a simple DAG.
     * @returns {void}
     */
    it("should return correct topological order for a simple DAG", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addEdge("A", "B");
      graph.addEdge("B", "C");

      /** @type {string[]} */
      const sorted = graph.topologicalSort();
      expect(sorted).toEqual(["A", "B", "C"]);
    });

    /**
     * Test topological sort on a complex DAG.
     * @returns {void}
     */
    it("should return correct topological order for a more complex DAG", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addVertex("D");
      graph.addVertex("E");

      graph.addEdge("A", "B");
      graph.addEdge("A", "C");
      graph.addEdge("B", "D");
      graph.addEdge("C", "D");
      graph.addEdge("D", "E");

      /** @type {string[]} */
      const sorted = graph.topologicalSort();
      expect(sorted.indexOf("A")).toBe(0);
      expect(sorted.indexOf("E")).toBe(4);
      expect(sorted.indexOf("B")).toBeLessThan(sorted.indexOf("D"));
      expect(sorted.indexOf("C")).toBeLessThan(sorted.indexOf("D"));
      expect(sorted.indexOf("D")).toBeLessThan(sorted.indexOf("E"));
    });

    /**
     * Test topological sort with multiple source vertices.
     * @returns {void}
     */
    it("should handle multiple source vertices", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addEdge("A", "C");
      graph.addEdge("B", "C");

      /** @type {string[]} */
      const sorted = graph.topologicalSort();
      expect(sorted.indexOf("A")).toBeLessThan(sorted.indexOf("C"));
      expect(sorted.indexOf("B")).toBeLessThan(sorted.indexOf("C"));
    });

    /**
     * Test topological sort with multiple sink vertices.
     * @returns {void}
     */
    it("should handle multiple sink vertices", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addEdge("A", "B");
      graph.addEdge("A", "C");

      /** @type {string[]} */
      const sorted = graph.topologicalSort();
      expect(sorted[0]).toBe("A");
    });

    /**
     * Test that topological sort throws for cyclic graphs.
     * @returns {void}
     */
    it("should throw error for a cyclic graph", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addEdge("A", "B");
      graph.addEdge("B", "C");
      graph.addEdge("C", "A"); // This shouldn't be possible via addEdge, but we can test sort directly

      // We need to create a cyclic graph differently to test this
      /** @type {DirectedAcyclicGraph<string>} */
      const cyclicGraph = new DirectedAcyclicGraph();
      cyclicGraph.addVertex("A");
      cyclicGraph.addVertex("B");
      cyclicGraph.addVertex("C");
      
      /** @type {Map<string, Set<string>>} */
      const adjacencyList = new Map([
        ["A", new Set(["B"])],
        ["B", new Set(["C"])],
        ["C", new Set(["A"])],
      ]);

      expect(() => new DirectedAcyclicGraph(adjacencyList)).toThrow(
        "Graph contains a cycle, topological sort is not possible"
      );
    });
  });

  /**
   * Tests for the getVertices method.
   */
  describe("getVertices", () => {
    /**
     * Test getVertices on an empty graph.
     * @returns {void}
     */
    it("should return empty array for an empty graph", () => {
      /** @type {string[]} */
      const result = graph.getVertices();
      expect(result).toEqual([]);
    });

    /**
     * Test getVertices returns all vertices.
     * @returns {void}
     */
    it("should return all vertices in the graph", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");

      /** @type {string[]} */
      const vertices = graph.getVertices();
      expect(vertices.sort()).toEqual(["A", "B", "C"]);
    });

    /**
     * Test that getVertices returns a new array each time.
     * @returns {void}
     */
    it("should return a new array each time", () => {
      graph.addVertex("A");
      /** @type {string[]} */
      const arr1 = graph.getVertices();
      /** @type {string[]} */
      const arr2 = graph.getVertices();
      expect(arr1).toEqual(arr2);
      expect(arr1).not.toBe(arr2);
    });
  });

  /**
   * Tests for the getNeighbors method.
   */
  describe("getNeighbors", () => {
    /**
     * Set up a graph with edges.
     * @returns {void}
     */
    beforeEach(() => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addEdge("A", "B");
      graph.addEdge("A", "C");
    });

    /**
     * Test getting neighbors of a vertex with edges.
     * @returns {void}
     */
    it("should return neighbors of a vertex", () => {
      /** @type {string[]} */
      const neighbors = graph.getNeighbors("A");
      expect(neighbors.sort()).toEqual(["B", "C"]);
    });

    /**
     * Test getting neighbors of a vertex with no edges.
     * @returns {void}
     */
    it("should return empty array for a vertex with no edges", () => {
      /** @type {string[]} */
      const neighbors = graph.getNeighbors("B");
      expect(neighbors).toEqual([]);
    });

    /**
     * Test getting neighbors of a non-existent vertex.
     * @returns {void}
     */
    it("should return empty array for a non-existent vertex", () => {
      /** @type {string[]} */
      const neighbors = graph.getNeighbors("D");
      expect(neighbors).toEqual([]);
    });
  });

  /**
   * Tests for the getEdges method.
   */
  describe("getEdges", () => {
    /**
     * Test getEdges on an empty graph.
     * @returns {void}
     */
    it("should return empty array for an empty graph", () => {
      /** @type {Array<[string, string]>} */
      const edges = graph.getEdges();
      expect(edges).toEqual([]);
    });

    /**
     * Test getEdges returns all edges.
     * @returns {void}
     */
    it("should return all edges in the graph", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addEdge("A", "B");
      graph.addEdge("A", "C");
      graph.addEdge("B", "C");

      /** @type {Array<[string, string]>} */
      const edges = graph.getEdges();
      expect(edges).toContainEqual(["A", "B"]);
      expect(edges).toContainEqual(["A", "C"]);
      expect(edges).toContainEqual(["B", "C"]);
      expect(edges.length).toBe(3);
    });

    /**
     * Test that getEdges returns a new array each time.
     * @returns {void}
     */
    it("should return a new array each time", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addEdge("A", "B");

      /** @type {Array<[string, string]>} */
      const arr1 = graph.getEdges();
      /** @type {Array<[string, string]>} */
      const arr2 = graph.getEdges();
      expect(arr1).toEqual(arr2);
      expect(arr1).not.toBe(arr2);
    });
  });

  /**
   * Tests for the getVertexCount method.
   */
  describe("getVertexCount", () => {
    /**
     * Test vertex count on an empty graph.
     * @returns {void}
     */
    it("should return 0 for an empty graph", () => {
      expect(graph.getVertexCount()).toBe(0);
    });

    /**
     * Test vertex count after adding vertices.
     * @returns {void}
     */
    it("should return correct count after adding vertices", () => {
      graph.addVertex("A");
      expect(graph.getVertexCount()).toBe(1);

      graph.addVertex("B");
      expect(graph.getVertexCount()).toBe(2);

      // Adding duplicate should not increase count
      graph.addVertex("A");
      expect(graph.getVertexCount()).toBe(2);
    });

    /**
     * Test vertex count after removing vertices.
     * @returns {void}
     */
    it("should return correct count after removing vertices", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.removeVertex("A");
      expect(graph.getVertexCount()).toBe(1);
    });
  });

  /**
   * Tests for the getEdgeCount method.
   */
  describe("getEdgeCount", () => {
    /**
     * Test edge count on an empty graph.
     * @returns {void}
     */
    it("should return 0 for an empty graph", () => {
      expect(graph.getEdgeCount()).toBe(0);
    });

    /**
     * Test edge count after adding edges.
     * @returns {void}
     */
    it("should return correct count after adding edges", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");

      graph.addEdge("A", "B");
      expect(graph.getEdgeCount()).toBe(1);

      graph.addEdge("A", "C");
      expect(graph.getEdgeCount()).toBe(2);

      // Adding duplicate should not increase count
      graph.addEdge("A", "B");
      expect(graph.getEdgeCount()).toBe(2);
    });

    /**
     * Test edge count after removing edges.
     * @returns {void}
     */
    it("should return correct count after removing edges", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addEdge("A", "B");
      graph.addEdge("A", "C");

      graph.removeEdge("A", "B");
      expect(graph.getEdgeCount()).toBe(1);
    });

    /**
     * Test edge count after removing vertices.
     * @returns {void}
     */
    it("should return correct count after removing vertices", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addEdge("A", "B");

      graph.removeVertex("A");
      expect(graph.getEdgeCount()).toBe(0);
    });
  });

  /**
   * Tests for the hasVertex method.
   */
  describe("hasVertex", () => {
    /**
     * Test checking for a non-existent vertex.
     * @returns {void}
     */
    it("should return false for a non-existent vertex", () => {
      expect(graph.hasVertex("A")).toBe(false);
    });

    /**
     * Test checking for an existing vertex.
     * @returns {void}
     */
    it("should return true for an existing vertex", () => {
      graph.addVertex("A");
      expect(graph.hasVertex("A")).toBe(true);
    });

    /**
     * Test checking for a removed vertex.
     * @returns {void}
     */
    it("should return false after vertex is removed", () => {
      graph.addVertex("A");
      graph.removeVertex("A");
      expect(graph.hasVertex("A")).toBe(false);
    });
  });

  /**
   * Tests for the hasEdge method.
   */
  describe("hasEdge", () => {
    /**
     * Set up a graph with an edge.
     * @returns {void}
     */
    beforeEach(() => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addEdge("A", "B");
    });

    /**
     * Test checking for an existing edge.
     * @returns {void}
     */
    it("should return true for an existing edge", () => {
      expect(graph.hasEdge("A", "B")).toBe(true);
    });

    /**
     * Test checking for a non-existent edge.
     * @returns {void}
     */
    it("should return false for a non-existent edge", () => {
      expect(graph.hasEdge("B", "A")).toBe(false);
      expect(graph.hasEdge("A", "C")).toBe(false);
    });

    /**
     * Test checking for an edge with a non-existent source.
     * @returns {void}
     */
    it("should return false for a non-existent source vertex", () => {
      expect(graph.hasEdge("C", "A")).toBe(false);
    });

    /**
     * Test checking for a removed edge.
     * @returns {void}
     */
    it("should return false after edge is removed", () => {
      graph.removeEdge("A", "B");
      expect(graph.hasEdge("A", "B")).toBe(false);
    });
  });

  /**
   * Tests for the clone method.
   */
  describe("clone", () => {
    /**
     * Test cloning an empty graph.
     * @returns {void}
     */
    it("should create an empty graph clone", () => {
      /** @type {DirectedAcyclicGraph<string>} */
      const clone = graph.clone();
      expect(clone.getVertexCount()).toBe(0);
      expect(clone.getEdgeCount()).toBe(0);
      expect(clone).not.toBe(graph);
    });

    /**
     * Test that clone creates a deep copy with same data.
     * @returns {void}
     */
    it("should create a deep copy with the same vertices and edges", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addEdge("A", "B");
      graph.addEdge("A", "C");

      /** @type {DirectedAcyclicGraph<string>} */
      const clone = graph.clone();
      expect(clone.getVertexCount()).toBe(3);
      expect(clone.getEdgeCount()).toBe(2);
      expect(clone.hasEdge("A", "B")).toBe(true);
      expect(clone.hasEdge("A", "C")).toBe(true);
    });

    /**
     * Test that clone is independent of the original.
     * @returns {void}
     */
    it("should create an independent copy", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addEdge("A", "B");

      /** @type {DirectedAcyclicGraph<string>} */
      const clone = graph.clone();

      // Modify original
      graph.addVertex("C");
      graph.addEdge("A", "C");

      expect(clone.hasVertex("C")).toBe(false);
      expect(clone.getEdgeCount()).toBe(1);
    });

    /**
     * Test that original is independent of the clone.
     * @returns {void}
     */
    it("should not affect the original when clone is modified", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addEdge("A", "B");

      /** @type {DirectedAcyclicGraph<string>} */
      const clone = graph.clone();
      clone.addVertex("C");
      clone.addEdge("A", "C");

      expect(graph.hasVertex("C")).toBe(false);
      expect(graph.getEdgeCount()).toBe(1);
    });
  });

  /**
   * Tests for the clear method.
   */
  describe("clear", () => {
    /**
     * Test clearing an empty graph.
     * @returns {void}
     */
    it("should clear an empty graph without error", () => {
      graph.clear();
      expect(graph.getVertexCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);
    });

    /**
     * Test clearing a populated graph.
     * @returns {void}
     */
    it("should remove all vertices and edges", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addEdge("A", "B");
      graph.addEdge("B", "C");

      graph.clear();

      expect(graph.getVertexCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);
      expect(graph.getVertices()).toEqual([]);
      expect(graph.getEdges()).toEqual([]);
    });

    /**
     * Test that graph can be used after clearing.
     * @returns {void}
     */
    it("should allow adding vertices after clearing", () => {
      graph.addVertex("A");
      graph.clear();
      graph.addVertex("B");

      expect(graph.getVertexCount()).toBe(1);
      expect(graph.hasVertex("B")).toBe(true);
    });
  });

  /**
   * Tests for the toString method.
   */
  describe("toString", () => {
    /**
     * Test toString on an empty graph.
     * @returns {void}
     */
    it("should return an empty string for an empty graph", () => {
      expect(graph.toString()).toBe("");
    });

    /**
     * Test toString on a graph with vertices but no edges.
     * @returns {void}
     */
    it("should return a string representation for vertices without edges", () => {
      graph.addVertex("A");
      graph.addVertex("B");

      /** @type {string} */
      const result = graph.toString();
      expect(result).toContain("A -> ");
      expect(result).toContain("B -> ");
    });

    /**
     * Test toString on a graph with edges.
     * @returns {void}
     */
    it("should return a correct string representation with edges", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addEdge("A", "B");
      graph.addEdge("A", "C");

      /** @type {string} */
      const result = graph.toString();
      expect(result).toContain("A -> B, C");
    });
  });

  /**
   * Integration tests and edge cases.
   */
  describe("edge cases and integration tests", () => {
    /**
     * Test handling a large number of vertices and edges.
     * @returns {void}
     */
    it("should handle a large number of vertices and edges", () => {
      /** @type {number} */
      const vertices = 100;
      for (let i = 0; i < vertices; i++) {
        graph.addVertex(i.toString());
      }

      // Create a linear chain
      for (let i = 0; i < vertices - 1; i++) {
        graph.addEdge(i.toString(), (i + 1).toString());
      }

      expect(graph.getVertexCount()).toBe(vertices);
      expect(graph.getEdgeCount()).toBe(vertices - 1);
      
      /** @type {string[]} */
      const sorted = graph.topologicalSort();
      expect(sorted.length).toBe(vertices);
      for (let i = 0; i < vertices; i++) {
        expect(sorted[i]).toBe(i.toString());
      }
    });

    /**
     * Test handling diamond-shaped graphs.
     * @returns {void}
     */
    it("should handle diamond-shaped graphs", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addVertex("D");

      graph.addEdge("A", "B");
      graph.addEdge("A", "C");
      graph.addEdge("B", "D");
      graph.addEdge("C", "D");

      /** @type {string[]} */
      const sorted = graph.topologicalSort();
      expect(sorted[0]).toBe("A");
      expect(sorted[3]).toBe("D");
      expect(sorted.indexOf("B")).toBeLessThan(sorted.indexOf("D"));
      expect(sorted.indexOf("C")).toBeLessThan(sorted.indexOf("D"));
    });

    /**
     * Test handling disconnected components.
     * @returns {void}
     */
    it("should handle disconnected components", () => {
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addVertex("D");

      graph.addEdge("A", "B");
      // C and D are disconnected from A and B

      expect(graph.getVertexCount()).toBe(4);
      expect(graph.getEdgeCount()).toBe(1);
      
      /** @type {string[]} */
      const sorted = graph.topologicalSort();
      expect(sorted).toContain("A");
      expect(sorted).toContain("B");
      expect(sorted).toContain("C");
      expect(sorted).toContain("D");
      expect(sorted.indexOf("A")).toBeLessThan(sorted.indexOf("B"));
    });

    /**
     * Test handling vertices with complex types.
     * @returns {void}
     */
    it("should handle vertices with complex types", () => {
      /** @type {{id: number, name: string}} */
      const obj1 = { id: 1, name: "first" };
      /** @type {{id: number, name: string}} */
      const obj2 = { id: 2, name: "second" };
      /** @type {{id: number, name: string}} */
      const obj3 = { id: 3, name: "third" };

      /** @type {DirectedAcyclicGraph<{id: number, name: string}>} */
      const objectGraph = new DirectedAcyclicGraph();
      objectGraph.addVertex(obj1);
      objectGraph.addVertex(obj2);
      objectGraph.addVertex(obj3);
      objectGraph.addEdge(obj1, obj2);
      objectGraph.addEdge(obj2, obj3);

      expect(objectGraph.hasVertex(obj1)).toBe(true);
      expect(objectGraph.hasEdge(obj1, obj2)).toBe(true);
      
      /** @type {Array<{id: number, name: string}>} */
      const sorted = objectGraph.topologicalSort();
      expect(sorted[0]).toBe(obj1);
      expect(sorted[1]).toBe(obj2);
      expect(sorted[2]).toBe(obj3);
    });

    /**
     * Test that DAG invariants are maintained through multiple operations.
     * @returns {void}
     */
    it("should maintain DAG invariants through multiple operations", () => {
      // Build a complex DAG
      graph.addVertex("A");
      graph.addVertex("B");
      graph.addVertex("C");
      graph.addVertex("D");
      graph.addVertex("E");

      graph.addEdge("A", "B");
      graph.addEdge("A", "C");
      graph.addEdge("B", "D");
      graph.addEdge("C", "D");
      graph.addEdge("D", "E");

      // Remove and re-add vertices and edges
      graph.removeEdge("A", "C");
      graph.addEdge("A", "C"); // Should work because DAG still maintained

      expect(graph.getEdgeCount()).toBe(4);
      
      // Try to add edge that would create cycle
      expect(() => graph.addEdge("E", "A")).toThrow();
      
      // Add new valid edge
      graph.addEdge("C", "E");
      expect(graph.getEdgeCount()).toBe(5);
    });

    /**
     * Test string representation with objects that have custom toString.
     * @returns {void}
     */
    it("should handle string representation of objects", () => {
      /** @type {{toString: function(): string}} */
      const obj = { toString: () => "CustomVertex" };
      
      /** @type {DirectedAcyclicGraph<{toString: function(): string}>} */
      const objGraph = new DirectedAcyclicGraph();
      objGraph.addVertex(obj);
      expect(objGraph.toString()).toBe("CustomVertex -> ");
    });
  });
});