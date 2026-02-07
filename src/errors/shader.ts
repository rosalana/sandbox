import { SandboxError } from "./errors";

export class SandboxShaderVersionMismatchError extends SandboxError {
  constructor(
    public readonly vertexVersion: number,
    public readonly framentVersion: number,
  ) {
    super(
      `Vertex and fragment shader WebGL versions do not match (${vertexVersion} vs ${framentVersion})`,
      "VALIDATION_ERROR",
    );
  }
}

export class SandboxShaderCompilationError extends SandboxError {
  public readonly lines: number[];

  constructor(
    public readonly shaderType: "vertex" | "fragment",
    public readonly source: string,
    public readonly infoLog: string,
  ) {
    const lines = SandboxShaderCompilationError.parseErrorLines(infoLog);
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
