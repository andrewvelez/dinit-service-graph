/**
 * A directed acyclic graph implementation.
 *
 * Adding an edge that would create a cycle throws an error. Cycle detection is
 * performed incrementally: if the new edge respects the current topological order,
 * it is added instantly. Otherwise, Kahn's algorithm is run to validate and
 * update the sort order.
 *
 * by: Andrew Velez
 */

export default class DirectedAcyclicGraph {
  /**
   * Internal representation of the graph.
   * @type {Map<string, Set<string>>}
   */
  #adjacencyList = new Map();

  /**
   * Maps each vertex to its position in the current topological sort.
   * Used for O(1) cycle detection when adding edges.
   * @type {Map<string, number>}
   */
  #rankMap = new Map();

  /**
   * The current topological order of all vertices.
   * @type {string[]}
   */
  #topologicalOrder = [];

  /**
   * @typedef {Map<string, Set<string>>} AdjacencyList
   */

  /**
   * Creates a new directed acyclic graph.
   *
   * @param {AdjacencyList} [adjacencyList] Optional initial adjacency list.
   * @throws {Error} If the initial adjacency list references a missing vertex or contains a cycle.
   */
  constructor(adjacencyList = new Map()) {
    for (const [vertex, neighbors] of adjacencyList) {
      this.#adjacencyList.set(vertex, new Set(neighbors));
    }

    this.#validateReferences();
    this.topologicalSort();
  }

  /**
   * Adds a vertex to the graph if it does not already exist.
   *
   * @param {string} vertex The vertex identifier to add.
   * @returns {boolean} True if the vertex was added, false if it already existed.
   */
  addVertex(vertex) {
    if (this.#adjacencyList.has(vertex)) {
      return false;
    }

    this.#adjacencyList.set(vertex, new Set());
    this.#topologicalOrder.push(vertex);
    this.#rankMap.set(vertex, this.#topologicalOrder.length - 1);

    return true;
  }

  /**
   * Adds a directed edge from source to destination.
   *
   * Both vertices must already exist in the graph. If the edge would create a
   * cycle, the edge is rolled back and an error is thrown.
   *
   * @param {string} source The source vertex.
   * @param {string} destination The destination vertex.
   * @returns {boolean} True if the edge was added, false if it already existed.
   * @throws {Error} If either vertex does not exist or adding the edge would create a cycle.
   */
  addEdge(source, destination) {
    const neighbors = this.#getRequiredNeighbors(source, "Source");
    this.#assertVertexExists(destination, "Destination");

    if (neighbors.has(destination)) {
      return false;
    }

    const sourceRank = this.#rankMap.get(source);
    const destinationRank = this.#rankMap.get(destination);

    if (
      sourceRank !== undefined &&
      destinationRank !== undefined &&
      sourceRank < destinationRank
    ) {
      neighbors.add(destination);
      return true;
    }

    neighbors.add(destination);

    try {
      this.topologicalSort();
      return true;
    } catch {
      neighbors.delete(destination);
      this.topologicalSort();

      throw new Error(
        `Adding edge ${String(source)} -> ${String(destination)} would create a cycle in the graph`,
      );
    }
  }

  /**
   * Performs a topological sort using Kahn's algorithm and updates internal rankings.
   *
   * @returns {string[]} Vertices in topological order.
   * @throws {Error} If the graph contains a cycle.
   */
  topologicalSort() {
    /** @type {Map<string, number>} */
    const inDegree = new Map();

    for (const vertex of this.#adjacencyList.keys()) {
      inDegree.set(vertex, 0);
    }

    for (const [source, neighbors] of this.#adjacencyList) {
      for (const destination of neighbors) {
        const currentDegree = inDegree.get(destination);

        if (currentDegree === undefined) {
          throw new Error(
            `vertex ${String(source)} has an edge to missing vertex ${String(destination)}`,
          );
        }

        inDegree.set(destination, currentDegree + 1);
      }
    }

    /** @type {string[]} */
    const queue = [];

    for (const [vertex, degree] of inDegree) {
      if (degree === 0) {
        queue.push(vertex);
      }
    }

    /** @type {string[]} */
    const result = [];
    let head = 0;

    while (head < queue.length) {
      const vertex = /** @type {string} */ (queue[head++]);
      result.push(vertex);

      const neighbors = this.#adjacencyList.get(vertex);

      if (neighbors !== undefined) {
        for (const destination of neighbors) {
          const currentDegree = inDegree.get(destination);

          if (currentDegree !== undefined) {
            const nextDegree = currentDegree - 1;
            inDegree.set(destination, nextDegree);

            if (nextDegree === 0) {
              queue.push(destination);
            }
          }
        }
      }
    }

    if (result.length !== this.#adjacencyList.size) {
      throw new Error("Graph contains a cycle, topological sort is not possible");
    }

    this.#topologicalOrder = result;
    this.#rankMap.clear();

    result.forEach((vertex, index) => {
      this.#rankMap.set(vertex, index);
    });

    return result;
  }

