import { ShaderImport, WebGLVersion } from "../types";
import Module from "./module";

export default class Shader {
  private code: { original: string; compiled: string | null } = {
    original: "",
    compiled: null,
  };

  constructor(shaderSource: string) {
    this.code.original = shaderSource;
  }

  /**
   * Detect WebGL version from shader source.
   */
  version(): WebGLVersion {
    return /^\s*#version\s+300\s+es/m.test(this.code.original) ? 2 : 1;
  }

  compile(): string {
    if (this.code.compiled) return this.code.compiled;

    this.resolveImports();

    console.log("Compiled shader code:\n", this.code.compiled);

    return this.code.compiled || this.code.original;
  }

  private parseImports(): ShaderImport[] {
    const importRegex =
      /^\s*#import\s+(\w+)(?:\s+as\s+(\w+))?\s+from\s+["'](.+)["']/gm;
    const imports = [];

    let match: RegExpExecArray | null;
    let lineNumber = 1;
    let lastIndex = 0;

    while ((match = importRegex.exec(this.code.original)) !== null) {
      lineNumber += (
        this.code.original.substring(lastIndex, match.index).match(/\n/g) || []
      ).length;
      lastIndex = match.index;

      const name = match[1];
      const alias = match[2] || match[1]; // alias defaults to name if not specified
      const module = match[3];

      imports.push({ name, alias, module, line: lineNumber });
    }

    return imports;
  }

  private resolveImports(): void {
    const imports = this.parseImports();

    for (const imp of imports) {
      const method = this.resolveFromModule(imp.alias, imp.module);

      this.pushMethod(method);
      this.removeImport(imp);
    }
  }

  private pushMethod(method: string): void {
    const code = this.code.compiled || this.code.original;
    const functionRegex =
      /^(\s*(?:void|float|int|bool|vec[234]|mat[234]|sampler2D|samplerCube)\s+\w+\s*\()/m;
    const match = code.match(functionRegex);

    if (match) {
      const index = code.search(functionRegex);
      this.code.compiled =
        code.substring(0, index) + "\n" + method + "\n" + code.substring(index);
    } else {
      this.code.compiled = "\n" + method + "\n" + code;
    }
  }

  private removeImport(imp: ShaderImport): void {
    const importRegex = new RegExp(
      `^\\s*#import\\s+${imp.name}(?:\\s+as\\s+${imp.alias})?\\s+from\\s+["']${imp.module}["']`,
      "m",
    );
    this.code.compiled = (this.code.compiled || this.code.original).replace(
      importRegex,
      "",
    );
  }

  private resolveFromModule(method: string, moduleName: string): string {
    return Module.resolve(moduleName).method(method);
  }
}
