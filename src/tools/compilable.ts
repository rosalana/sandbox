import {
  ModuleDefinition,
  ModuleFunctionExtraction,
  ShaderFunction,
  ShaderParseResult,
  ShaderUniform,
  WebGLVersion,
} from "../types";
import {
  SandboxShaderRequirementMismatchError,
  SandboxShaderWithoutFunctionError,
} from "../errors";
import Parser from "./parser";
import { uniforms as UNIFORMS } from "../globals";
import { modules as MODULES } from "../globals";
import { runtime_modules as RUNTIME_MODULES } from "../globals";

type RewriteOp = {
  index: number;
  oldText: string;
  newText: string;
};

export default class Compilable {
  /** Flag to track if the shader has been compiled */
  protected isCompiled: boolean = false;

  /** Original and compiled shader parsers */
  protected original: Parser;
  /** Compiled parser will be updated with rewritten source after processing imports */
  protected compiled: Parser;

  /** Collected requirements from imports */
  protected requirements: {
    uniforms: Map<string, ShaderUniform>;
    functions: Map<string, ShaderFunction>;
  } = {
    uniforms: new Map(),
    functions: new Map(),
  };

  constructor(source: string) {
    this.original = new Parser(source);
    this.compiled = new Parser(source);
  }

  /**
   * Detect WebGL version from shader source
   */
  version(): WebGLVersion {
    return this.original.version();
  }

  /**
   * Get the original source code of the shader
   */
  source(): string {
    return this.original.source;
  }

  /**
   * Force recompilation of the shader, reprocessing all imports and rewrites
   * It's not necessary to call this manually because the state gets lost whenever the shader is switched out and back in.
   */
  recompile(): string {
    this.isCompiled = false;
    return this.compile();
  }

  /**
   * Compile the shader source, resolving all imports
   */
  compile(): string {
    if (this.isCompiled) return this.compiled.source;

    const content = this.original.parse();

    // Process imports if any
    if (content.imports.length > 0) {
      this.processImports();
    }

    // Build final shader
    this.compiled.setSource(this.build());
    this.isCompiled = true;

    return this.compiled.source;
  }

  /**
   * Process all #import directives
   */
  private processImports(): void {
    const content = this.original.parse();

    for (const imp of content.imports) {
      const module = MODULES.resolve(imp.module);
      const extraction = module.extract(imp.name);

      // Copy the module to avoid mutating the original definition
      const copy = module.copy();

      // Rewrite and collect requirements with the alias as namespace
      this.processExtraction(extraction, imp.alias, copy.options);

      // Register the module in runtime modules for engine access
      RUNTIME_MODULES.register(imp.module, copy);
    }
  }

  /**
   * Process an extraction: rewrite names and collect as requirements
   */
  private processExtraction(
    extraction: ModuleFunctionExtraction,
    alias: string,
    options: ModuleDefinition["options"] = {},
  ): void {
    const mainFunc = extraction.function;

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const uniqueAlias = `${alias}_${randomSuffix}`;

    // Process helper functions first
    for (const helperFunc of extraction.dependencies.functions) {
      const rewrittenHelper = this.rewriteFunction(helperFunc, alias, {
        uniforms: extraction.dependencies.uniforms,
        functions: extraction.dependencies.functions,
        unique: uniqueAlias,
      });

      this.requirements.functions.set(rewrittenHelper.name, rewrittenHelper);
    }

    // Process main function
    const rewrittenMain = this.rewriteFunction(mainFunc, alias, {
      uniforms: extraction.dependencies.uniforms,
      functions: extraction.dependencies.functions,
      rename: true,
      unique: uniqueAlias,
    });

    this.requirements.functions.set(rewrittenMain.name, rewrittenMain);

    // Collect uniforms with namespaced names
    for (const uniform of extraction.dependencies.uniforms) {
      if (UNIFORMS.has(uniform.name)) continue;

      const namespacedUniform: ShaderUniform = {
        ...uniform,
        name: `${uniqueAlias}_${uniform.name}${uniform.arrayNum ? `[${uniform.arrayNum}]` : ""}`,
      };

      if (options[mainFunc.name]) {
        const conf = Object.entries(options[mainFunc.name]).find(
          ([k, o]) => o.uniform === uniform.name,
        );
        if (conf) {
          conf[1].uniform = `${uniqueAlias}_${uniform.name}`;
        }
      }

      this.requirements.uniforms.set(namespacedUniform.name, namespacedUniform);
    }

    // Rename the options key from original function name to the alias
    if (options[mainFunc.name] && alias !== mainFunc.name) {
      options[alias] = options[mainFunc.name];
      delete options[mainFunc.name];
    }
  }

