import { SandboxModuleNotFoundError } from "../errors";
import type Module from "./module";

export default class ModuleRegistry {
  private static modules: Map<string, Module> = new Map();

  /**
   * Compile all registered modules.
   */
  static compile(): void {
    this.modules.forEach((module) => {
      module.compile();
    });
  }

  /**
   * Get the list of available shader modules.
   */
  static available() {
    return Array.from(this.modules.values()).map((module) =>
      module.getDefinition(),
    );
  }

  /**
   * Register a new module in the registry.
   */
  static register(name: string, module: Module): void {
    this.modules.set(name, module);
  }

  /**
   * Resolve a module by name. Throws an error if the module is not found.
   */
  static resolve(name: string): Module {
    const module = this.modules.get(name);

    if (!module) {
      throw new SandboxModuleNotFoundError(name);
    }

    return module;
  }

  /**
   * Check if a module exists in the registry by name.
   */
  static has(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Remove a module from the registry by name.
   */
  static remove(name: string): void {
    this.modules.delete(name);
  }

  /**
   * Load multiple modules into the registry at once.
   */
  static load(modules: Module[]): void {
    modules.forEach((module) => {
      this.register(module.name, module);
    });
  }

  /**
   * Destroy the instance by clearing all registered modules.
   */
  static destroy(): void {
    this.modules.clear();
  }
}
