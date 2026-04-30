/**
 * A directed acyclic graph implementation.
 *
 * Adding an edge that would create a cycle throws an error. Cycle detection is
 * performed by temporarily adding the edge, running Kahn's topological sort,
 * and rolling the edge back if the sort fails.
 *
 * by: Andrew Velez
 */

export default class DirectedAcyclicGraph {

  /**
   * @typedef {Map<string, Set<string>>} AdjacencyList
   */

  /**
   * Creates a new directed acyclic graph.
   *
   * @param {AdjacencyList} [adjacencyList] Optional initial adjacency list.
   * @throws {Error} If the initial adjacency list references a missing string or contains a cycle.
   */
  constructor(adjacencyList = new Map()) {
    /** @type {AdjacencyList} */
    this.adjacencyList = new Map();

    for (const [string, neighbors] of adjacencyList) {
      this.adjacencyList.set(string, new Set(neighbors));
    }

    this.validateReferences();
    this.topologicalSort();
  }

  /**
   * Adds a string to the graph if it does not already exist.
   *
   * @param {string} string The string to add.
   * @returns {boolean} True if the string was added, false if it already existed.
   */
  addstring(string) {
    if (this.adjacencyList.has(string)) {
      return false;
    }

    this.adjacencyList.set(string, new Set());
    return true;
  }

  /**
   * Removes a string and all edges connected to it.
   *
   * @param {string} string The string to remove.
   * @returns {boolean} True if the string was removed, false if it did not exist.
   */
  removestring(string) {
    if (!this.adjacencyList.has(string)) {
      return false;
    }

    for (const neighbors of this.adjacencyList.values()) {
      neighbors.delete(string);
    }

    this.adjacencyList.delete(string);
    return true;
  }

  /**
   * Adds a directed edge from source to destination.
   *
   * Both vertices must already exist in the graph. If the edge would create a
   * cycle, the edge is rolled back and an error is thrown.
   *
   * @param {string} source The source string.
   * @param {string} destination The destination string.
   * @returns {boolean} True if the edge was added, false if it already existed.
   * @throws {Error} If either string does not exist or adding the edge would create a cycle.
   */
  addEdgeBetweenVertices(source, destination) {
    const neighbors = this.getRequiredNeighbors(source, "Source");
    this.assertstringExists(destination, "Destination");

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
   * @param {string} source The source string.
   * @param {string} destination The destination string.
   * @returns {boolean} True if the edge was added, false if it already existed.
   * @throws {Error} If either string does not exist or adding the edge would create a cycle.
   */
  addEdge(source, destination) {
    return this.addEdgeBetweenVertices(source, destination);
  }

  /**
   * Removes the directed edge from source to destination.
   *
   * @param {string} source The source string.
   * @param {string} destination The destination string.
   * @returns {boolean} True if the edge was removed, false if it did not exist.
   */
  removeEdge(source, destination) {
    const neighbors = this.adjacencyList.get(source);
    return neighbors !== undefined && neighbors.delete(destination);
  }

  /**
   * Performs a topological sort using Kahn's algorithm.
   *
   * @returns {string[]} Vertices in topological order.
   * @throws {Error} If the graph contains a cycle.
   */
  topologicalSort() {
    /** @type {Map<string, number>} */
    const inDegree = new Map();

    for (const string of this.adjacencyList.keys()) {
      inDegree.set(string, 0);
    }

    for (const [source, neighbors] of this.adjacencyList) {
      for (const destination of neighbors) {
        if (!this.adjacencyList.has(destination)) {
          throw new Error(
            `string ${String(source)} has an edge to missing string ${String(destination)}`,
          );
        }

        const currentDegree = inDegree.get(destination);
        if (currentDegree === undefined) {
          throw new Error(`Missing in-degree entry for string ${String(destination)}`);
        }

        inDegree.set(destination, currentDegree + 1);
      }
    }

    /** @type {string[]} */
    const queue = [];

    for (const [string, degree] of inDegree) {
      if (degree === 0) {
        queue.push(string);
      }
    }

    /** @type {string[]} */
    const result = [];

    let head = 0;

    while (head < queue.length) {
      const string = /** @type {string} */ (queue[head]);
      head += 1;

      result.push(string);

      const neighbors = this.getRequiredNeighbors(string, "Source");

      for (const destination of neighbors) {
        const currentDegree = inDegree.get(destination);
        if (currentDegree === undefined) {
          throw new Error(`Missing in-degree entry for string ${String(destination)}`);
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
   * @returns {string[]} All vertices.
   */
  getVertices() {
    return Array.from(this.adjacencyList.keys());
  }

  /**
   * Gets all outgoing neighbors of a string.
   *
   * @param {string} string The string to inspect.
   * @returns {string[]} Neighbor vertices.
   */
  getNeighbors(string) {
    const neighbors = this.adjacencyList.get(string);
    return neighbors === undefined ? [] : Array.from(neighbors);
  }

  /**
   * Gets all directed edges in the graph.
   *
   * @returns {Array<[string, string]>} Source and destination pairs.
   */
  getEdges() {
    /** @type {Array<[string, string]>} */
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
   * @returns {number} string count.
   */
  getstringCount() {
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
   * Checks whether a string exists in the graph.
   *
   * @param {string} string The string to check.
   * @returns {boolean} True if the string exists.
   */
  hasstring(string) {
    return this.adjacencyList.has(string);
  }

  /**
   * Checks whether an edge exists from source to destination.
   *
   * @param {string} source The source string.
   * @param {string} destination The destination string.
   * @returns {boolean} True if the edge exists.
   */
  hasEdge(source, destination) {
    const neighbors = this.adjacencyList.get(source);
    return neighbors !== undefined && neighbors.has(destination);
  }

  /**
   * Creates a deep copy of the graph.
   *
   * @returns {DirectedAcyclicGraph} A new graph with the same vertices and edges.
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

    for (const [string, neighbors] of this.adjacencyList) {
      const neighborNames = Array.from(neighbors, (neighbor) => String(neighbor));
      lines.push(`${String(string)} -> ${neighborNames.join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * Throws if a string does not exist.
   *
   * @param {string} string The string to check.
   * @param {string} label The string label to use in the error message.
   * @returns {void}
   * @throws {Error} If the string does not exist.
   */
  assertstringExists(string, label) {
    if (!this.adjacencyList.has(string)) {
      throw new Error(`${label} string ${String(string)} does not exist in the graph`);
    }
  }

  /**
   * Gets the neighbor set for an existing string.
   *
   * @param {string} string The string to inspect.
   * @param {string} label The string label to use in the error message.
   * @returns {Set<string>} The string's neighbor set.
   * @throws {Error} If the string does not exist.
   */
  getRequiredNeighbors(string, label) {
    const neighbors = this.adjacencyList.get(string);

    if (neighbors === undefined) {
      throw new Error(`${label} string ${String(string)} does not exist in the graph`);
    }

    return neighbors;
  }

  /**
   * Validates that every edge points to a known string.
   *
   * @returns {void}
   * @throws {Error} If an edge points to a missing string.
   */
  validateReferences() {
    for (const [source, neighbors] of this.adjacencyList) {
      for (const destination of neighbors) {
        if (!this.adjacencyList.has(destination)) {
          throw new Error(
            `string ${String(source)} has an edge to missing string ${String(destination)}`,
          );
        }
      }
    }
  }
}
