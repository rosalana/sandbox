import { SandboxError } from "./base";

export class SandboxModuleNotFoundError extends SandboxError {
  constructor(public readonly moduleName: string) {
    super(`Can not find module '${moduleName}'. Check if it is defined before usage or if the name is correct.`, "MODULE_ERROR");
  }
}

export class SandboxModuleMethodNotFoundError extends SandboxError {
  constructor(
    public readonly moduleName: string,
    public readonly methodName: string,
  ) {
    super(
      `Method '${methodName}' not found in shader module '${moduleName}'. Check if the method is defined in the module source code or if the name is correct.`,
      "MODULE_ERROR",
    );
  }
}