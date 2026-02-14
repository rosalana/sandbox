import {
  GLSLType,
  GLSLVariable,
  ShaderFunction,
  ShaderImport,
  ShaderParseResult,
  ShaderUniform,
  WebGLVersion,
} from "../types";
import { SandboxShaderDuplicateImportNameError, SandboxShaderImportSyntaxError } from "../errors";

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
  setSource(newSource: string) {
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
    const validRegex =
      /^[ \t]*#import\s+(\w+)(?:\s+as\s+(\w+))?\s+from\s+["'](.+)["']/gm;
    const looseRegex = /^[ \t]*[^\w\s]?import\b/gm;

    const imports: ShaderImport[] = [];
    const validLines = new Set<number>();

    // Collect valid imports
    let match: RegExpExecArray | null;
    let lineNumber = 1;
    let lastIndex = 0;

    while ((match = validRegex.exec(this.source)) !== null) {
      lineNumber += (
        this.source.substring(lastIndex, match.index).match(/\n/g) || []
      ).length;
      lastIndex = match.index;

      validLines.add(lineNumber);

      const name = match[1];
      const alias = match[2] || match[1];
      const module = match[3];

      if (imports.some((imp) => imp.alias === alias)) {
        throw new SandboxShaderDuplicateImportNameError(alias, lineNumber);
      }

      imports.push({ name, alias, module, line: lineNumber });
    }

    // Find any #import lines that didn't match valid syntax
    let looseMatch: RegExpExecArray | null;
    while ((looseMatch = looseRegex.exec(this.source)) !== null) {
      const line =
        (this.source.substring(0, looseMatch.index).match(/\n/g) || []).length +
        1;

      if (validLines.has(line)) continue;

      const lineText = this.source.split("\n")[line - 1].trim();
      throw new SandboxShaderImportSyntaxError(
        line,
        this.diagnoseImport(lineText),
      );
    }

    return imports;
  }

  private diagnoseImport(line: string): string {
    // @import, $import, !import etc. — wrong prefix character
    const wrongPrefix = line.match(/^([^\w\s])import\b/);
    if (wrongPrefix && wrongPrefix[1] !== "#") {
      return `Invalid prefix '${wrongPrefix[1]}'. Expected: #import <function> from '<module>'`;
    }

    // import blur from 'module' — missing # prefix
    if (/^import\b/.test(line)) {
      return `Missing '#' prefix. Expected: #import <function> from '<module>'`;
    }

    // #import from 'module' — missing function name
    if (/^#import\s+from\b/.test(line)) {
      return `Missing function name. Expected: #import <function> from '<module>'`;
    }

    // #import blur — missing 'from'
    if (/^#import\s+\w+\s*$/.test(line)) {
      return `Missing 'from' clause. Expected: #import ${line.split(/\s+/)[1]} from '<module>'`;
    }

    // #import blur as — missing alias name (also catches #import blur as from 'module')
    if (
      /^#import\s+\w+\s+as\s*$/.test(line) ||
      /^#import\s+\w+\s+as\s+from\b/.test(line)
    ) {
      return `Missing alias name after 'as'. Expected: #import ${line.split(/\s+/)[1]} as <alias> from '<module>'`;
    }

    // #import blur as glow — missing 'from'
    if (/^#import\s+\w+\s+as\s+\w+\s*$/.test(line)) {
      const parts = line.split(/\s+/);
      return `Missing 'from' clause. Expected: #import ${parts[1]} as ${parts[3]} from '<module>'`;
    }

    // #import blur from module — missing quotes around module name
    if (/^#import\s+\w+(?:\s+as\s+\w+)?\s+from\s+\w+/.test(line)) {
      const fromMatch = line.match(/from\s+(\S+)/);
      return `Module name must be quoted. Expected: from '${fromMatch?.[1]}'`;
    }

    return `Invalid syntax. Expected: #import <function> from '<module>'`;
  }

  private detectUniforms(): ShaderUniform[] {
    const uniformRegex =
      /^[ \t]*uniform\s+(?:(?:highp|mediump|lowp)\s+)?(\w+)\s+(\w+)(?:\[(\d+)\])?\s*;/gm;
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
      const arrayNum = match[3] ? parseInt(match[3], 10) : undefined;

      uniforms.push({ name, type, line: lineNumber, arrayNum });
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
