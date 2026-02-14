import { ModuleMethodOption, UniformSchema } from "../types";
import { SandboxModuleNotFoundError } from "../errors";
import type Module from "./module";

export default class ModuleRegistry {
  private modules: Map<string, Module> = new Map();

  constructor(initialModules: Module[] = []) {
    initialModules.forEach((module) => {
      this.register(module.name, module);
    });
  }

  /**
   * Compile all registered modules.
   */
  compile(): void {
    this.modules.forEach((module) => {
      module.compile();
    });
  }

  /**
   * Get the list of available shader modules.
   */
  available() {
    return Array.from(this.modules.values()).map((module) =>
      module.getDefinition(),
    );
  }

  /**
   * Get the list of uniforms required by the currently registered modules.
   * This is used to automatically set up the uniforms in the shader based on the modules in use.
   */
  defaults(): UniformSchema {
    const uniformMap: UniformSchema = {};

    this.modules.forEach((module) => {
      const content = module.getDefinition();

      if (!content.options) return;

      for (const method in content.options) {
        const options = content.options[method];

        for (const conf in options) {
          const option = options[conf];
          if (
            option.default !== undefined &&
            !content.uniforms.includes(option.uniform)
          ) {
            uniformMap[option.uniform] = option.default;
          }
        }
      }
    });

    return uniformMap;
  }

  /**
   * Resolve the options from the module definitions for a given function name.
   */
  resolveOptions(func: string): Record<string, ModuleMethodOption> | null {
    for (const module of this.modules.values()) {
      if (module.options && module.options[func]) {
        return module.options[func];
      }
    }

    return null;
  }

  /**
   * Register a new module in the registry.
   */
  register(name: string, module: Module): void {
    this.modules.set(name, module);
  }

  /**
   * Resolve a module by name. Throws an error if the module is not found.
   */
  resolve(name: string): Module {
    const module = this.modules.get(name);

    if (!module) {
      throw new SandboxModuleNotFoundError(name);
    }

    return module;
  }

  /**
   * Check if a module exists in the registry by name.
   */
  has(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Check if the registry is empty (no modules registered).
   */
  isEmpty(): boolean {
    return this.modules.size === 0;
  }

  /**
   * Remove a module from the registry by name.
   */
  remove(name: string): void {
    this.modules.delete(name);
  }

  /**
   * Load multiple modules into the registry at once.
   */
  load(modules: Module[]): void {
    modules.forEach((module) => {
      this.register(module.name, module);
    });
  }

  /**
   * Clear all registered modules from the registry.
   */
  clear(): void {
    this.modules.clear();
  }
}
