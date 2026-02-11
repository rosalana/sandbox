import {
  GLSLType,
  GLSLVariable,
  ShaderFunction,
  ShaderImport,
  ShaderUniform,
  WebGLVersion,
} from "../types";

export function parseGLSLVersion(source: string): WebGLVersion {
  return /^\s*#version\s+300\s+es/m.test(source) ? 2 : 1;
}

/**
 * Parse shader source to extract imports statements.
 */
export function parseImports(source: string): ShaderImport[] {
  const importRegex =
    /^[ \t]*#import\s+(\w+)(?:\s+as\s+(\w+))?\s+from\s+["'](.+)["']/gm;
  const imports: ShaderImport[] = [];

  let match: RegExpExecArray | null;
  let lineNumber = 1;
  let lastIndex = 0;

  while ((match = importRegex.exec(source)) !== null) {
    lineNumber += (source.substring(lastIndex, match.index).match(/\n/g) || [])
      .length;
    lastIndex = match.index;

    const name = match[1];
    const alias = match[2] || match[1];
    const module = match[3];

    imports.push({ name, alias, module, line: lineNumber });
  }

  return imports;
}

/**
 * Parse shader source to extract uniform declarations.
 */
export function parseUniforms(source: string): ShaderUniform[] {
  const uniformRegex =
    /^[ \t]*uniform\s+(?:(?:highp|mediump|lowp)\s+)?(\w+)\s+(\w+)\s*;/gm;
  const uniforms: ShaderUniform[] = [];

  let match: RegExpExecArray | null;
  let lineNumber = 1;
  let lastIndex = 0;

  while ((match = uniformRegex.exec(source)) !== null) {
    lineNumber += (source.substring(lastIndex, match.index).match(/\n/g) || [])
      .length;
    lastIndex = match.index;

    const type = match[1] as GLSLType;
    const name = match[2];

    uniforms.push({ name, type, line: lineNumber });
  }

  return uniforms;
}

/**
 * Parse shader source to extract function definitions.
 */
export function parseFunctions(source: string): ShaderFunction[] {
  const functions: ShaderFunction[] = [];

  const returnTypes =
    "void|float|int|uint|bool|vec[234]|ivec[234]|uvec[234]|bvec[234]|mat[234](?:x[234])?|sampler2D|samplerCube|sampler3D|sampler2DArray";

  const funcRegex = new RegExp(
    `^[ \\t]*(${returnTypes})\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`,
    "gm",
  );

  let match: RegExpExecArray | null;

  while ((match = funcRegex.exec(source)) !== null) {
    const returnType = match[1];
    const name = match[2];
    const paramsStr = match[3].trim();
    const startIndex = match.index;

    // Calculate line number
    const lineNumber =
      (source.substring(0, startIndex).match(/\n/g) || []).length + 1;

    // Find function body using brace counting
    const bodyStartIndex = source.indexOf("{", startIndex);
    const bodyEndIndex = findClosingBrace(source, bodyStartIndex);

    if (bodyEndIndex === -1) continue;

    // Extract body (including braces)
    const body = source.slice(bodyStartIndex, bodyEndIndex + 1);

    // Parse parameters
    const params = parseParams(paramsStr);

    functions.push({
      name,
      type: returnType as GLSLType,
      params,
      body,
      line: lineNumber,
    });
  }

  return functions;
}

function parseParams(paramsStr: string): GLSLVariable[] {
  if (!paramsStr.trim()) return [];

  const params: import("../types").GLSLVariable[] = [];
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

function findClosingBrace(source: string, startIndex: number): number {
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
