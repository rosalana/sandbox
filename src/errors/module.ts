import { SandboxError } from "./errors";

export class SandboxModuleNotFoundError extends SandboxError {
  constructor(public readonly moduleName: string) {
    super(`Shader module not found: ${moduleName}`, "MODULE_ERROR");
  }
}

export class SandboxModuleMethodNotFoundError extends SandboxError {
  constructor(
    public readonly moduleName: string,
    public readonly methodName: string,
  ) {
    super(
      `Method '${methodName}' not found in shader module: ${moduleName}`,
      "MODULE_ERROR",
    );
  }
}

export class SandboxModuleCircularDependencyError extends SandboxError {
  constructor(public readonly chain: string[]) {
    super(
      `Circular dependency detected in shader modules: ${chain.join(" -> ")}`,
      "MODULE_ERROR",
    );
  }
}
