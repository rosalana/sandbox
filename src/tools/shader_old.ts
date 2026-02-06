import { ShaderImport, ModuleUniformRequirement, WebGLVersion } from "../types";
import { uniforms as globalUniforms } from "../defaults";
import Module from "./module";

/** Result of shader compilation */
export interface ShaderCompilationResult {
  /** Compiled shader source */
  code: string;
  /** All uniforms required by imported functions (already renamed) */
  uniforms: ModuleUniformRequirement[];
}

/** Tracks a resolved function with its context */
interface ResolvedFunction {
  /** Function name */
  name: string;
  /** Module it came from */
  moduleName: string;
  /** Processed source code (with renamed uniforms) */
  source: string;
  /** Uniforms used (already renamed) */
  uniforms: ModuleUniformRequirement[];
}

export default class Shader {
  private code: { original: string; compiled: string | null } = {
    original: "",
    compiled: null,
  };

  /** All resolved functions in order */
  private resolvedFunctions: ResolvedFunction[] = [];

  /** Track which functions have been resolved to avoid duplicates */
  private resolvedSet: Set<string> = new Set();

  /** All uniforms collected from resolved functions */
  private collectedUniforms: Map<string, ModuleUniformRequirement> = new Map();

  constructor(shaderSource: string) {
    this.code.original = shaderSource;
  }

  /**
   * Detect WebGL version from shader source.
   */
  version(): WebGLVersion {
    return /^\s*#version\s+300\s+es/m.test(this.code.original) ? 2 : 1;
  }

  /**
   * Compile shader with all imports resolved.
   * Returns the compiled shader code.
   */
  compile(): string {
    if (this.code.compiled) return this.code.compiled;

    this.resolveImports();
    this.buildCompiledCode();

    return this.code.compiled || this.code.original;
  }

  /**
   * Compile shader and return full result with metadata.
   */
  compileWithMetadata(): ShaderCompilationResult {
    const code = this.compile();
    return {
      code,
      uniforms: Array.from(this.collectedUniforms.values()),
    };
  }

  /**
   * Parse #import statements from shader source.
   */
  private parseImports(source: string): ShaderImport[] {
    const importRegex =
      /^\s*#import\s+(\w+)(?:\s+as\s+(\w+))?\s+from\s+["'](.+)["']/gm;
    const imports: ShaderImport[] = [];

    let match: RegExpExecArray | null;
    let lineNumber = 1;
    let lastIndex = 0;

    while ((match = importRegex.exec(source)) !== null) {
      lineNumber += (
        source.substring(lastIndex, match.index).match(/\n/g) || []
      ).length;
      lastIndex = match.index;

      const name = match[1];
      const alias = match[2] || match[1];
      const module = match[3];

      imports.push({ name, alias, module, line: lineNumber });
    }

    return imports;
  }

  /**
   * Resolve all imports from the shader.
   */
  private resolveImports(): void {
    const imports = this.parseImports(this.code.original);

    for (const imp of imports) {
      this.resolveFunction(imp.name, imp.module);
    }
  }

  /**
   * Resolve a function and all its dependencies recursively.
   */
  private resolveFunction(funcName: string, moduleName: string): void {
    const key = `${moduleName}:${funcName}`;

    // Skip if already resolved
    if (this.resolvedSet.has(key)) return;
    this.resolvedSet.add(key);

    const module = Module.resolve(moduleName);

    // First, resolve module's own imports (dependencies on other modules)
    for (const moduleImport of module.imports) {
      this.resolveFunction(moduleImport.name, moduleImport.module);
    }

    const func = module.getFunction(funcName);

    // Resolve function dependencies within the same module
    for (const depName of func.dependencies) {
      if (module.hasFunction(depName)) {
        this.resolveFunction(depName, moduleName);
      } else {
        // Try to find in module's imports
        const importedDep = module.imports.find(
          (imp) => imp.alias === depName || imp.name === depName
        );
        if (importedDep) {
          this.resolveFunction(importedDep.name, importedDep.module);
        }
      }
    }

    // Process the function: rename uniforms
    const processed = this.processFunction(func.source, funcName, func.uniforms);

    this.resolvedFunctions.push({
      name: funcName,
      moduleName,
      source: processed.source,
      uniforms: processed.uniforms,
    });
  }

