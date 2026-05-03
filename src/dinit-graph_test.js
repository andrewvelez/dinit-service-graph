import { describe, expect, test, mock, beforeEach, spyOn } from "bun:test";
import * as fs from "node:fs";
import { 
  parseLineProperties, 
  parseFileProperties, 
  addDependencies,
  serviceDirFromOptions 
} from "./dinit-graph.js";
import DirectedAcyclicGraph from "./directed-acyclic-graph.js";

/** 
 * Import types for the compiler
 * @typedef {import('./dinit-graph.js').DependencyKind} DependencyKind
 * @typedef {import('./dinit-graph.js').Dependency} Dependency
 */

// Mocking node:fs
mock.module("node:fs", () => ({
  readFileSync: () => "",
  readdirSync: () => [],
  // Give 'p' a type to fix the 'implicit any' error
  realpathSync: (/** @type {string} */ p) => p,
}));

describe("dinit-graph logic", () => {

  describe("parseLineProperties", () => {
    test("parses standard depends-on with =", () => {
      const result = parseLineProperties("depends-on = network");
      expect(result).toEqual({ dependency: "depends-on", namedService: "network" });
    });
    // ... other regex tests
  });

  describe("parseFileProperties", () => {
    test("aggregates multiple dependencies from a file string", () => {
      const mockContent = "depends-on = net\nafter = logging\ncommand = start";
      
      // Correct way to mock return value in Bun:
      spyOn(fs, "readFileSync").mockReturnValue(mockContent);

      const props = parseFileProperties("/dummy/path");
      
      // Use optional chaining or check length to satisfy strict null checks
      expect(props.length).toBe(2);
      if (props[0] && props[1]) {
        expect(props[0].dependency).toBe("depends-on");
        expect(props[1].dependency).toBe("after");
      }
    });
  });

  // describe("addDependencies (Graph Building Logic)", () => {
  //   /** @type {DirectedAcyclicGraph} */
  //   let graph;

  //   beforeEach(() => {
  //     graph = new DirectedAcyclicGraph();
  //   });

  //   test("adds a basic 'depends-on' relationship", () => {
  //     const serviceA = "/services/A";
  //     const serviceB = "B";
      
  //     /** 
  //      * We must explicitly type this Map so the compiler knows the string 
  //      * "depends-on" is a DependencyKind union member.
  //      * @type {Map<string, Dependency[]>} 
  //      */
  //     const mockProps = new Map([
  //       [serviceA, [{ dependency: /** @type {DependencyKind} */ ("depends-on"), namedService: serviceB }]],
  //       [serviceB, []]
  //     ]);

  //     graph.addVertex(serviceA);
  //     addDependencies(graph, mockProps, serviceA);

  //     const levels = graph.topologicalLevels();
  //     expect(levels[0]).toContain("B");
  //     expect(levels[1]).toContain(serviceA);
  //   });
    
  //   // Repeat the cast: /** @type {DependencyKind} */ ("after") for the other tests...
  // });

  describe("serviceDirFromOptions", () => {
    test("exits on missing arguments", () => {
      // Use the standalone spyOn from bun:test
      const exitSpy = spyOn(process, "exit").mockImplementation(() => { return /** @type {never} */ (undefined); });
      const logSpy = spyOn(console, "log").mockImplementation(() => {});
      
      serviceDirFromOptions([]);
      
      expect(exitSpy).toHaveBeenCalledWith(1);
      
      exitSpy.mockRestore();
      logSpy.mockRestore();
    });
  });
});