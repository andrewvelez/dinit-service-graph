/**
 * A directed acyclic graph implementation.
 *
 * Adding an edge that would create a cycle throws an error. Cycle detection is
 * performed by temporarily adding the edge, running Kahn's topological sort,
 * and rolling the edge back if the sort fails.
 *
 * by: Andrew Velez
 */

/**
 * @template Vertex
 * @typedef {Map<Vertex, Set<Vertex>>} AdjacencyList
 */

/**
 * @template Vertex
 */
class DirectedAcyclicGraph {
  /**
   * Creates a new directed acyclic graph.
   *
   * @param {AdjacencyList<Vertex>} [adjacencyList] Optional initial adjacency list.
   * @throws {Error} If the initial adjacency list references a missing vertex or contains a cycle.
   */
  constructor(adjacencyList = new Map()) {
    /** @type {AdjacencyList<Vertex>} */
    this.adjacencyList = new Map();

    for (const [vertex, neighbors] of adjacencyList) {
      this.adjacencyList.set(vertex, new Set(neighbors));
    }

    this.validateReferences();
    this.topologicalSort();
  }

  /**
   * Adds a vertex to the graph if it does not already exist.
   *
   * @param {Vertex} vertex The vertex to add.
   * @returns {boolean} True if the vertex was added, false if it already existed.
   */
  addVertex(vertex) {
    if (this.adjacencyList.has(vertex)) {
      return false;
    }

    this.adjacencyList.set(vertex, new Set());
    return true;
  }

  /**
   * Removes a vertex and all edges connected to it.
   *
   * @param {Vertex} vertex The vertex to remove.
   * @returns {boolean} True if the vertex was removed, false if it did not exist.
   */
  removeVertex(vertex) {
    if (!this.adjacencyList.has(vertex)) {
      return false;
    }

    for (const neighbors of this.adjacencyList.values()) {
      neighbors.delete(vertex);
    }

    this.adjacencyList.delete(vertex);
    return true;
  }

  /**
   * Adds a directed edge from source to destination.
   *
   * Both vertices must already exist in the graph. If the edge would create a
   * cycle, the edge is rolled back and an error is thrown.
   *
   * @param {Vertex} source The source vertex.
   * @param {Vertex} destination The destination vertex.
   * @returns {boolean} True if the edge was added, false if it already existed.
   * @throws {Error} If either vertex does not exist or adding the edge would create a cycle.
   */
  addEdgeBetweenVertices(source, destination) {
    const neighbors = this.getRequiredNeighbors(source, "Source");
    this.assertVertexExists(destination, "Destination");

    if (neighbors.has(destination)) {
      return false;
    }

    neighbors.add(destination);

    try {
      this.topologicalSort();
      return true;
    } catch {
      neighbors.delete(destination);
      throw new Error(
        `Adding edge ${String(source)} -> ${String(destination)} would create a cycle in the graph`,
      );
    }
  }

  /**
   * Adds a directed edge from source to destination.
   *
   * @param {Vertex} source The source vertex.
   * @param {Vertex} destination The destination vertex.
   * @returns {boolean} True if the edge was added, false if it already existed.
   * @throws {Error} If either vertex does not exist or adding the edge would create a cycle.
   */
  addEdge(source, destination) {
    return this.addEdgeBetweenVertices(source, destination);
  }

  /**
   * Removes the directed edge from source to destination.
   *
   * @param {Vertex} source The source vertex.
   * @param {Vertex} destination The destination vertex.
   * @returns {boolean} True if the edge was removed, false if it did not exist.
   */
  removeEdge(source, destination) {
    const neighbors = this.adjacencyList.get(source);
    return neighbors !== undefined && neighbors.delete(destination);
  }

  /**
   * Performs a topological sort using Kahn's algorithm.
   *
   * @returns {Vertex[]} Vertices in topological order.
   * @throws {Error} If the graph contains a cycle.
   */
  topologicalSort() {
    /** @type {Map<Vertex, number>} */
    const inDegree = new Map();

    for (const vertex of this.adjacencyList.keys()) {
      inDegree.set(vertex, 0);
    }

    for (const [source, neighbors] of this.adjacencyList) {
      for (const destination of neighbors) {
        if (!this.adjacencyList.has(destination)) {
          throw new Error(
            `Vertex ${String(source)} has an edge to missing vertex ${String(destination)}`,
          );
        }

        const currentDegree = inDegree.get(destination);
        if (currentDegree === undefined) {
          throw new Error(`Missing in-degree entry for vertex ${String(destination)}`);
        }

        inDegree.set(destination, currentDegree + 1);
      }
    }

    /** @type {Vertex[]} */
    const queue = [];

    for (const [vertex, degree] of inDegree) {
      if (degree === 0) {
        queue.push(vertex);
      }
    }

    /** @type {Vertex[]} */
    const result = [];

    let head = 0;

    while (head < queue.length) {
      const vertex = /** @type {Vertex} */ (queue[head]);
      head += 1;

      result.push(vertex);

      const neighbors = this.getRequiredNeighbors(vertex, "Source");

      for (const destination of neighbors) {
        const currentDegree = inDegree.get(destination);
        if (currentDegree === undefined) {
          throw new Error(`Missing in-degree entry for vertex ${String(destination)}`);
        }

        const nextDegree = currentDegree - 1;
        inDegree.set(destination, nextDegree);

        if (nextDegree === 0) {
          queue.push(destination);
        }
      }
    }

    if (result.length !== this.adjacencyList.size) {
      throw new Error("Graph contains a cycle, topological sort is not possible");
    }

    return result;
  }

