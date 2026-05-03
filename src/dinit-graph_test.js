import { describe, expect, test, spyOn } from "bun:test";
import * as fs from "node:fs";
import {
  parseLineProperties,
  parseFileProperties,
  addDependencies,
  serviceDirFromOptions
} from "./dinit-graph.js";
import DirectedAcyclicGraph from "./directed-acyclic-graph.js";

/**
 * @typedef {import("./dinit-graph.js").Dependency} Dependency
 */

describe("dinit-graph logic", () => {
  describe("parseLineProperties", () => {
    test("parses standard depends-on with =", () => {
      const result = parseLineProperties("depends-on = network");

      expect(result).toEqual({
        dependency: "depends-on",
        namedService: "network"
      });
    });

    test("parses standard depends-on with :", () => {
      const result = parseLineProperties("depends-on: network");

      expect(result).toEqual({
        dependency: "depends-on",
        namedService: "network"
      });
    });

    test("parses after dependency", () => {
      const result = parseLineProperties("after = logging");

      expect(result).toEqual({
        dependency: "after",
        namedService: "logging"
      });
    });

    test("parses before dependency", () => {
      const result = parseLineProperties("before = shutdown");

      expect(result).toEqual({
        dependency: "before",
        namedService: "shutdown"
      });
    });

    test("parses chain-to dependency", () => {
      const result = parseLineProperties("chain-to = next-service");

      expect(result).toEqual({
        dependency: "chain-to",
        namedService: "next-service"
      });
    });

    test("parses .d dependency", () => {
      const result = parseLineProperties("depends-on.d = boot.d");

      expect(result).toEqual({
        dependency: "depends-on.d",
        namedService: "boot.d"
      });
    });

    test("ignores trailing comments", () => {
      const result = parseLineProperties("depends-on = network # bring up network first");

      expect(result).toEqual({
        dependency: "depends-on",
        namedService: "network"
      });
    });

    test("returns undefined for unrelated property", () => {
      const result = parseLineProperties("command = /usr/bin/example");

      expect(result).toBeUndefined();
    });

    test("returns undefined for empty line", () => {
      const result = parseLineProperties("");

      expect(result).toBeUndefined();
    });

    test("returns undefined for comment line", () => {
      const result = parseLineProperties("# depends-on = network");

      expect(result).toBeUndefined();
    });
  });

  describe("parseFileProperties", () => {
    test("aggregates multiple dependencies from a file string and resolves names to absolute pathnames", () => {
      const mockContent = "depends-on = net\nafter = logging\ncommand = start";

      const readFileSpy = spyOn(fs, "readFileSync").mockReturnValue(mockContent);

      try {
        const props = parseFileProperties("/dummy/path/service");

        expect(props).toEqual([
          {
            dependency: "depends-on",
            namedService: "/dummy/path/net"
          },
          {
            dependency: "after",
            namedService: "/dummy/path/logging"
          }
        ]);
      } finally {
        readFileSpy.mockRestore();
      }
    });

    test("keeps absolute dependency names absolute", () => {
      const mockContent = "depends-on = /etc/dinit.d/network";

      const readFileSpy = spyOn(fs, "readFileSync").mockReturnValue(mockContent);

      try {
        const props = parseFileProperties("/dummy/path/service");

        expect(props).toEqual([
          {
            dependency: "depends-on",
            namedService: "/etc/dinit.d/network"
          }
        ]);
      } finally {
        readFileSpy.mockRestore();
      }
    });

    test("returns an empty array when no dependency properties exist", () => {
      const mockContent = "command = /bin/example\n# depends-on = ignored";

      const readFileSpy = spyOn(fs, "readFileSync").mockReturnValue(mockContent);

      try {
        const props = parseFileProperties("/dummy/path/service");

        expect(props).toEqual([]);
      } finally {
        readFileSpy.mockRestore();
      }
    });
  });

  describe("serviceDirFromOptions", () => {
    test("returns absolute real path from argument", () => {
      const realpathSpy = spyOn(fs, "realpathSync").mockReturnValue("/real/service/dir");

      try {
        const result = serviceDirFromOptions(["./services"]);

        expect(realpathSpy).toHaveBeenCalledWith("./services");
        expect(result).toBe("/real/service/dir");
      } finally {
        realpathSpy.mockRestore();
      }
    });

    test("exits on missing arguments", () => {
      const exitError = new Error("process.exit called");

      const exitSpy = spyOn(process, "exit").mockImplementation(() => {
        throw exitError;
      });

      const logSpy = spyOn(console, "log").mockImplementation(() => {});

      try {
        expect(() => serviceDirFromOptions([])).toThrow(exitError);
        expect(logSpy).toHaveBeenCalledWith("dinit-graph <service-directory>");
        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        exitSpy.mockRestore();
        logSpy.mockRestore();
      }
    });
  });

  describe("addDependencies", () => {
    test("adds normal dependency edges using absolute service pathnames", () => {
      const graph = new DirectedAcyclicGraph();

      const boot = "/services/boot";
      const network = "/services/network";

      /** @type {Map<string, Dependency[]>} */
      const allServiceProperties = new Map([
        [
          boot,
          [
            {
              dependency: "depends-on",
              namedService: network
            }
          ]
        ],
        [network, []]
      ]);

      addDependencies(graph, allServiceProperties, boot);

      expect(graph.topologicalLevels()).toEqual([
        [boot],
        [network]
      ]);
    });

    test("adds before dependency edge in reverse direction", () => {
      const graph = new DirectedAcyclicGraph();

      const boot = "/services/boot";
      const logging = "/services/logging";

      /** @type {Map<string, Dependency[]>} */
      const allServiceProperties = new Map([
        [
          boot,
          [
            {
              dependency: "before",
              namedService: logging
            }
          ]
        ],
        [logging, []]
      ]);

      addDependencies(graph, allServiceProperties, boot);

      expect(graph.topologicalLevels()).toEqual([
        [logging],
        [boot]
      ]);
    });

    test("adds chain-to dependency edge in reverse direction", () => {
      const graph = new DirectedAcyclicGraph();

      const boot = "/services/boot";
      const next = "/services/next";

      /** @type {Map<string, Dependency[]>} */
      const allServiceProperties = new Map([
        [
          boot,
          [
            {
              dependency: "chain-to",
              namedService: next
            }
          ]
        ],
        [next, []]
      ]);

      addDependencies(graph, allServiceProperties, boot);

      expect(graph.topologicalLevels()).toEqual([
        [next],
        [boot]
      ]);
    });

    test("adds edges even when dependency vertex already exists", () => {
      const graph = new DirectedAcyclicGraph();

      const boot = "/services/boot";
      const network = "/services/network";
      const logging = "/services/logging";

      /** @type {Map<string, Dependency[]>} */
      const allServiceProperties = new Map([
        [
          boot,
          [
            {
              dependency: "depends-on",
              namedService: network
            },
            {
              dependency: "depends-on",
              namedService: logging
            }
          ]
        ],
        [
          network,
          [
            {
              dependency: "depends-on",
              namedService: logging
            }
          ]
        ],
        [logging, []]
      ]);

      addDependencies(graph, allServiceProperties, boot);

      expect(graph.topologicalLevels()).toEqual([
        [boot],
        [network],
        [logging]
      ]);
    });

    test("expands .d dependency directories into dependency edges", () => {
      const graph = new DirectedAcyclicGraph();

      const boot = "/services/boot";
      const dependencyDir = "/services/boot.d";
      const childA = "/services/boot.d/a";
      const childB = "/services/boot.d/b";

      const readdirSpy = spyOn(fs, "readdirSync").mockReturnValue(
        /** @type {ReturnType<typeof fs.readdirSync>} */
        (/** @type {unknown} */
          ([
            {
              name: "a",
              parentPath: dependencyDir,
              isDirectory: () => false
            },
            {
              name: "b",
              parentPath: dependencyDir,
              isDirectory: () => false
            }
          ])
        )
      );

      try {
        /** @type {Map<string, Dependency[]>} */
        const allServiceProperties = new Map([
          [
            boot,
            [
              {
                dependency: "depends-on.d",
                namedService: dependencyDir
              }
            ]
          ],
          [childA, []],
          [childB, []]
        ]);

        addDependencies(graph, allServiceProperties, boot);

        expect(graph.topologicalLevels()).toEqual([
          [boot],
          [childA, childB]
        ]);
      } finally {
        readdirSpy.mockRestore();
      }
    });
  });
});