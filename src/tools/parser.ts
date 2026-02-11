import {
  GLSLType,
  GLSLVariable,
  ShaderFunction,
  ShaderImport,
  ShaderParseResult,
  ShaderUniform,
  WebGLVersion,
} from "../types";

export default class Parser {
  public parsed: ShaderParseResult | null = null;

  constructor(public source: string) {}

  /**
   * Parse the shader source to extract imports, uniforms, functions, and version.
   */
  parse(): ShaderParseResult {
    if (this.parsed) return this.parsed;

    const version = this.detectVersion();
    const imports = this.detectImports();
    const uniforms = this.detectUniforms();
    const functions = this.detectFunctions(uniforms);

    return (this.parsed = {
      version: version,
      imports: imports,
      uniforms: uniforms,
      functions: functions,
    });
  }

  /**
   * Check if the shader source has already been parsed
   */
  isParsed(): boolean {
    return this.parsed !== null;
  }

  /**
   * Change the shader source and reset the parsed result
   */
  changeSource(newSource: string) {
    this.source = newSource;
    this.parsed = null;
  }

  /**
   * Get the detected GLSL version from the shader source without parsing the entire shader
   */
  version(): WebGLVersion {
    return this.detectVersion();
  }

  private detectVersion(): WebGLVersion {
    return /^\s*#version\s+300\s+es/m.test(this.source) ? 2 : 1;
  }

  private detectImports() {
    const importRegex =
      /^[ \t]*#import\s+(\w+)(?:\s+as\s+(\w+))?\s+from\s+["'](.+)["']/gm;
    const imports: ShaderImport[] = [];

    let match: RegExpExecArray | null;
    let lineNumber = 1;
    let lastIndex = 0;

    while ((match = importRegex.exec(this.source)) !== null) {
      lineNumber += (
        this.source.substring(lastIndex, match.index).match(/\n/g) || []
      ).length;
      lastIndex = match.index;

      const name = match[1];
      const alias = match[2] || match[1];
      const module = match[3];

      imports.push({ name, alias, module, line: lineNumber });
    }

    return imports;
  }

  private detectUniforms(): ShaderUniform[] {
    const uniformRegex =
      /^[ \t]*uniform\s+(?:(?:highp|mediump|lowp)\s+)?(\w+)\s+(\w+)\s*;/gm;
    const uniforms: ShaderUniform[] = [];

    let match: RegExpExecArray | null;
    let lineNumber = 1;
    let lastIndex = 0;

    while ((match = uniformRegex.exec(this.source)) !== null) {
      lineNumber += (
        this.source.substring(lastIndex, match.index).match(/\n/g) || []
      ).length;
      lastIndex = match.index;

      const type = match[1] as GLSLType;
      const name = match[2];

      uniforms.push({ name, type, line: lineNumber });
    }

    return uniforms;
  }

  private detectFunctions(uniforms: ShaderUniform[]): ShaderFunction[] {
    const functions: ShaderFunction[] = [];

    const returnTypes =
      "void|float|int|uint|bool|vec[234]|ivec[234]|uvec[234]|bvec[234]|mat[234](?:x[234])?|sampler2D|samplerCube|sampler3D|sampler2DArray";

    const funcRegex = new RegExp(
      `^[ \\t]*(${returnTypes})\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`,
      "gm",
    );

    let match: RegExpExecArray | null;

    while ((match = funcRegex.exec(this.source)) !== null) {
      const returnType = match[1];
      const name = match[2];
      const paramsStr = match[3].trim();
      const startIndex = match.index;

      // Calculate line number
      const lineNumber =
        (this.source.substring(0, startIndex).match(/\n/g) || []).length + 1;

      // Find function body using brace counting
      const bodyStartIndex = this.source.indexOf("{", startIndex);
      const bodyEndIndex = this.findClosingBrace(this.source, bodyStartIndex);

      if (bodyEndIndex === -1) continue;

      // Extract body (including braces)
      const body = this.source.slice(bodyStartIndex, bodyEndIndex + 1);

      // Parse parameters
      const params = this.parseParams(paramsStr);

      const fCalls = this.findFunctionCalls(body);
      const uCalls = this.findUniformCalls(body, uniforms);

      functions.push({
        name,
        type: returnType as GLSLType,
        params,
        body,
        dependencies: [...fCalls, ...uCalls],
        line: lineNumber,
      });
    }

    return functions;
  }

  private parseParams(paramsStr: string): GLSLVariable[] {
    if (!paramsStr.trim()) return [];

    const params: GLSLVariable[] = [];
    const paramParts = paramsStr.split(",");

    for (const part of paramParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Remove qualifiers (in, out, inout, const, highp, mediump, lowp)
      const withoutQualifiers = trimmed
        .replace(/\b(in|out|inout|const|highp|mediump|lowp)\b\s*/g, "")
        .trim();

      // Match: type name or type name[size]
      const paramMatch = withoutQualifiers.match(/^(\w+)\s+(\w+)(?:\[\d*\])?$/);

      if (paramMatch) {
        params.push({
          type: paramMatch[1] as GLSLType,
          name: paramMatch[2],
        });
      }
    }

    return params;
  }

  private findClosingBrace(source: string, startIndex: number): number {
    let braceCount = 0;
    let inBrace = false;
    let inString = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = startIndex; i < source.length; i++) {
      const char = source[i];
      const nextChar = source[i + 1];
      const prevChar = source[i - 1];

      // Handle comments
      if (!inString && !inBlockComment && char === "/" && nextChar === "/") {
        inLineComment = true;
        continue;
      }
      if (inLineComment && char === "\n") {
        inLineComment = false;
        continue;
      }
      if (!inString && !inLineComment && char === "/" && nextChar === "*") {
        inBlockComment = true;
        i++;
        continue;
      }
      if (inBlockComment && char === "*" && nextChar === "/") {
        inBlockComment = false;
        i++;
        continue;
      }

      // Skip if in comment
      if (inLineComment || inBlockComment) continue;

      // Handle strings (GLSL doesn't have strings, but just in case)
      if (char === '"' && prevChar !== "\\") {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      // Count braces
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

  private findFunctionCalls(body: string): ShaderFunction["dependencies"] {
    const calls: ShaderFunction["dependencies"] = [];

    // GLSL keywords that look like function calls but aren't
    const keywords = new Set([
      "if",
      "else",
      "for",
      "while",
      "do",
      "switch",
      "case",
      "return",
      "break",
      "continue",
      "discard",
    ]);

    // Match identifier followed by (
    const regex = /\b([a-zA-Z_]\w*)\s*\(/g;
    let match;

    while ((match = regex.exec(body)) !== null) {
      const name = match[1];
      if (!keywords.has(name)) {
        calls.push({
          name,
          type: "function",
          index: match.index,
        });
      }
    }

    return calls;
  }

  private findUniformCalls(
    body: string,
    uniforms: ShaderUniform[],
  ): ShaderFunction["dependencies"] {
    const calls: ShaderFunction["dependencies"] = [];

    for (const uniform of uniforms) {
      const regex = new RegExp(`\\b${uniform.name}\\b`, "g");
      let match;

      while ((match = regex.exec(body)) !== null) {
        calls.push({
          name: uniform.name,
          type: "uniform",
          index: match.index,
        });
      }
    }

    return calls;
  }
}
