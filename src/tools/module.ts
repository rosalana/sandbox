import {
  SandboxModuleMethodNotFoundError,
  SandboxModuleNotFoundError,
} from "../errors";
import { modules } from "../defaults";
import {
  ModuleDefinition,
  ModuleFunction,
  ShaderImport,
  ModuleUniformRequirement,
  GLSLType,
} from "../types";

/** GLSL return types pattern */
const GLSL_TYPES =
  "void|float|int|bool|vec[234]|ivec[234]|bvec[234]|mat[234](?:x[234])?|sampler\\w+";

/** Uniform declaration pattern */
const UNIFORM_REGEX = /uniform\s+(float|int|bool|vec[234]|ivec[234]|bvec[234]|mat[234]|sampler2D|samplerCube)\s+(\w+)\s*;/g;

/** Import statement pattern */
const IMPORT_REGEX = /^\s*#import\s+(\w+)(?:\s+as\s+(\w+))?\s+from\s+["'](.+)["']/gm;

export default class Module {
  private definition: ModuleDefinition;
  private _functions: Map<string, ModuleFunction> = new Map();
  private _uniforms: ModuleUniformRequirement[] = [];
  private _imports: ShaderImport[] = [];

  constructor(moduleName: string) {
    this.definition = Module.get(moduleName);
    this.parse();
  }

  /**
   * Register a new module.
   */
  static define(name: string, source: string): void {
    modules.set(name, { name, source });
  }

  /**
   * Create a Module instance from registered module.
   */
  static resolve(name: string): Module {
    return new Module(name);
  }

  /**
   * Get module definition by name.
   */
  static get(name: string): ModuleDefinition {
    const mod = modules.get(name);
    if (!mod) {
      throw new SandboxModuleNotFoundError(name);
    }
    return mod;
  }

  /**
   * Check if module exists.
   */
  static exists(name: string): boolean {
    return modules.has(name);
  }

  /**
   * Get all available module names.
   */
  static available(): string[] {
    return Array.from(modules.keys());
  }

  /**
   * Get module name.
   */
  get name(): string {
    return this.definition.name;
  }

  /**
   * Get all uniforms declared in this module.
   */
  get uniforms(): ModuleUniformRequirement[] {
    return this._uniforms;
  }

  /**
   * Get all imports declared in this module.
   */
  get imports(): ShaderImport[] {
    return this._imports;
  }

  /**
   * Get all functions in this module.
   */
  get functions(): Map<string, ModuleFunction> {
    return this._functions;
  }

  /**
   * Parse the module source code.
   */
  private parse(): void {
    this.parseUniforms();
    this.parseImports();
    this.parseFunctions();
  }

  /**
   * Parse uniform declarations from module source.
   */
  private parseUniforms(): void {
    const source = this.definition.source;
    let match: RegExpExecArray | null;

    UNIFORM_REGEX.lastIndex = 0;
    while ((match = UNIFORM_REGEX.exec(source)) !== null) {
      this._uniforms.push({
        name: match[2],
        type: match[1] as GLSLType,
      });
    }
  }

  /**
   * Parse #import statements from module source.
   */
  private parseImports(): void {
    const source = this.definition.source;
    let match: RegExpExecArray | null;

    IMPORT_REGEX.lastIndex = 0;
    while ((match = IMPORT_REGEX.exec(source)) !== null) {
      this._imports.push({
        name: match[1],
        alias: match[2] || match[1],
        module: match[3],
        line: this.getLineNumber(source, match.index),
      });
    }
  }

