/**
 * A directed acyclic graph implementation.
 *
 * Adding an edge that would create a cycle throws an error. Missing vertices are
 * added automatically by addEdge. If addEdge cannot complete, all changes made
 * by that call are rolled back.
 *
 * by: Andrew Velez
 */

export default class DirectedAcyclicGraph {
  /**
   * @typedef {Map<string, Set<string>>} AdjacencyList
   */

  /**
   * Internal representation of the graph.
   *
   * @type {AdjacencyList}
   */
  #adjacencyList = new Map();

  /**
   * Maps each vertex to its position in the current topological sort.
   *
   * @type {Map<string, number>}
   */
  #rankMap = new Map();

  /**
   * The current topological order of all vertices.
   *
   * @type {string[]}
   */
  #topologicalOrder = [];

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
   * Checks whether a vertex exists in the graph.
   *
   * @param {string} vertex The vertex identifier.
   * @returns {boolean} True if the vertex exists.
   */
  hasVertex(vertex) {
    return this.#adjacencyList.has(vertex);
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
   * Missing vertices are added automatically. If the edge would create a cycle,
   * the edge and any vertices added by this call are rolled back.
   *
   * @param {string} source The source vertex.
   * @param {string} destination The destination vertex.
   * @returns {boolean} True if the edge was added, false if it already existed.
   * @throws {Error} If adding the edge would create a cycle.
   */
  addEdge(source, destination) {
    const sourceAlreadyExisted = this.#adjacencyList.has(source);
    const destinationAlreadyExisted = this.#adjacencyList.has(destination);

    if (!sourceAlreadyExisted) {
      this.addVertex(source);
    }

    if (!destinationAlreadyExisted) {
      this.addVertex(destination);
    }

    const neighbors = this.#adjacencyList.get(source);

    if (neighbors === undefined) {
      throw new Error(`Source vertex ${String(source)} does not exist in the graph`);
    }

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

      if (!sourceAlreadyExisted) {
        this.#adjacencyList.delete(source);
      }

      if (!destinationAlreadyExisted) {
        this.#adjacencyList.delete(destination);
      }

      this.topologicalSort();

      throw new Error(
        `Adding edge ${String(source)} -> ${String(destination)} would create a cycle in the graph`,
      );
    }
  }

  /**
   * Returns all directed edges in the graph.
   *
   * @returns {Array<[string, string]>} Directed edges as [source, destination] pairs.
   */
  edges() {
    /** @type {Array<[string, string]>} */
    const result = [];

    for (const [source, destinations] of this.#adjacencyList) {
      for (const destination of destinations) {
        result.push([source, destination]);
      }
    }

    return result;
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
      const vertex = /** @type {string} */ (queue[head]);
      head += 1;

      result.push(vertex);

      const neighbors = this.#adjacencyList.get(vertex);

      if (neighbors === undefined) {
        continue;
      }

      for (const destination of neighbors) {
        const currentDegree = inDegree.get(destination);

        if (currentDegree === undefined) {
          continue;
        }

        const nextDegree = currentDegree - 1;
        inDegree.set(destination, nextDegree);

        if (nextDegree === 0) {
          queue.push(destination);
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

    return [...result];
  }

  /**
   * Groups vertices into topological dependency levels.
   *
   * Level 0 contains vertices with no incoming edges. Each following level
   * contains vertices whose dependencies appear in earlier levels.
   *
   * @returns {string[][]} Vertices grouped by topological level.
   */
  topologicalLevels() {
    /** @type {Map<string, number>} */
    const levelByVertex = new Map();

    /** @type {string[][]} */
    const levels = [];

    for (const source of this.#topologicalOrder) {
      const sourceLevel = levelByVertex.get(source) ?? 0;

      if (levels[sourceLevel] === undefined) {
        levels[sourceLevel] = [];
      }

      levels[sourceLevel].push(source);

      const neighbors = this.#adjacencyList.get(source);

      if (neighbors === undefined) {
        continue;
      }

      for (const destination of neighbors) {
        const currentDestinationLevel = levelByVertex.get(destination) ?? 0;
        const nextDestinationLevel = sourceLevel + 1;

        if (nextDestinationLevel > currentDestinationLevel) {
          levelByVertex.set(destination, nextDestinationLevel);
        }
      }
    }

    return levels.map(level => [...level]);
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