  /**
   * Groups vertices into topological dependency levels.
   *
   * Level 0 contains vertices with no incoming edges.
   * Each following level contains vertices whose dependencies are satisfied by earlier levels.
   *
   * @returns {string[][]} Vertices grouped by topological level.
   * @throws {Error} If the graph contains a cycle.
   */
  topologicalLevels() {
    /** @type {Map<string, number>} */
    const inDegree = new Map();

    for (const vertex of this.#adjacencyList.keys()) {
      inDegree.set(vertex, 0);
    }

    for (const [source, neighbors] of this.#adjacencyList) {
      for (const destination of neighbors) {
        const currentDegree = inDegree.get(destination);

        if (currentDegree === undefined) {
          throw new Error(
            `vertex ${String(source)} has an edge to missing vertex ${String(destination)}`,
          );
        }

        inDegree.set(destination, currentDegree + 1);
      }
    }

    /** @type {string[]} */
    let currentLevel = [];

    for (const [vertex, degree] of inDegree) {
      if (degree === 0) {
        currentLevel.push(vertex);
      }
    }

    /** @type {string[][]} */
    const levels = [];

    let visitedCount = 0;

    while (currentLevel.length > 0) {
      levels.push(currentLevel);
      visitedCount += currentLevel.length;

      /** @type {string[]} */
      const nextLevel = [];

      for (const vertex of currentLevel) {
        const neighbors = this.#adjacencyList.get(vertex);

        if (neighbors === undefined) {
          continue;
        }

        for (const destination of neighbors) {
          const currentDegree = inDegree.get(destination);

          if (currentDegree !== undefined) {
            const nextDegree = currentDegree - 1;
            inDegree.set(destination, nextDegree);

            if (nextDegree === 0) {
              nextLevel.push(destination);
            }
          }
        }
      }

      currentLevel = nextLevel;
    }

    if (visitedCount !== this.#adjacencyList.size) {
      throw new Error("Graph contains a cycle, topological levels are not possible");
    }

    return levels;
  }

  /**
   * Returns a topological level string representation of the graph.
   *
   * @returns {string} A human-readable layered graph representation.
   * @throws {Error} If the graph contains a cycle.
   */
  toTopologicalLevelString() {
    return this.topologicalLevels()
      .map((level, index) => `Level ${index}: ${level.join(", ")}`)
      .join("\n");
  }

  /**
   * Throws if a vertex does not exist.
   *
   * @param {string} vertex The vertex identifier.
   * @param {string} label Label for error message.
   * @throws {Error} If the vertex does not exist.
   */
  #assertVertexExists(vertex, label) {
    if (!this.#adjacencyList.has(vertex)) {
      throw new Error(`${label} vertex ${String(vertex)} does not exist in the graph`);
    }
  }

  /**
   * Gets the neighbor set for an existing vertex.
   *
   * @param {string} vertex The vertex identifier.
   * @param {string} label Label for error message.
   * @returns {Set<string>} The vertex's neighbor set.
   * @throws {Error} If the vertex does not exist.
   */
  #getRequiredNeighbors(vertex, label) {
    const neighbors = this.#adjacencyList.get(vertex);

    if (neighbors === undefined) {
      throw new Error(`${label} vertex ${String(vertex)} does not exist in the graph`);
    }

    return neighbors;
  }

  /**
   * Validates that every edge points to a known vertex.
   *
   * @throws {Error} If an edge points to a missing vertex.
   */
  #validateReferences() {
    for (const [source, neighbors] of this.#adjacencyList) {
      for (const destination of neighbors) {
        if (!this.#adjacencyList.has(destination)) {
          throw new Error(
            `vertex ${String(source)} has an edge to missing vertex ${String(destination)}`,
          );
        }
      }
    }
  }
}