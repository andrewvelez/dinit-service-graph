#! /usr/bin/env bun

/**
 * dinit-graph: a tool for visualizing the dinit service dependency directed acyclic graph
 * by: Andrew Velez
 */

import { Glob } from "bun";
import * as fs from "node:fs";
import * as path from "node:path";
import { DirectedAcyclicGraph } from "./directed-acyclic-graph.js";

//region "Types"
/**
 * @readonly
 * @enum(string)
 */
const DependencyName = Object.freeze({
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

/**
 * @typedef {string} ServiceDirectoryPath
 * @typedef {string} ServiceFilePath
 * @typedef {typeof DependencyName[keyof typeof DependencyName]} DependencyKind
 * @typedef {{dependency: DependencyKind, namedService: string}} Dependency
 * @property {DependencyKind} propertyName
 * @property {ServiceFilePath} value
 * 
 */
//endregion "Types"

//region "Functions"

/**
 * @param {string[]} args
 * @returns {string}
 */
function serviceDirFromOptions(args) {
  let usage = `dinit-graph <service-directory>`;

  if (!args || args.length == 0 || args[0] === undefined) {
    console.log(usage);
    process.exit(1);
  }

  return args[0];
}

/** @type {ReadonlySet<string>} */
const DependencyKinds = new Set(Object.values(DependencyName));

/**
 * @param {string} value
 * @returns {value is DependencyKind}
 */
function isDependencyKind(value) {
  return DependencyKinds.has(value);
}

/**
 * Process all non-directory files in a directory recursively
 * @param {ServiceFilePath} absPath - The directory path to scan
 * @returns {Dependency[]}
 */
function parseFileProperties(absPath) {
  /** @type {Dependency[]} */
  let props = [];
  let contents = "";

  let dependencyTypes = "depends-on|depends-ms|waits-for|depends-on\\.d|depends-ms\\.d|waits-for\\.d|after|before|chain-to";
  let propPattern = `^\\s*(${dependencyTypes})\\s*[:=]\\s*([^#\\s]+.*?)(?:\\s+|#|$)`;

  try {
    contents = fs.readFileSync(absPath, "utf-8");
  } catch (ex) {
    console.error("exception while trying to read file", ex)
  }

  for(let line of contents.split('\n')) {
    let results = line.match(propPattern);
    if (results != null && results[1] != null && results[2] != null && isDependencyKind(results[1])) {
      props.push({dependency: results[1], namedService: results[2]});
    }
  }

  return props;
}

/**
 * @param {ServiceDirectoryPath} targetDir
 * @returns {Map<ServiceFilePath, Dependency[]>}
 */
function parseDirectoryProperties(targetDir) {
  /** @type {Map<ServiceFilePath, Dependency[]>} */
  let propMap = new Map();

  /** @type {fs.Dirent[]} */
  let files = [];

  try {
    files = fs.readdirSync(targetDir, { withFileTypes: true, recursive: true })
      .filter(dirent => !dirent.isDirectory());
  } catch (ex) {
    console.error("Exception while trying to read directory.", ex)
  }

  for(let service of files) {
    let absoluteFilepath = path.join(service.parentPath, service.name));
    let properties = parseFileProperties(absoluteFilepath);
    if (propMap.get(absoluteFilepath) == undefined) {
      propMap.set(absoluteFilepath, properties);
    }
  }

  return propMap;
}

//endregion "Functions"

/**
 * The main entrypoint for this CLI app, the command dinit-graph
 */
function main_cli() {

  let serviceDir = serviceDirFromOptions(process.argv.slice(2));
  let allServiceProperties = parseDirectoryProperties(serviceDir);
  
  let depGraph = new DirectedAcyclicGraph();
  let bootService = path.join(serviceDir, "boot");

  if (!fs.existsSync(bootService)) {
    throw new Error("boot service does not exist");
  }

  

  // 4. Make new DAG, start at Boot service, add all namedServices as dependencies meaning they must start
  // 4... before the targetService starts with the exception of 'after' and 'chain-to' which are modeled
  // 4... as reverse dependencies. For the dependency types of '*.d', it is necessary to get the services within
  // 4... the '.d' dir and add them as dependencies in the same way and that is recursive.

  // 5. If a file is unreadable or an exception occurs, we skip that file and save the filename so I can
  // 5... identify which service file is bad.

  // 6. The DAG is already self-validating.  It doesn't allow vertices/edges to be added that would make the graph
  // 6... invalid.  We will next sort the graph topologically and include in that tiers, meaning the graph may have
  // 6... more than one starting vertex.  So, a set of vertices can start together, then another set can start
  // 6... together, and so on.  That's the graph we will print out.

}

main_cli();