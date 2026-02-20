import { SandboxError } from "./base";

export class SandboxWebGLNotSupportedError extends SandboxError {
  constructor() {
    super("WebGL is not supported in this browser.", "CONTEXT_ERROR");
  }
}

export class SandboxContextCreationError extends SandboxError {
  constructor() {
    super(
      "Failed to create WebGL context. The GPU may be unavailable.",
      "CONTEXT_ERROR",
    );
  }
}
