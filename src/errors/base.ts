export type SandboxErrorCode =
  | "CONTEXT_ERROR"
  | "VALIDATION_ERROR"
  | "PROGRAM_ERROR"
  | "SHADER_ERROR"
  | "MODULE_ERROR"
  | "UNKNOWN_ERROR";

export class SandboxError extends Error {
  public readonly name: string = "SandboxError";
  constructor(
    message: string,
    public readonly code: SandboxErrorCode,
  ) {
    super(message);
  }
}
