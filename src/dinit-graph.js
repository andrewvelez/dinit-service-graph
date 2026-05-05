#! /usr/bin/env bun
/**
 * dinit-graph: a tool for visualizing the dinit service dependency directed acyclic graph
 * by: Andrew Velez
 */


import * as fs from "node:fs";
import * as path from "node:path";
import DirectedAcyclicGraph from "./directed-acyclic-graph.js";


// region " Types "
/**
 * @readonly
 * @enum {string}
 */
const DEPENDENCY_TYPES = Object.freeze({
  DependsOn: "depends-on",
  DependsMs: "depends-ms",
  WaitsFor: "waits-for",
  DependsOnD: "depends-on.d",
  DependsMsD: "depends-ms.d",
  WaitsForD: "waits-for.d",
  After: "after",
  Before: "before",
  ChainTo: "chain-to"
});

const REGEX_PATTERN_DEP_PROPS = /^\s*(depends-on(?:[.]d)?|depends-ms(?:[.]d)?|waits-for(?:[.]d)?|after|before|chain-to)\s*[:=]\s*([^#\s]+)/;

/**
 * @typedef {typeof DEPENDENCY_TYPES[keyof typeof DEPENDENCY_TYPES]} DependencyKind
 * @typedef {{dependency: DependencyKind, namedService: string}} Dependency
 */
/** @type {ReadonlySet<string>} */
const DependencyKinds = new Set(Object.values(DEPENDENCY_TYPES));
// endregion


// region " Functions "
/**
 * @param {string} value
 * @returns {string}
 */
function toAbsolutePath(value) {
  return path.resolve(value);
}

/**
 * @param {string} serviceDir
 * @param {string} namedService
 * @returns {string}
 */
function resolveNamedService(serviceDir, namedService) {
  if (path.isAbsolute(namedService)) {
    return toAbsolutePath(namedService);
  }

  return toAbsolutePath(path.join(serviceDir, namedService));
}

/**
 * @param {fs.Dirent} dirent
 * @returns {string}
 */
function servicePathFromDirent(dirent) {
  return toAbsolutePath(path.join(dirent.parentPath, dirent.name));
}

/**
 * @param {string[]} args
 * @returns {string}
 * @exports
 */
export function serviceDirFromOptions(args) {
  const usage = "dinit-graph <service-directory>";

  if (args.length === 0 || args[0] === undefined) {
    console.log(usage);
    process.exit(1);
  }

  return toAbsolutePath(fs.realpathSync(args[0]));
}

/**
 * @param {string} value
 * @returns {value is DependencyKind}
 */
function isDependencyKind(value) {
  return DependencyKinds.has(value);
}

/**
 * Reads an entire file's contents and returns it as a utf-8 string.
 *
 * @param {string} pathToFile
 * @returns {string}
 */
function readFileContents(pathToFile) {
  try {
    return fs.readFileSync(pathToFile, "utf-8");
  } catch {
    throw new Error(`Could not read file: ${pathToFile}`);
  }
}

/**
 * Parses one service-property line.
 * This function does not resolve paths. It only parses syntax.
 *
 * @param {string} line
 * @returns {Dependency | undefined}
 * @exports
 */
export function parseLineProperties(line) {
  const results = line.match(REGEX_PATTERN_DEP_PROPS);

  if (results === null || results[1] === undefined || results[2] === undefined) {
    return undefined;
  }

  const dependency = results[1];

  if (!isDependencyKind(dependency)) {
    return undefined;
  }

  return {
    dependency,
    namedService: results[2]
  };
}

/**
 * Parses all dependency properties from one service file.
 * All returned namedService values are absolute pathnames.
 *
 * @param {string} serviceFilePath
 * @param {string} serviceDir
 * @returns {Dependency[]}
 * @exports
 */
export function parseFileProperties(serviceFilePath, serviceDir) {
  const absoluteServiceFilePath = toAbsolutePath(serviceFilePath);
  const absoluteServiceDir = toAbsolutePath(serviceDir);
  const contents = readFileContents(absoluteServiceFilePath);

  /** @type {Dependency[]} */
  const fileProperties = [];

  for (const line of contents.split("\n")) {
    const property = parseLineProperties(line);

    if (property !== undefined) {
      fileProperties.push({
        dependency: property.dependency,
        namedService: resolveNamedService(absoluteServiceDir, property.namedService)
      });
    }
  }

  return fileProperties;
}

/**
 * Gets all non-directory service files from a directory recursively.
 * All returned values are absolute pathnames.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function getFilesOfDir(dir) {
  const absoluteDir = toAbsolutePath(dir);

  try {
    return fs.readdirSync(absoluteDir, { withFileTypes: true, recursive: true })
      .filter(dirent => !dirent.isDirectory())
      .map(servicePathFromDirent);
  } catch (ex) {
    console.error("Exception while trying to read directory.", ex);
    throw ex;
  }
}

/**
 * Parses every service file in a directory.
 *
 * All map keys are absolute pathnames.
 * All dependency namedService values are absolute pathnames.
 *
 * @param {string} targetDir
 * @returns {Map<string, Dependency[]>}
 * @exports
 */
export function parseDirectoryProperties(targetDir) {
  const absoluteTargetDir = toAbsolutePath(targetDir);

  /** @type {Map<string, Dependency[]>} */
  const propMap = new Map();

  const serviceFiles = getFilesOfDir(absoluteTargetDir);

  for (const serviceFilePath of serviceFiles) {
    propMap.set(serviceFilePath, parseFileProperties(serviceFilePath, absoluteTargetDir));
  }

  return propMap;
}

/**
 * Adds one normal dependency edge.
 *
 * For dependency-like properties, the target must come before the source:
 *
 * target -> source
 *
 * @param {DirectedAcyclicGraph} depGraph
 * @param {string} sourceServicePath
 * @param {string} targetServicePath
 * @returns {boolean} True if the target vertex was new before the edge was added.
 */
function addDependencyEdge(depGraph, sourceServicePath, targetServicePath) {
  const targetWasNew = !depGraph.hasVertex(targetServicePath);
  depGraph.addEdge(targetServicePath, sourceServicePath);
  return targetWasNew;
}

/**
 * Adds one ordering edge for before-like properties.
 *
 * For before-like properties, the source must come before the target:
 *
 * source -> target
 *
 * @param {DirectedAcyclicGraph} depGraph
 * @param {string} sourceServicePath
 * @param {string} targetServicePath
 * @returns {boolean} True if the target vertex was new before the edge was added.
 */
function addBeforeEdge(depGraph, sourceServicePath, targetServicePath) {
  const targetWasNew = !depGraph.hasVertex(targetServicePath);
  depGraph.addEdge(sourceServicePath, targetServicePath);
  return targetWasNew;
}

/**
 * Adds the dependencies found in the serviceDir to the graph and, if needed,
 * calls itself recursively to add children.
 *
 * All vertices are absolute pathnames.
 *
 * @param {DirectedAcyclicGraph} depGraph
 * @param {Map<string, Dependency[]>} allServiceProperties
 * @param {string} serviceFilePath
 * @returns {DirectedAcyclicGraph}
 * @exports
 */
export function addDependencies(depGraph, allServiceProperties, serviceFilePath) {
  const absoluteServiceFilePath = toAbsolutePath(serviceFilePath);
  const deps = allServiceProperties.get(absoluteServiceFilePath);

  depGraph.addVertex(absoluteServiceFilePath);

  if (deps === undefined || deps.length === 0) {
    return depGraph;
  }

  for (const prop of deps) {
    const targetServicePath = toAbsolutePath(prop.namedService);

    if (
      prop.dependency === DEPENDENCY_TYPES.Before ||
      prop.dependency === DEPENDENCY_TYPES.ChainTo
    ) {
      const targetWasNew = addBeforeEdge(
        depGraph,
        absoluteServiceFilePath,
        targetServicePath
      );

      if (targetWasNew) {
        depGraph = addDependencies(depGraph, allServiceProperties, targetServicePath);
      }

      continue;
    }

    if (
      prop.dependency === DEPENDENCY_TYPES.DependsOnD ||
      prop.dependency === DEPENDENCY_TYPES.WaitsForD ||
      prop.dependency === DEPENDENCY_TYPES.DependsMsD
    ) {
      const serviceFiles = getFilesOfDir(targetServicePath);

      for (const childServicePath of serviceFiles) {
        const childWasNew = addDependencyEdge(
          depGraph,
          absoluteServiceFilePath,
          childServicePath
        );

        if (childWasNew) {
          depGraph = addDependencies(depGraph, allServiceProperties, childServicePath);
        }
      }

      continue;
    }

    const targetWasNew = addDependencyEdge(
      depGraph,
      absoluteServiceFilePath,
      targetServicePath
    );

    if (targetWasNew) {
      depGraph = addDependencies(depGraph, allServiceProperties, targetServicePath);
    }
  }

  return depGraph;
}

/**
 * Converts topological levels into a display string.
 *
 * @param {string[][]} levels
 * @returns {string}
 */
function topologicalLevelsToString(levels) {
  return levels
    .map((level, index) => `Level ${index}: ${level.join(", ")}`)
    .join("\n");
}
// endregion

// region " Cytoscape integration "
/**
 * @typedef {{
 *   data: {
 *     id: string,
 *     label?: string,
 *     source?: string,
 *     target?: string
 *   },
 *   position?: {
 *     x: number,
 *     y: number
 *   }
 * }} CytoscapeElement
 */

/**
 * Converts a service pathname to a display label.
 *
 * @param {string} servicePath
 * @param {string} serviceDir
 * @returns {string}
 */
function serviceLabel(servicePath, serviceDir) {
  return servicePath.replace(serviceDir, "") || servicePath;
}

/**
 * Converts a DAG into Cytoscape elements using the graph's topological levels
 * as fixed visual rows.
 *
 * @param {DirectedAcyclicGraph} depGraph
 * @param {string} serviceDir
 * @returns {CytoscapeElement[]}
 */
function graphToCytoscapeElements(depGraph, serviceDir) {
  const levels = depGraph.topologicalLevels();

  /** @type {CytoscapeElement[]} */
  const elements = [];

  const xSpacing = 260;
  const ySpacing = 120;

  for (let levelIndex = 0; levelIndex < levels.length; levelIndex += 1) {
    const level = levels[levelIndex];

    if (level === undefined) {
      continue;
    }

    for (let nodeIndex = 0; nodeIndex < level.length; nodeIndex += 1) {
      const servicePath = level[nodeIndex];

      if (servicePath === undefined) {
        continue;
      }

      elements.push({
        data: {
          id: servicePath,
          label: serviceLabel(servicePath, serviceDir)
        },
        position: {
          x: nodeIndex * xSpacing,
          y: levelIndex * ySpacing
        }
      });
    }
  }

  for (const [source, destination] of depGraph.edges()) {
    elements.push({
      data: {
        id: `${source}->${destination}`,
        source,
        target: destination
      }
    });
  }

  return elements;
}

/**
 * Escapes a string so it can be safely embedded inside an HTML script tag.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeScriptJson(value) {
  return value.replaceAll("</script", "<\\/script");
}

/**
 * Creates a standalone Cytoscape HTML document.
 *
 * @param {CytoscapeElement[]} elements
 * @returns {string}
 */
function cytoscapeHtml(elements) {
  const elementsJson = escapeScriptJson(JSON.stringify(elements, null, 2));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>dinit service graph</title>
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      font-family: sans-serif;
    }

    #cy {
      width: 100%;
      height: 100%;
      display: block;
    }
  </style>
</head>
<body>
  <div id="cy"></div>

  <script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
  <script>
    const elements = ${elementsJson};

    cytoscape({
      container: document.getElementById("cy"),
      elements,
      layout: {
        name: "preset"
      },
      style: [
        {
          selector: "node",
          style: {
            "label": "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "10px",
            "width": 190,
            "height": 36,
            "shape": "round-rectangle",
            "background-color": "#f5f5f5",
            "border-width": 1,
            "border-color": "#555"
          }
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "width": 2,
            "line-color": "#999",
            "target-arrow-color": "#999"
          }
        }
      ]
    });
  </script>
</body>
</html>`;
}
// endregion

// region " Main entry point "
/**
 * The main entrypoint for this CLI app, the command dinit-graph.
 */
function main_cli() {
  const serviceDir = serviceDirFromOptions(process.argv.slice(2));

  console.log("Parsing directory properties...");
  const allServiceProperties = parseDirectoryProperties(serviceDir);

  let depGraph = new DirectedAcyclicGraph();
  const bootService = path.join(serviceDir, "boot");

  console.log("Building graph...");
  depGraph = addDependencies(depGraph, allServiceProperties, bootService);

  let graphAsString = topologicalLevelsToString(depGraph.topologicalLevels());

  graphAsString = graphAsString.replaceAll(serviceDir, "");

  console.log(graphAsString);

  const cytoscapeElements = graphToCytoscapeElements(depGraph, serviceDir);
  const html = cytoscapeHtml(cytoscapeElements);
  const outputPath = path.join(process.cwd(), "dinit-service-graph.html");

  fs.writeFileSync(outputPath, html, "utf-8");

  console.log(`Wrote graph visualization to: ${outputPath}`);
}

// @ts-ignore
if (import.meta.main) {
  main_cli();
}
// endregion