  /**
   * Process a function: rename non-global uniforms with function prefix.
   */
  private processFunction(
    source: string,
    funcName: string,
    uniforms: ModuleUniformRequirement[]
  ): { source: string; uniforms: ModuleUniformRequirement[] } {
    let processedSource = source;
    const processedUniforms: ModuleUniformRequirement[] = [];

    for (const uniform of uniforms) {
      const isGlobal = globalUniforms.has(uniform.name);

      if (isGlobal) {
        // Global uniforms keep their name
        processedUniforms.push({ ...uniform });
      } else {
        // Rename non-global uniforms with function prefix
        const baseName = uniform.name.replace(/^u_/, "");
        const newName = `u_${funcName}_${baseName}`;

        // Replace all occurrences in the source
        const regex = new RegExp(`\\b${uniform.name}\\b`, "g");
        processedSource = processedSource.replace(regex, newName);

        processedUniforms.push({
          ...uniform,
          renamedTo: newName,
        });

        // Add to collected uniforms
        this.collectedUniforms.set(newName, {
          name: uniform.name,
          type: uniform.type,
          renamedTo: newName,
        });
      }
    }

    return { source: processedSource, uniforms: processedUniforms };
  }

  /**
   * Build the final compiled code.
   */
  private buildCompiledCode(): void {
    let code = this.code.original;

    // Remove all #import statements
    code = code.replace(
      /^\s*#import\s+\w+(?:\s+as\s+\w+)?\s+from\s+["'].+["']\s*;?\s*$/gm,
      ""
    );

    // Find insertion point (after #version and precision statements)
    const insertionPoint = this.findInsertionPoint(code);

    // Build uniform declarations
    const uniformDeclarations = this.buildUniformDeclarations();

    // Build function code
    const functionCode = this.resolvedFunctions
      .map((f) => f.source)
      .join("\n\n");

    // Insert uniforms and functions
    const before = code.substring(0, insertionPoint);
    const after = code.substring(insertionPoint);

    let injected = "";
    if (uniformDeclarations) {
      injected += "\n// === Imported uniforms ===\n" + uniformDeclarations + "\n";
    }
    if (functionCode) {
      injected += "\n// === Imported functions ===\n" + functionCode + "\n";
    }

    this.code.compiled = before + injected + after;
  }

  /**
   * Find the best insertion point for injected code.
   * After #version, precision, and existing uniform declarations.
   */
  private findInsertionPoint(code: string): number {
    const lines = code.split("\n");
    let insertLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip version directive
      if (line.startsWith("#version")) {
        insertLine = i + 1;
        continue;
      }

      // Skip precision statements
      if (line.startsWith("precision")) {
        insertLine = i + 1;
        continue;
      }

      // Skip existing uniform declarations
      if (line.startsWith("uniform")) {
        insertLine = i + 1;
        continue;
      }

      // Skip empty lines and comments at the top
      if (line === "" || line.startsWith("//")) {
        if (insertLine === i) insertLine = i + 1;
        continue;
      }

      // Stop at first real code
      break;
    }

    // Calculate character position
    let pos = 0;
    for (let i = 0; i < insertLine; i++) {
      pos += lines[i].length + 1; // +1 for newline
    }

    return pos;
  }

  /**
   * Build uniform declarations string.
   */
  private buildUniformDeclarations(): string {
    const declarations: string[] = [];

    for (const [name, uniform] of this.collectedUniforms) {
      declarations.push(`uniform ${uniform.type} ${name};`);
    }

    return declarations.join("\n");
  }
}
