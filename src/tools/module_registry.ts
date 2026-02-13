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
