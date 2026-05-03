#! /usr/bin/env bun

/**
 * dinit-graph: a tool for visualizing the dinit service dependency directed acyclic graph
 * by: Andrew Velez
 */

import * as fs from "node:fs";
import * as path from "node:path";
import DirectedAcyclicGraph from "./directed-acyclic-graph.js";

//region "Types"

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

const REGEX_PATTERN_DEP_PROPS = /^\s*(depends-on|depends-ms|waits-for|depends-on\.d|depends-ms\.d|waits-for\.d|after|before|chain-to)\s*[:=]\s*([^#\s]+.*?)(?:\s+|#|$)/;

/**
 * @typedef {typeof DEPENDENCY_TYPES[keyof typeof DEPENDENCY_TYPES]} DependencyKind
 * @typedef {{dependency: DependencyKind, namedService: string}} Dependency
 */

//endregion "Types"

//region "Path helpers"

/**
 * @param {string} value
 * @returns {string}
 */
function toAbsolutePath(value) {
  return path.resolve(value);
}

/**
 * @param {fs.Dirent} dirent
 * @returns {string}
 */
function servicePathFromDirent(dirent) {
  return toAbsolutePath(path.join(dirent.parentPath, dirent.name));
}

/**
 * Resolves a service name found inside a service file to an absolute pathname.
 *
 * @param {string} sourceFilePath
 * @param {string} namedService
 * @returns {string}
 */
function resolveNamedService(sourceFilePath, namedService) {
  if (path.isAbsolute(namedService)) {
    return toAbsolutePath(namedService);
  }

  return toAbsolutePath(path.join(path.dirname(sourceFilePath), namedService));
}

//endregion "Path helpers"

//region "Functions"

/**
 * @param {string[]} args
 * @returns {string}
 * @exports
 */
export function serviceDirFromOptions(args) {
  const usage = "dinit-graph <service-directory>";

  if (!args || args.length === 0 || args[0] === undefined) {
    console.log(usage);
    process.exit(1);
  }

  return toAbsolutePath(fs.realpathSync(args[0]));
}

/** @type {ReadonlySet<string>} */
const DependencyKinds = new Set(Object.values(DEPENDENCY_TYPES));

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
 * @param {string} line
 * @returns {Dependency | undefined}
 * @exports
 */
export function parseLineProperties(line) {
  const results = line.match(REGEX_PATTERN_DEP_PROPS);

  if (!results || results[1] === undefined || results[2] === undefined) {
    return undefined;
  }

  const dependency = results[1];
  const namedService = results[2];

  if (!isDependencyKind(dependency)) {
    return undefined;
  }

  return {
    dependency,
    namedService
  };
}

/**
 * Parses all dependency properties from one service file.
 * All returned namedService values are absolute pathnames.
 * @param {string} serviceFilePath
 * @returns {Dependency[]}
 * @exports
 */
export function parseFileProperties(serviceFilePath) {
  const absoluteServiceFilePath = toAbsolutePath(serviceFilePath);
  const contents = readFileContents(absoluteServiceFilePath);

  /** @type {Dependency[]} */
  const fileProperties = [];

  for (const line of contents.split("\n")) {
    const property = parseLineProperties(line);

    if (property !== undefined) {
      fileProperties.push({
        dependency: property.dependency,
        namedService: resolveNamedService(absoluteServiceFilePath, property.namedService)
      });
    }
  }

  return fileProperties;
}

/**
 * Gets all non-directory service files from a directory recursively.
 * All returned values are absolute pathnames.
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
  /** @type {Map<string, Dependency[]>} */
  const propMap = new Map();

  const serviceFiles = getFilesOfDir(targetDir);

  for (const serviceFilePath of serviceFiles) {
    propMap.set(serviceFilePath, parseFileProperties(serviceFilePath));
  }

  return propMap;
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

  if (!deps || deps.length === 0) {
    return depGraph;
  }

  for (const prop of deps.values()) {
    const targetServicePath = toAbsolutePath(prop.namedService);

    if (
      prop.dependency === DEPENDENCY_TYPES.Before ||
      prop.dependency === DEPENDENCY_TYPES.ChainTo
    ) {
      const wasAdded = depGraph.addVertex(targetServicePath);

      depGraph.addEdge(targetServicePath, absoluteServiceFilePath);

      if (wasAdded) {
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

      for (const childServicePath of serviceFiles.values()) {
        const wasAdded = depGraph.addVertex(childServicePath);

        depGraph.addEdge(absoluteServiceFilePath, childServicePath);

        if (wasAdded) {
          depGraph = addDependencies(depGraph, allServiceProperties, childServicePath);
        }
      }

      continue;
    }

    const wasAdded = depGraph.addVertex(targetServicePath);

    depGraph.addEdge(absoluteServiceFilePath, targetServicePath);

    if (wasAdded) {
      depGraph = addDependencies(depGraph, allServiceProperties, targetServicePath);
    }
  }

  return depGraph;
}

//endregion "Functions"

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

  let graphAsString = depGraph.toTopologicalLevelString();

  graphAsString = graphAsString.replaceAll(serviceDir, "");

  console.log(graphAsString);
}

// @ts-ignore
if (import.meta.main) {
  main_cli();
}