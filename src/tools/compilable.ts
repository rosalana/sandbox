import { defaultUniforms } from "../defaults";
import {
  parseFunctions,
  parseGLSLVersion,
  parseImports,
  parseUniforms,
} from "../helpers/shader_parsing";
import {
  ShaderFunction,
  ShaderParseResult,
  ShaderUniform,
  WebGLVersion,
} from "../types";
import Module from "./module";
import { SandboxShaderRequirementMismatchError } from "../errors";

export default class Compilable {
  /** Original and compiled shader code */
  private code: { original: string; compiled: string | null } = {
    original: "",
    compiled: null,
  };

  /** Parsed shader components */
  private parsed: ShaderParseResult | null = null;

  /** Requirements that must be present in the shader */
  private requirements: {
    uniforms: Map<string, ShaderUniform>;
    functions: Map<string, ShaderFunction>;
  } = {
    uniforms: new Map(),
    functions: new Map(),
  };

  constructor(source: string) {
    this.code.original = source;

    defaultUniforms.forEach((type, name) => {
      this.requirements.uniforms.set(name, { name, type, line: 0 });
    });
  }

  /**
   * Detect WebGL version from shader source
   */
  version(source: string = this.code.original): WebGLVersion {
    return parseGLSLVersion(source);
  }

  /**
   * Compile the code
   */
  compile(): string {
    if (this.code.compiled) return this.code.compiled;

    this.parsed = this.parse(this.code.original);

    // do the process..
    if (this.parsed.imports.length > 0) {
      this.processImports();
    }

    this.build();

    return this.code.compiled || this.code.original;
  }

  /**
   * Parse shader source to extract imports, uniforms, and functions.
   */
  private parse(source: string = this.code.original): ShaderParseResult {
    return {
      imports: parseImports(source),
      uniforms: parseUniforms(source),
      functions: parseFunctions(source),
    };
  }

  private processImports(): void {
    if (!this.parsed) return;

    for (const imp of this.parsed.imports) {
      const module = Module.resolve(imp.module);
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
    if (!this.parsed) return [];

    const missing: ShaderUniform[] = [];
    const required = this.requirements.uniforms;

    for (const name of required.keys()) {
      if (!this.parsed.uniforms.some((u) => u.name === name)) {
        missing.push(required.get(name)!);
      }

      const mismatch = this.parsed.uniforms.find(
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
    if (!this.parsed) return [];

    const missing: ShaderFunction[] = [];
    const required = this.requirements.functions;

    for (const name of required.keys()) {
      if (!this.parsed.functions.some((f) => f.name === name)) {
        missing.push(required.get(name)!);
      }

      const mismatch = this.parsed.functions.find(
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
