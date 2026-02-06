/** Error codes for Sandbox errors */
export type SandboxErrorCode =
  | "WEBGL_NOT_SUPPORTED"
  | "CONTEXT_CREATION_FAILED"
  | "SHADER_COMPILATION_FAILED"
  | "PROGRAM_LINK_FAILED"
  | "SHADER_VERSION_MISMATCH"
  | "MODULE_NOT_FOUND"
  | "MODULE_METHOD_NOT_FOUND"
  | "UNKNOWN_ERROR";

/** Base error class for all Sandbox errors */
export class SandboxError extends Error {
  constructor(
    message: string,
    public readonly code: SandboxErrorCode,
  ) {
    super(message);
    this.name = "SandboxError";
  }
}

/** WebGL context creation failure */
export class SandboxContextError extends SandboxError {
  constructor(reason: "not_supported" | "creation_failed") {
    const message =
      reason === "not_supported"
        ? "WebGL is not supported in this browser."
        : "Failed to create WebGL context. The GPU may be unavailable.";

    super(
      message,
      reason === "not_supported"
        ? "WEBGL_NOT_SUPPORTED"
        : "CONTEXT_CREATION_FAILED",
    );
    this.name = "SandboxContextError";
  }
}

export class SandboxShaderVersionMismatchError extends SandboxError {
  constructor(
    public readonly vertexVersion: number,
    public readonly fragmentVersion: number,
  ) {
    super(
      `Vertex and fragment shader WebGL versions do not match (${vertexVersion} vs ${fragmentVersion})`,
      "SHADER_VERSION_MISMATCH",
    );
    this.name = "SandboxShaderVersionMismatchError";
  }
}

/** Shader compilation failure with line info extraction */
export class SandboxShaderCompilationError extends SandboxError {
  /** Line numbers where errors occurred */
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
      "SHADER_COMPILATION_FAILED",
    );

    this.name = "SandboxShaderCompilationError";
    this.lines = lines;
  }

  /** Parse error log to extract line numbers */
  private static parseErrorLines(infoLog: string): number[] {
    // Common patterns:
    // "ERROR: 0:15: ..." (Chrome/ANGLE)
    // "ERROR: :15: ..." (Firefox)
    // "0:15(0): error: ..." (Mesa)
    const patterns = [
      /ERROR:\s*\d*:(\d+)/g, // Chrome/ANGLE: ERROR: 0:15
      /(\d+):(\d+)\(\d+\):/g, // Mesa: 0:15(0):
      /^(\d+):/gm, // Simple: 15:
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

/** Shader program linking failure */
export class SandboxProgramError extends SandboxError {
  constructor(public readonly infoLog: string) {
    super(`Shader program linking failed\n\n${infoLog}`, "PROGRAM_LINK_FAILED");
    this.name = "SandboxProgramError";
  }
}

export class SandboxModuleNotFoundError extends SandboxError {
  constructor(public readonly moduleName: string) {
    super(`Shader module not found: ${moduleName}`, "MODULE_NOT_FOUND");
    this.name = "SandboxModuleNotFoundError";
  }
}

export class SandboxModuleMethodNotFoundError extends SandboxError {
  constructor(
    public readonly moduleName: string,
    public readonly methodName: string,
  ) {
    super(
      `Method '${methodName}' not found in shader module: ${moduleName}`,
      "MODULE_METHOD_NOT_FOUND",
    );
    this.name = "SandboxModuleMethodNotFoundError";
  }
}
