import { SandboxModuleNotFoundError } from "../errors";
import Module from "./module";

export default class ModuleRegistry {
  private static modules: Map<string, Module> = new Map();

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

  static remove(name: string): void {
    this.modules.delete(name);
  }

  static load(): void {
    // load modules from file or predefined list..
    // has to be called at the initialization of the sandbox
  }
}