  /**
   * Gets all vertices in the graph.
   *
   * @returns {Vertex[]} All vertices.
   */
  getVertices() {
    return Array.from(this.adjacencyList.keys());
  }

  /**
   * Gets all outgoing neighbors of a vertex.
   *
   * @param {Vertex} vertex The vertex to inspect.
   * @returns {Vertex[]} Neighbor vertices.
   */
  getNeighbors(vertex) {
    const neighbors = this.adjacencyList.get(vertex);
    return neighbors === undefined ? [] : Array.from(neighbors);
  }

  /**
   * Gets all directed edges in the graph.
   *
   * @returns {Array<[Vertex, Vertex]>} Source and destination pairs.
   */
  getEdges() {
    /** @type {Array<[Vertex, Vertex]>} */
    const edges = [];

    for (const [source, neighbors] of this.adjacencyList) {
      for (const destination of neighbors) {
        edges.push([source, destination]);
      }
    }

    return edges;
  }

  /**
   * Gets the number of vertices in the graph.
   *
   * @returns {number} Vertex count.
   */
  getVertexCount() {
    return this.adjacencyList.size;
  }

  /**
   * Gets the number of edges in the graph.
   *
   * @returns {number} Edge count.
   */
  getEdgeCount() {
    let count = 0;

    for (const neighbors of this.adjacencyList.values()) {
      count += neighbors.size;
    }

    return count;
  }

  /**
   * Checks whether a vertex exists in the graph.
   *
   * @param {Vertex} vertex The vertex to check.
   * @returns {boolean} True if the vertex exists.
   */
  hasVertex(vertex) {
    return this.adjacencyList.has(vertex);
  }

  /**
   * Checks whether an edge exists from source to destination.
   *
   * @param {Vertex} source The source vertex.
   * @param {Vertex} destination The destination vertex.
   * @returns {boolean} True if the edge exists.
   */
  hasEdge(source, destination) {
    const neighbors = this.adjacencyList.get(source);
    return neighbors !== undefined && neighbors.has(destination);
  }

  /**
   * Creates a deep copy of the graph.
   *
   * @returns {DirectedAcyclicGraph<Vertex>} A new graph with the same vertices and edges.
   */
  clone() {
    return new DirectedAcyclicGraph(this.adjacencyList);
  }

  /**
   * Removes all vertices and edges from the graph.
   *
   * @returns {void}
   */
  clear() {
    this.adjacencyList.clear();
  }

  /**
   * Returns a string representation of the graph.
   *
   * @returns {string} String representation of the graph.
   */
  toString() {
    /** @type {string[]} */
    const lines = [];

    for (const [vertex, neighbors] of this.adjacencyList) {
      const neighborNames = Array.from(neighbors, (neighbor) => String(neighbor));
      lines.push(`${String(vertex)} -> ${neighborNames.join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * Throws if a vertex does not exist.
   *
   * @param {Vertex} vertex The vertex to check.
   * @param {string} label The vertex label to use in the error message.
   * @returns {void}
   * @throws {Error} If the vertex does not exist.
   */
  assertVertexExists(vertex, label) {
    if (!this.adjacencyList.has(vertex)) {
      throw new Error(`${label} vertex ${String(vertex)} does not exist in the graph`);
    }
  }

  /**
   * Gets the neighbor set for an existing vertex.
   *
   * @param {Vertex} vertex The vertex to inspect.
   * @param {string} label The vertex label to use in the error message.
   * @returns {Set<Vertex>} The vertex's neighbor set.
   * @throws {Error} If the vertex does not exist.
   */
  getRequiredNeighbors(vertex, label) {
    const neighbors = this.adjacencyList.get(vertex);

    if (neighbors === undefined) {
      throw new Error(`${label} vertex ${String(vertex)} does not exist in the graph`);
    }

    return neighbors;
  }

  /**
   * Validates that every edge points to a known vertex.
   *
   * @returns {void}
   * @throws {Error} If an edge points to a missing vertex.
   */
  validateReferences() {
    for (const [source, neighbors] of this.adjacencyList) {
      for (const destination of neighbors) {
        if (!this.adjacencyList.has(destination)) {
          throw new Error(
            `Vertex ${String(source)} has an edge to missing vertex ${String(destination)}`,
          );
        }
      }
    }
  }
}

export default DirectedAcyclicGraph;