  /**
   * Parse all functions from module source.
   */
  private parseFunctions(): void {
    const source = this.definition.source;
    const funcRegex = new RegExp(
      `(${GLSL_TYPES})\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`,
      "g"
    );

    let match: RegExpExecArray | null;
    while ((match = funcRegex.exec(source)) !== null) {
      const returnType = match[1];
      const name = match[2];
      const params = match[3];
      const startIdx = match.index;

      // Skip main function
      if (name === "main") continue;

      // Find function body using brace counting
      const bodyStart = source.indexOf("{", startIdx);
      const bodyEnd = this.findClosingBrace(source, bodyStart);

      if (bodyEnd === -1) continue;

      const fullSource = source.slice(startIdx, bodyEnd + 1);
      const body = source.slice(bodyStart, bodyEnd + 1);

      // Find uniforms used in this function
      const usedUniforms = this.findUsedUniforms(body);

      // Find function calls (potential dependencies)
      const dependencies = this.findFunctionCalls(body, name);

      this._functions.set(name, {
        name,
        returnType,
        params,
        body,
        source: fullSource,
        uniforms: usedUniforms,
        dependencies,
      });
    }
  }

  /**
   * Find uniforms used within a code block.
   */
  private findUsedUniforms(code: string): ModuleUniformRequirement[] {
    const used: ModuleUniformRequirement[] = [];

    for (const uniform of this._uniforms) {
      // Check if uniform is used in the code (word boundary match)
      const regex = new RegExp(`\\b${uniform.name}\\b`);
      if (regex.test(code)) {
        used.push({ ...uniform });
      }
    }

    return used;
  }

  /**
   * Find function calls within a code block.
   */
  private findFunctionCalls(code: string, excludeSelf: string): string[] {
    const calls: Set<string> = new Set();

    // Match function calls: identifier followed by (
    const callRegex = /\b([a-zA-Z_]\w*)\s*\(/g;
    let match: RegExpExecArray | null;

    // Built-in GLSL functions to exclude
    const builtins = new Set([
      "sin", "cos", "tan", "asin", "acos", "atan",
      "pow", "exp", "log", "exp2", "log2", "sqrt", "inversesqrt",
      "abs", "sign", "floor", "ceil", "fract", "mod", "min", "max", "clamp",
      "mix", "step", "smoothstep",
      "length", "distance", "dot", "cross", "normalize", "reflect", "refract",
      "matrixCompMult", "transpose", "determinant", "inverse",
      "lessThan", "lessThanEqual", "greaterThan", "greaterThanEqual",
      "equal", "notEqual", "any", "all", "not",
      "texture", "texture2D", "textureCube", "textureProj", "textureLod",
      "dFdx", "dFdy", "fwidth",
      "vec2", "vec3", "vec4", "ivec2", "ivec3", "ivec4",
      "bvec2", "bvec3", "bvec4", "mat2", "mat3", "mat4",
      "float", "int", "bool",
    ]);

    while ((match = callRegex.exec(code)) !== null) {
      const funcName = match[1];
      if (funcName !== excludeSelf && !builtins.has(funcName)) {
        calls.add(funcName);
      }
    }

    return Array.from(calls);
  }

  /**
   * Find closing brace index using brace counting.
   */
  private findClosingBrace(source: string, startIdx: number): number {
    let braceCount = 0;
    let inBrace = false;

    for (let i = startIdx; i < source.length; i++) {
      const char = source[i];
      if (char === "{") {
        braceCount++;
        inBrace = true;
      } else if (char === "}") {
        braceCount--;
        if (inBrace && braceCount === 0) {
          return i;
        }
      }
    }

    return -1;
  }

  /**
   * Get line number for a position in source.
   */
  private getLineNumber(source: string, position: number): number {
    return (source.substring(0, position).match(/\n/g) || []).length + 1;
  }

  /**
   * Get a specific function by name.
   */
  getFunction(name: string): ModuleFunction {
    const func = this._functions.get(name);
    if (!func) {
      throw new SandboxModuleMethodNotFoundError(this.definition.name, name);
    }
    return func;
  }

  /**
   * Check if function exists in this module.
   */
  hasFunction(name: string): boolean {
    return this._functions.has(name);
  }

  /**
   * Legacy method for backward compatibility.
   * @deprecated Use getFunction() instead
   */
  method(name: string): string {
    return this.getFunction(name).source;
  }
}
