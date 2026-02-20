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

export class SandboxAttemptedToImportMainFunctionError extends SandboxError {
  constructor(public readonly moduleName: string) {
    super(
      `Importing 'main' function from module '${moduleName}' is forbidden.`,
      "MODULE_ERROR",
    );
  }
}

export class SandboxAttemptedToImportDefaultFunctionError extends SandboxError {
  constructor(public readonly moduleName: string) {
    super(
      `Name 'default' is reserved and cannot be used as a function name in module '${moduleName}'.`,
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

export class SandboxMentionUniformNotFoundError extends SandboxError {
  constructor(
    public readonly moduleName: string,
    public readonly functionName: string,
    public readonly uniformName: string,
  ) {
    super(
      `Uniform '${uniformName}' mentioned for function '${functionName}' of module '${moduleName}' was not found among the module's declared uniforms. Check if the uniform is declared in the module source code or if the name is correct.`,
      "MODULE_ERROR",
    );
  }
}

export class SandboxMentionFunctionNotFoundError extends SandboxError {
  constructor(
    public readonly functionName: string,
    public readonly uniformName: string,
  ) {
    super(
      `Uniform '${uniformName}' mentioned for function '${functionName}' was not imported from any module. Check if the function is imported from the correct module and if the uniform is declared in that module's source code with the correct name.`,
      "MODULE_ERROR",
    );
  }
}

export class SandboxMentionCouldNotBeReplacedError extends SandboxError {
  constructor(
    public readonly mentionName: string,
    public readonly calledInFunction: string,
  ) {
    super(
      `Mention '${mentionName}' called in function '${calledInFunction}' could not be replaced with the corresponding uniform reference. There might be an issue with the compilation process because the referenced uniform was not found among the shader requirements. Try use a different name for uniforms you want to mention in functions or check if the uniform is properly declared and mentioned in the module source code.`,
      "MODULE_ERROR",
    )
  }
}
