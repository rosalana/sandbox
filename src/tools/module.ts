import Compilable from "./compilable";
import ModuleRegistry from "./module_registry";

export default class Module extends Compilable {
  private name: string;

  constructor(name: string, source: string) {
    super(source);
    this.name = name;
  }

  // define...

  static resolve(name: string): Module {
    return ModuleRegistry.resolve(name);
  }
}
