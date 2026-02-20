import { SandboxError } from "./base";

export class SandboxProgramError extends SandboxError {
  constructor(public readonly infoLog: string) {
    super(`Shader program linking failed\n\n${infoLog}`, "PROGRAM_ERROR");
  }
}