  /**
   * Rewrite a function: namespace all uniform and helper function references
   */
  private rewriteFunction(
    func: ShaderFunction,
    alias: string,
    data: {
      uniforms: ShaderUniform[];
      functions: ShaderFunction[];
      rename?: boolean;
      unique?: string;
    } = { rename: false, uniforms: [], functions: [], unique: "" },
  ): ShaderFunction {
    const uniformNames = new Set(data.uniforms.map((u) => u.name));
    const helperNames = new Set(data.functions.map((h) => h.name));

    const ops: RewriteOp[] = [];

    const prefix = data.unique ? data.unique : alias;

    for (const dep of func.dependencies) {
      if (dep.index === undefined) continue;

      if (dep.type === "uniform" && uniformNames.has(dep.name)) {
        if (UNIFORMS.has(dep.name)) continue;

        ops.push({
          index: dep.index,
          oldText: dep.name,
          newText: `${prefix}_${dep.name}`,
        });
      } else if (dep.type === "function" && helperNames.has(dep.name)) {
        ops.push({
          index: dep.index,
          oldText: dep.name,
          newText: `${prefix}_${dep.name}`,
        });
      }
    }

    // Apply rewrites from end to start (preserves indices)
    const newBody = this.applyRewrites(func.body, ops);

    // Determine new function name
    const newName = data.rename ? alias : `${prefix}_${func.name}`;

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
    const content = this.original.parse();
    let result = this.original.source;

    // Remove #import lines
    result = this.removeImportLines(result, content);

    // Find insertion point for uniforms
    const insertionPointForUniforms =
      this.findInsertionPointForUniforms(result);

    // Generate code for uniforms
    const generatedUniformsCode = this.generateUniformsCode();

    if (generatedUniformsCode) {
      result =
        result.slice(0, insertionPointForUniforms) +
        generatedUniformsCode +
        `\n` +
        result.slice(insertionPointForUniforms);
    }

    // Find insertion point for functions
    const insertionPointForFunctions =
      this.findInsertionPointForFunctions(result);

    // Generate code for functions
    const generatedFunctionsCode = this.generateFunctionCode();

    if (generatedFunctionsCode) {
      result =
        result.slice(0, insertionPointForFunctions) +
        generatedFunctionsCode +
        result.slice(insertionPointForFunctions);
    }

    result = result.replace(/\n{3,}/g, "\n\n");

    return result;
  }

  /**
   * Remove #import lines from shader source
   */
  private removeImportLines(
    source: string,
    content: ShaderParseResult,
  ): string {
    const lines = source.split("\n");
    const importLineNumbers = new Set(content.imports.map((i) => i.line));

    return lines
      .filter((line, index) => {
        const shouldRemove = importLineNumbers.has(index + 1);
        if (!shouldRemove && line.trim() === "" && index > 0) {
          const prevIndex = index - 1;
          if (importLineNumbers.has(prevIndex + 1)) {
            return false;
          }
        }
        return !shouldRemove;
      })
      .join("\n");
  }

  /**
   * Find insertion point for uniforms (after existing uniforms)
   */
  private findInsertionPointForUniforms(source: string): number {
    const content = new Parser(source).parse();
    const last = content.uniforms.find(
      (u) => u.line === Math.max(...content.uniforms.map((u) => u.line ?? 0)),
    );

    const lines = source.split("\n");
    let insertAfterLine = 0;

    // If there are existing uniforms, insert after the last one
    if (last && last.line) {
      insertAfterLine = last.line;
    } else {
      // Otherwise, insert after version and precision qualifiers
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
    }

    let charPos = 0;
    for (let i = 0; i < insertAfterLine; i++) {
      charPos += lines[i].length + 1; // +1 for newline
    }
    return charPos;
  }

  private findInsertionPointForFunctions(source: string): number {
    const content = new Parser(source).parse();
    const first = content.functions.find(
      (u) =>
        u.line ===
        Math.min(...content.functions.map((u) => u.line ?? Infinity)),
    );

    const lines = source.split("\n");
    let insertAfterLine = 0;

    // If there are existing functions, insert before the first one
    if (first && first.line) {
      insertAfterLine = first.line - 2;
    } else {
      // Otherwise, this looks like a shader with no functions - which is invalid since it must have a main() function
      throw new SandboxShaderWithoutFunctionError();
    }

    let charPos = 0;
    for (let i = 0; i < insertAfterLine; i++) {
      charPos += lines[i].length + 1; // +1 for newline
    }
    return charPos;
  }

  /**
   * Generate GLSL code for uniforms
   */
  private generateUniformsCode(): string {
    const parts: string[] = [];

    if (this.requirements.uniforms.size > 0) {
      for (const uniform of this.checkUniformsPresence()) {
        parts.push(`uniform ${uniform.type} ${uniform.name};`);
      }
    }

    if (parts.length === 0) return "";

    return parts.join("\n") + "\n";
  }

  /**
   * Generate GLSL code for functions
   */
  private generateFunctionCode(): string {
    const parts: string[] = [];

    if (this.requirements.functions.size > 0) {
      for (const func of this.checkFunctionsPresence()) {
        const params = func.params.map((p) => `${p.type} ${p.name}`).join(", ");
        parts.push(`\n${func.type} ${func.name}(${params}) ${func.body}`);
      }
    }

    if (parts.length === 0) return "";

    return parts.join("\n") + "\n";
  }

  /**
   * Check which required uniforms are missing from the original shader
   */
  private checkUniformsPresence(): ShaderUniform[] {
    const content = this.original.parse();
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
    const content = this.original.parse();
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
