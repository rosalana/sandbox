import {
  SandboxModuleMethodNotFoundError,
  SandboxModuleNotFoundError,
} from "../errors";
import { modules } from "../defaults";
import { ModuleDefinition } from "src/types";

export default class Module {
  private definition: ModuleDefinition;

  constructor(moduleName: string) {
    this.definition = Module.get(moduleName);
  }

  static define(name: string, source: string) {
    modules.add({ name, source });
  }

  static resolve(name: string): Module {
    return new Module(name);
  }

  method(name: string): string {
    // Najdi začátek metody
    const funcRegex = new RegExp(
      `((?:void|float|int|bool|vec[234]|ivec[234]|bvec[234]|mat[234](?:x[234])?|sampler\\w+)\\s+${name}\\s*\\([^)]*\\)\\s*\\{)`,
      "g",
    );
    const match = funcRegex.exec(this.definition.source);
    if (!match) {
      throw new SandboxModuleMethodNotFoundError(this.definition.name, name);
    }
    const startIdx = match.index;
    let braceCount = 0;
    let inMethod = false;
    let endIdx = -1;
    for (let i = startIdx; i < this.definition.source.length; i++) {
      const char = this.definition.source[i];
      if (char === "{") {
        braceCount++;
        inMethod = true;
      } else if (char === "}") {
        braceCount--;
        if (inMethod && braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
    if (endIdx === -1) {
      throw new SandboxModuleMethodNotFoundError(this.definition.name, name);
    }
    return this.definition.source.slice(startIdx, endIdx);
  }

  static get(name: string): ModuleDefinition {
    for (const mod of modules) {
      if (mod.name === name) {
        return mod;
      }
    }
    throw new SandboxModuleNotFoundError(name);
  }

  static available(): string[] {
    return Array.from(modules).map((mod: any) => mod.name);
  }
}
