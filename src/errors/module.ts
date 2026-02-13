import { SandboxError } from "./base";

export class SandboxModuleNotFoundError extends SandboxError {
  constructor(public readonly moduleName: string) {
    super(
      `Can not find module '${moduleName}'. Check if it is defined before usage or if the name is correct.`,
      "MODULE_ERROR",
    );
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

export class SandboxAtemptedToImportMainFunctionError extends SandboxError {
  constructor(public readonly moduleName: string) {
    super(
      `Importing 'main' function from module '${moduleName}' is forbidden.`,
      "MODULE_ERROR",
    );
  }
}

export class SandboxForbiddenModuleNameError extends SandboxError {
  constructor(public readonly moduleName: string) {
    super(
      `Module name '${moduleName}' is not allowed. Module names cannot be 'sandbox' or start with 'sandbox/'.`,
      "MODULE_ERROR",
    );
  }
}

export class SandboxOverwriteModuleError extends SandboxError {
  constructor(public readonly moduleName: string) {
    super(
      `Module '${moduleName}' is already defined. Overwriting existing modules is not allowed.`,
      "MODULE_ERROR",
    );
  }
}
