import { SandboxModuleMethodNotFoundError } from "../errors";
import {
  ModuleDefinition,
  ModuleFunctionExtraction,
  ShaderFunction,
  ShaderUniform,
} from "../types";
import Compilable from "./compilable";
import ModuleRegistry from "./module_registry";

export default class Module extends Compilable {
  public name: ModuleDefinition["name"];
  private options: ModuleDefinition["options"] = {};

  constructor(
    name: ModuleDefinition["name"],
    source: ModuleDefinition["source"],
    options: ModuleDefinition["options"] = {},
  ) {
    super(source);
    this.name = name;
    this.options = options;
  }

  /**
   * Define a module with given name and source, and register it
   */
  static define(definition: ModuleDefinition): Module {
    const { name, source, options } = definition;

    const module = new Module(name, source, options);
    ModuleRegistry.register(name, module);

    return module;
  }

  /**
   * Resolve a module by name from the registry, throwing an error if not found
   */
  static resolve(name: string): Module {
    return ModuleRegistry.resolve(name);
  }

  /**
   * Get the list of available shader modules that can be use with index
   */
  static available() {
    return ModuleRegistry.available();
  }

  /**
   * Get the module definition
   */
  getDefinition() {
    return {
      name: this.name,
      source: this.code.original,
      options: this.options,
    };
  }

  /**
   * Extract a method with all its dependencies (recursive)
   * Returns the function and all helper functions + uniforms it needs
   */
  extract(methodName: string): ModuleFunctionExtraction {
    // Compile first to resolve any nested imports
    this.compile();

    const content = this.getCompiledContent();

    // Find the requested method
    const method = content.functions.find((f) => f.name === methodName);
    if (!method) {
      throw new SandboxModuleMethodNotFoundError(this.name, methodName);
    }

    // Collect all dependencies recursively
    const collectedFunctions = new Map<string, ShaderFunction>();
    const collectedUniforms = new Map<string, ShaderUniform>();

    this.collectDependencies(
      method,
      content.functions,
      content.uniforms,
      collectedFunctions,
      collectedUniforms,
      new Set([methodName]), // visited set to prevent circular deps
    );

    return {
      function: method,
      dependencies: {
        functions: Array.from(collectedFunctions.values()),
        uniforms: Array.from(collectedUniforms.values()),
      },
    };
  }

  /**
   * Recursively collect all function and uniform dependencies
   */
  private collectDependencies(
    func: ShaderFunction,
    allFunctions: ShaderFunction[],
    allUniforms: ShaderUniform[],
    collectedFunctions: Map<string, ShaderFunction>,
    collectedUniforms: Map<string, ShaderUniform>,
    visited: Set<string>,
  ): void {
    for (const dep of func.dependencies) {
      if (dep.type === "function") {
        // Skip if already visited (prevents infinite loops)
        if (visited.has(dep.name)) continue;

        // Find the function in compiled content
        const depFunc = allFunctions.find((f) => f.name === dep.name);
        if (depFunc) {
          visited.add(dep.name);
          collectedFunctions.set(dep.name, depFunc);

          // Recursively collect dependencies of this helper
          this.collectDependencies(
            depFunc,
            allFunctions,
            allUniforms,
            collectedFunctions,
            collectedUniforms,
            visited,
          );
        }
        // If not found, it's a built-in GLSL function - ignore
      } else if (dep.type === "uniform") {
        // Find uniform in compiled content
        const depUniform = allUniforms.find((u) => u.name === dep.name);
        if (depUniform && !collectedUniforms.has(dep.name)) {
          collectedUniforms.set(dep.name, depUniform);
        }
      }
    }
  }
}
