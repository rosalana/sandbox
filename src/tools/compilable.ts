import {
  ModuleFunctionExtraction,
  ShaderFunction,
  ShaderParseResult,
  ShaderUniform,
  WebGLVersion,
} from "../types";
import ModuleRegistry from "./module_registry";
import { SandboxShaderRequirementMismatchError } from "../errors";
import Parser from "./parser";

/**
 * Represents a rewrite operation to be applied to a string
 * Sorted by index descending and applied from end to start
 */
type RewriteOp = {
  index: number;
  oldText: string;
  newText: string;
};

export default class Compilable {
  /** Original and compiled shader code */
  protected code: { original: string; compiled: string | null } = {
    original: "",
    compiled: null,
  };

  /** Parser instance for the shader source */
  protected parser: Parser;

  /** Collected requirements from imports */
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
   * Get parsed content of the compiled code
   */
  getCompiledContent(): ShaderParseResult {
    if (!this.code.compiled) {
      this.compile();
    }
    const compiledParser = new Parser(this.code.compiled!);
    return compiledParser.parse();
  }

  /**
   * Compile the shader source, resolving all imports
   */
  compile(): string {
    if (this.code.compiled) return this.code.compiled;

    const content = this.parser.parse();

    // Process imports if any
    if (content.imports.length > 0) {
      this.processImports();
    }

    // Build final shader
    this.code.compiled = this.build();

    return this.code.compiled;
  }

  /**
   * Process all #import directives
   */
  private processImports(): void {
    const content = this.parser.parse();

    for (const imp of content.imports) {
      const module = ModuleRegistry.resolve(imp.module);
      const extraction = module.extract(imp.name);

      // Rewrite and collect requirements with the alias as namespace
      this.processExtraction(extraction, imp.alias);
    }
  }

  /**
   * Process an extraction: rewrite names and collect as requirements
   */
  private processExtraction(
    extraction: ModuleFunctionExtraction,
    alias: string,
  ): void {
    const mainFunc = extraction.function;

    // Process helper functions first
    for (const helperFunc of extraction.dependencies.functions) {
      const rewrittenHelper = this.rewriteFunction(
        helperFunc,
        alias,
        extraction.dependencies.uniforms,
        extraction.dependencies.functions,
      );
      this.requirements.functions.set(rewrittenHelper.name, rewrittenHelper);
    }

    // Process main function
    const rewrittenMain = this.rewriteFunction(
      mainFunc,
      alias,
      extraction.dependencies.uniforms,
      extraction.dependencies.functions,
      true, // isMainFunction - rename to alias
    );
    this.requirements.functions.set(rewrittenMain.name, rewrittenMain);

    // Collect uniforms with namespaced names
    for (const uniform of extraction.dependencies.uniforms) {
      const namespacedUniform: ShaderUniform = {
        ...uniform,
        name: `${alias}_${uniform.name}`,
      };
      this.requirements.uniforms.set(namespacedUniform.name, namespacedUniform);
    }
  }

  /**
   * Rewrite a function: namespace all uniform and helper function references
   */
  private rewriteFunction(
    func: ShaderFunction,
    alias: string,
    uniforms: ShaderUniform[],
    helpers: ShaderFunction[],
    isMainFunction: boolean = false,
  ): ShaderFunction {
    const uniformNames = new Set(uniforms.map((u) => u.name));
    const helperNames = new Set(helpers.map((h) => h.name));

    // Collect all rewrite operations
    const ops: RewriteOp[] = [];

    for (const dep of func.dependencies) {
      if (dep.index === undefined) continue;

      if (dep.type === "uniform" && uniformNames.has(dep.name)) {
        ops.push({
          index: dep.index,
          oldText: dep.name,
          newText: `${alias}_${dep.name}`,
        });
      } else if (dep.type === "function" && helperNames.has(dep.name)) {
        ops.push({
          index: dep.index,
          oldText: dep.name,
          newText: `${alias}_${dep.name}`,
        });
      }
    }

    // Apply rewrites from end to start (preserves indices)
    const newBody = this.applyRewrites(func.body, ops);

    // Determine new function name
    const newName = isMainFunction ? alias : `${alias}_${func.name}`;

    return {
      ...func,
      name: newName,
      body: newBody,
    };
  }

  /**
   * Apply rewrite operations to a string, processing from end to start
   */
  private applyRewrites(text: string, ops: RewriteOp[]): string {
    // Sort by index descending
    const sorted = [...ops].sort((a, b) => b.index - a.index);

    let result = text;
    for (const op of sorted) {
      result =
        result.slice(0, op.index) +
        op.newText +
        result.slice(op.index + op.oldText.length);
    }

    return result;
  }

