import {
  ShaderFunction,
  ShaderParseResult,
  ShaderUniform,
  WebGLVersion,
} from "../types";
import ModuleRegistry from "./module_registry";
import {
  SandboxModuleMethodNotFoundError,
  SandboxShaderRequirementMismatchError,
} from "../errors";
import Parser from "./parser";

export default class Compilable {
  /** Original and compiled shader code */
  protected code: { original: string; compiled: string | null } = {
    original: "",
    compiled: null,
  };

  /** Parser instance for the shader source */
  protected parser: Parser;

  /** Requirements that must be present in the shader */
  protected requirements: {
    uniforms: Map<string, ShaderUniform>;
    functions: Map<string, ShaderFunction>;
  } = {
    uniforms: new Map(),
    functions: new Map(),
  };

  constructor(source: string) {
    this.code.original = source;
    this.parser = new Parser(source);
  }

  /**
   * Detect WebGL version from shader source
   */
  version(): WebGLVersion {
    return this.parser.version();
  }

  /**
   * Compile the code
   */
  compile(): string {
    if (this.code.compiled) return this.code.compiled;

    const content = this.parser.parse();

    // do the process..
    if (content.imports.length > 0) {
      this.processImports();
    }

    this.build();

    return this.code.compiled || this.code.original;
  }

  private processImports(): void {
    const content = this.parser.parse();

    for (const imp of content.imports) {
      const module = ModuleRegistry.resolve(imp.module);
      module.compile();
      const extraction = module.extract(imp.name);

      this.requirements.functions.set(imp.alias, extraction.function);

      extraction.uniforms.forEach((u) => {
        this.requirements.uniforms.set(`${imp.alias}_${u.name}`, u);
      });
    }
  }

  private build(): void {
    const missingUniforms = this.checkUniformsPresence();
    const missingFunctions = this.checkFunctionsPresence();

    if (missingUniforms.length === 0 && missingFunctions.length === 0) {
      this.code.compiled = this.code.original;
    }

    // process that shit and return compiled
  }

  private checkUniformsPresence(): ShaderUniform[] {
    const content = this.parser.parse();
    const missing: ShaderUniform[] = [];
    const required = this.requirements.uniforms;

    for (const name of required.keys()) {
      if (!content.uniforms.some((u) => u.name === name)) {
        missing.push(required.get(name)!);
      }

      const mismatch = content.uniforms.find(
        (u) => u.name === name && u.type !== required.get(name)?.type,
      );
      if (mismatch) {
        throw new SandboxShaderRequirementMismatchError(
          "uniform",
          name,
          required.get(name)!.type,
          mismatch.type,
        );
      }
    }

    return missing;
  }

  /** @todo inconsistency type in requiredUniforms */
  private checkFunctionsPresence(): ShaderFunction[] {
    const content = this.parser.parse();
    const missing: ShaderFunction[] = [];
    const required = this.requirements.functions;

    for (const name of required.keys()) {
      if (!content.functions.some((f) => f.name === name)) {
        missing.push(required.get(name)!);
      }

      const mismatch = content.functions.find(
        (f) => f.name === name && f.type !== required.get(name)?.type,
      );
      if (mismatch) {
        throw new SandboxShaderRequirementMismatchError(
          "function",
          name,
          required.get(name)!.type,
          mismatch.type,
        );
      }
    }

    return missing;
  }
}
