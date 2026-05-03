#! /usr/bin/env bun

/**
 * dinit-graph: a tool for visualizing the dinit service dependency directed acyclic graph
 * by: Andrew Velez
 */

import { Glob } from "bun";
import * as fs from "node:fs";
import * as path from "node:path";
import DirectedAcyclicGraph from "./directed-acyclic-graph.js";

//region "Types"
/**
 * @readonly
 * @enum(string)
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

const REGEX_PATTERN_DEP_PROPS = `^\\s*(depends-on|depends-ms|waits-for|depends-on\\.d|depends-ms\\.d|waits-for\\.d|after|before|chain-to)\\s*[:=]\\s*([^#\\s]+.*?)(?:\\s+|#|$)`;

/**
 * @typedef {typeof DEPENDENCY_TYPES[keyof typeof DEPENDENCY_TYPES]} DependencyKind
 * @typedef {{dependency: DependencyKind, namedService: string}} Dependency
 */
//endregion "Types"

//region "Functions"

/**
 * @param {string[]} args
 * @returns {string}
 * @exports
 */
export function serviceDirFromOptions(args) {
  let usage = `dinit-graph <service-directory>`;

  if (!args || args.length == 0 || args[0] === undefined) {
    console.log(usage);
    process.exit(1);
  }
  let filename = fs.realpathSync(args[0]);

  return filename;
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
 * Reads an entire file's contents and returns as a utf-8 string
 * @param {string} pathToFile
 * @returns {string}
 */
function readFileContents(pathToFile) {
  try {
    let contents = fs.readFileSync(pathToFile, "utf-8");
    return contents;
  } catch (e) {
    throw new Error("Could not read file.");
  }
}

/**
 * Parses the regex per line
 * @param {string} line 
 * @returns {Dependency | undefined}
 * @exports
 */
export function parseLineProperties(line) {
  let property;

  try {
    const results = line.match(REGEX_PATTERN_DEP_PROPS);
    if (results && results[1] && results[2]) {
      property = /** @type {Dependency} */ ({ dependency: results[1], namedService: results[2] });
    } else {
      property = undefined;
    }
  } catch (ex) {
    property = undefined;
  }

  return property;
}

/**
 * Process all non-directory files in a directory recursively
 * @param {string} absPath - The directory path to scan
 * @returns {Dependency[]}
 * @exports
 */
export function parseFileProperties(absPath) {
  /** @type {Dependency[]} */
  let fileProperties = [];
  /** @type {Dependency | undefined} */
  let newProperty;
  /** @type {string} */
  let newPath;

  let contents = readFileContents(absPath);

  for (let line of contents.split('\n')) {
    newProperty = parseLineProperties(line);
    if (newProperty) {
      newPath = absPath.substring(0, absPath.lastIndexOf("/"));
      newPath = path.join(newPath, newProperty.namedService);
      newProperty.namedService = newPath;
      fileProperties.push(newProperty);
    }
  }

  return fileProperties;
}

/**
 * Gets the service files from the dir
 * @param {string} dir 
 * @returns {fs.Dirent[]}
 */
function getFilesOfDir(dir) {
  let files = [];
  try {
    files = fs.readdirSync(dir, { withFileTypes: true, recursive: true })
      .filter(dirent => !dirent.isDirectory());
  } catch (ex) {
    console.error("Exception while trying to read directory.", ex);
    throw ex;
  }
  return files;
}

/**
 * @param {string} targetDir
 * @returns {Map<string, Dependency[]>}
 */
export function parseDirectoryProperties(targetDir) {
  /** @type {Map<string, Dependency[]>} */
  let propMap = new Map();
  let files = getFilesOfDir(targetDir);

  for (let service of files) {
    let absoluteFilepath = path.join(service.parentPath, service.name);
    let properties = parseFileProperties(absoluteFilepath);
    if (propMap.get(absoluteFilepath) == undefined) {
      propMap.set(absoluteFilepath, properties);
    }
  }

  return propMap;
}

/**
 * Adds the dependencies found in the serviceDir to the graph and if needed,
 * calls itself recursively to add children.
 * @param {DirectedAcyclicGraph} depGraph 
 * @param {Map<string, Dependency[]>} allServiceProperties
 * @param {string} serviceDir 
 * @returns {DirectedAcyclicGraph}
 * @exports
 */
export function addDependencies(depGraph, allServiceProperties, serviceDir) {
  let deps = allServiceProperties.get(serviceDir);
  depGraph.addVertex(serviceDir);

  if (deps && deps.length > 0) {
    for (let prop of deps.values()) {
      if (prop.dependency == DEPENDENCY_TYPES.Before || prop.dependency == DEPENDENCY_TYPES.ChainTo) {

        if (depGraph.addVertex(prop.namedService)) {
          depGraph.addEdge(prop.namedService, serviceDir);
          depGraph = addDependencies(depGraph, allServiceProperties, prop.namedService);
        }

      } else if (prop.dependency == DEPENDENCY_TYPES.DependsOnD || prop.dependency == DEPENDENCY_TYPES.WaitsForD
        || prop.dependency == DEPENDENCY_TYPES.DependsMsD) {

          let files = getFilesOfDir(prop.namedService);
          for (let service of files.values()) {
            depGraph = addDependencies(depGraph, allServiceProperties, path.join(service.parentPath, service.name));
          }

      } else {
        if (depGraph.addVertex(prop.namedService)) {

          depGraph.addEdge(serviceDir, prop.namedService);
          depGraph = addDependencies(depGraph, allServiceProperties, prop.namedService);

        }
      }
    }
  }

  return depGraph;
}

//endregion "Functions"

/**
 * The main entrypoint for this CLI app, the command dinit-graph
 */
function main_cli() {
  
  let serviceDir = serviceDirFromOptions(process.argv.slice(2));
  console.log("Parsing directory properties...", console.time);
  let allServiceProperties = parseDirectoryProperties(serviceDir);

  let depGraph = new DirectedAcyclicGraph();
  let bootService = path.join(serviceDir, "boot");

  console.log("Building graph...", console.time);
  depGraph = addDependencies(depGraph, allServiceProperties, bootService);
  let graphAsString = depGraph.toTopologicalLevelString();
  graphAsString = graphAsString.replaceAll(serviceDir, "");
  console.log(graphAsString);
}

// @ts-ignore
if (import.meta.main) {
  main_cli();
}