  /**
   * Build the final compiled shader
   */
  private build(): string {
    const content = this.parser.parse();
    let result = this.code.original;

    // 1. Remove #import lines
    result = this.removeImportLines(result, content);

    // 2. Find insertion point (after version directive and existing uniforms, before first function)
    const insertionPoint = this.findInsertionPoint(result);

    // 3. Generate code to insert
    const generatedCode = this.generateInsertedCode();

    if (generatedCode) {
      result =
        result.slice(0, insertionPoint) +
        generatedCode +
        result.slice(insertionPoint);
    }

    return result;
  }

  /**
   * Remove #import lines from shader source
   */
  private removeImportLines(source: string, content: ShaderParseResult): string {
    const lines = source.split("\n");
    const importLineNumbers = new Set(content.imports.map((i) => i.line));

    return lines
      .filter((_, index) => !importLineNumbers.has(index + 1))
      .join("\n");
  }

  /**
   * Find the point where we should insert generated uniforms and functions
   * This should be after #version and existing uniforms, before user functions
   */
  private findInsertionPoint(source: string): number {
    const lines = source.split("\n");
    let insertAfterLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip version directive
      if (line.startsWith("#version")) {
        insertAfterLine = i + 1;
        continue;
      }

      // Skip precision qualifiers
      if (line.startsWith("precision ")) {
        insertAfterLine = i + 1;
        continue;
      }

      // Skip existing uniform declarations
      if (line.startsWith("uniform ")) {
        insertAfterLine = i + 1;
        continue;
      }

      // Skip empty lines and comments at the top
      if (line === "" || line.startsWith("//")) {
        if (insertAfterLine === i) {
          insertAfterLine = i + 1;
        }
        continue;
      }

      // Stop at first non-header content
      break;
    }

    // Calculate character position
    let charPos = 0;
    for (let i = 0; i < insertAfterLine; i++) {
      charPos += lines[i].length + 1; // +1 for newline
    }

    return charPos;
  }

  /**
   * Generate the code to be inserted (uniforms + functions)
   */
  private generateInsertedCode(): string {
    const parts: string[] = [];

    // Add uniform declarations
    if (this.requirements.uniforms.size > 0) {
      parts.push("\n// --- Module uniforms ---");
      for (const uniform of this.requirements.uniforms.values()) {
        parts.push(`uniform ${uniform.type} ${uniform.name};`);
      }
    }

    // Add functions (helpers first, then main functions)
    // Sort by dependency order would be ideal, but for now just add them
    if (this.requirements.functions.size > 0) {
      parts.push("\n// --- Module functions ---");
      for (const func of this.requirements.functions.values()) {
        parts.push(this.generateFunctionCode(func));
      }
    }

    if (parts.length === 0) return "";

    return parts.join("\n") + "\n";
  }

  /**
   * Generate GLSL code for a function
   */
  private generateFunctionCode(func: ShaderFunction): string {
    const params = func.params
      .map((p) => `${p.type} ${p.name}`)
      .join(", ");

    return `${func.type} ${func.name}(${params}) ${func.body}`;
  }

  /**
   * Check which required uniforms are missing from the original shader
   */
  private checkUniformsPresence(): ShaderUniform[] {
    const content = this.parser.parse();
    const missing: ShaderUniform[] = [];
    const required = this.requirements.uniforms;

    for (const [name, uniform] of required) {
      const existing = content.uniforms.find((u) => u.name === name);

      if (!existing) {
        missing.push(uniform);
        continue;
      }

      if (existing.type !== uniform.type) {
        throw new SandboxShaderRequirementMismatchError(
          "uniform",
          name,
          uniform.type,
          existing.type,
        );
      }
    }

    return missing;
  }

  /**
   * Check which required functions are missing from the original shader
   */
  private checkFunctionsPresence(): ShaderFunction[] {
    const content = this.parser.parse();
    const missing: ShaderFunction[] = [];
    const required = this.requirements.functions;

    for (const [name, func] of required) {
      const existing = content.functions.find((f) => f.name === name);

      if (!existing) {
        missing.push(func);
        continue;
      }

      if (existing.type !== func.type) {
        throw new SandboxShaderRequirementMismatchError(
          "function",
          name,
          func.type,
          existing.type,
        );
      }
    }

    return missing;
  }
}
