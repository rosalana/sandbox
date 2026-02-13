import {
  SandboxAtemptedToImportMainFunctionError,
  SandboxModuleMethodNotFoundError,
} from "../errors";
import {
  ModuleDefinition,
  ModuleFunctionExtraction,
  ShaderFunction,
  ShaderUniform,
} from "../types";
import Compilable from "./compilable";
import { modules as MODULES } from "../globals";

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
    MODULES.register(name, module);

    return module;
  }

  /**
   * Resolve a module by name from the registry, throwing an error if not found
   */
  static resolve(name: string): Module {
    return MODULES.resolve(name);
  }

  /**
   * Get the module definition
   */
  getDefinition() {
    this.compile(); // Ensure it's compiled to resolve any imports
    return {
      name: this.name,
      methods: this.compiled
        .parse()
        .functions.map((f) => f.name)
        .filter((n) => n !== "main"),
      options: this.options,
    };
  }

  /**
   * Extract a method with all its dependencies
   */
  extract(name: string): ModuleFunctionExtraction {
    // Compile first to resolve any nested imports
    this.compile();

    if (name === "main") {
      throw new SandboxAtemptedToImportMainFunctionError(this.name);
    }

    const content = this.compiled.parse();

    // Find the requested method
    const method = content.functions.find((f) => f.name === name);
    if (!method) {
      throw new SandboxModuleMethodNotFoundError(this.name, name);
    }

    // Collect all dependencies recursively
    const collectedFunctions = new Map<string, ShaderFunction>();
    const collectedUniforms = new Map<string, ShaderUniform>();

    this.collectDependencies({
      current: method,
      scope: {
        functions: content.functions,
        uniforms: content.uniforms,
      },
      collected: {
        functions: collectedFunctions,
        uniforms: collectedUniforms,
      },
      visited: new Set([name]),
    });

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
  private collectDependencies(param: {
    current: ShaderFunction;
    scope: {
      functions: ShaderFunction[];
      uniforms: ShaderUniform[];
    };
    collected: {
      functions: Map<string, ShaderFunction>;
      uniforms: Map<string, ShaderUniform>;
    };
    visited: Set<string>;
  }): void {
    for (const dep of param.current.dependencies) {
      if (dep.type === "function") {
        // Skip if already visited (prevents infinite loops)
        if (param.visited.has(dep.name)) continue;

        // Find the function in compiled content
        const depFunc = param.scope.functions.find((f) => f.name === dep.name);
        if (depFunc) {
          param.visited.add(dep.name);
          param.collected.functions.set(dep.name, depFunc);

          // Recursively collect dependencies of this helper
          this.collectDependencies({
            current: depFunc,
            scope: {
              functions: param.scope.functions,
              uniforms: param.scope.uniforms,
            },
            collected: {
              functions: param.collected.functions,
              uniforms: param.collected.uniforms,
            },
            visited: param.visited,
          });
        }
        // If not found, it's a built-in GLSL function - ignore
      } else if (dep.type === "uniform") {
        // Find uniform in compiled content
        const depUniform = param.scope.uniforms.find(
          (u) => u.name === dep.name,
        );
        if (depUniform && !param.collected.uniforms.has(dep.name)) {
          param.collected.uniforms.set(dep.name, depUniform);
        }
      }
    }
  }
}
