import { SandboxError } from "./base";

export class SandboxShaderVersionMismatchError extends SandboxError {
  constructor(
    public readonly vertexVersion: number,
    public readonly fragmentVersion: number,
  ) {
    super(
      `Vertex and fragment shader WebGL versions do not match (${vertexVersion} vs ${fragmentVersion})`,
      "VALIDATION_ERROR",
    );
  }
}

export class SandboxGLSLShaderCompilationError extends SandboxError {
  public readonly lines: number[];

  constructor(
    public readonly shaderType: "vertex" | "fragment",
    public readonly source: string,
    public readonly infoLog: string,
  ) {
    const lines = SandboxGLSLShaderCompilationError.parseErrorLines(infoLog);
    const lineInfo = lines.length > 0 ? ` at line(s): ${lines.join(", ")}` : "";

    super(
      `${shaderType} shader compilation failed${lineInfo}\n\n${infoLog}`,
      "SHADER_ERROR",
    );
    this.lines = lines;
  }

  private static parseErrorLines(infoLog: string): number[] {
    const patterns = [
      /ERROR:\s*\d*:(\d+)/g,
      /(\d+):(\d+)\(\d+\):/g,
      /^(\d+):/gm,
    ];

    const lines: Set<number> = new Set();

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(infoLog)) !== null) {
        const lineNum = parseInt(match[1], 10);
        if (lineNum > 0) {
          lines.add(lineNum);
        }
      }
    }

    return [...lines].sort((a, b) => a - b);
  }
}

export class SandboxShaderRequirementMismatchError extends SandboxError {
  constructor(
    public readonly requirement: "uniform" | "function",
    public readonly name: string,
    public readonly expectedType: string,
    public readonly actualType: string,
  ) {
    super(
      `The shader ${requirement} "${name}" has type "${actualType}" but expected "${expectedType}"`,
      "SHADER_ERROR",
    );
  }
}

export class SandboxShaderWithoutMainFunctionError extends SandboxError {
  constructor() {
    super(
      `Shader source does not contain a main() function. Ensure that your shader code defines a main() function as the entry point.`,
      "SHADER_ERROR",
    );
  }
}

export class SandboxShaderImportSyntaxError extends SandboxError {
  constructor(
    public readonly line: number,
    public readonly details: string,
  ) {
    super(
      `Syntax error in shader import statement at line ${line}: ${details}`,
      "SHADER_ERROR",
    );
  }
}
