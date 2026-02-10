import { ModuleDefinition } from "../types";
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
}
