import { describe, it, expect } from "vitest";
import {
  SandboxError,
  SandboxModuleNotFoundError,
  SandboxModuleMethodNotFoundError,
  SandboxAtemptedToImportMainFunctionError,
  SandboxForbiddenModuleNameError,
  SandboxOverwriteModuleError,
  SandboxShaderVersionMismatchError,
  SandboxGLSLShaderCompilationError,
  SandboxShaderRequirementMismatchError,
  SandboxShaderWithoutFunctionError,
  SandboxShaderImportSyntaxError,
  SandboxWebGLNotSupportedError,
  SandboxContextCreationError,
  SandboxProgramError,
  SandboxOnLoadCallbackError,
  SandboxOnHookCallbackError,
} from "../src/errors";

// ─── Base Error ─────────────────────────────────────────────────────────────

describe("SandboxError — base", () => {
  it("is an instance of Error", () => {
    const err = new SandboxError("test", "UNKNOWN_ERROR");
    expect(err).toBeInstanceOf(Error);
  });

  it("has correct name", () => {
    const err = new SandboxError("test", "UNKNOWN_ERROR");
    expect(err.name).toBe("SandboxError");
  });

  it("stores error code", () => {
    const err = new SandboxError("test", "MODULE_ERROR");
    expect(err.code).toBe("MODULE_ERROR");
  });

  it("stores message", () => {
    const err = new SandboxError("something went wrong", "UNKNOWN_ERROR");
    expect(err.message).toBe("something went wrong");
  });
});

// ─── Module Errors ──────────────────────────────────────────────────────────

describe("Module errors", () => {
  it("SandboxModuleNotFoundError has MODULE_ERROR code", () => {
    const err = new SandboxModuleNotFoundError("mymod");
    expect(err.code).toBe("MODULE_ERROR");
    expect(err.message).toContain("mymod");
    expect(err.moduleName).toBe("mymod");
  });

  it("SandboxModuleMethodNotFoundError includes module and method names", () => {
    const err = new SandboxModuleMethodNotFoundError("effects", "blur");
    expect(err.code).toBe("MODULE_ERROR");
    expect(err.message).toContain("blur");
    expect(err.message).toContain("effects");
    expect(err.moduleName).toBe("effects");
    expect(err.methodName).toBe("blur");
  });

  it("SandboxAtemptedToImportMainFunctionError mentions main", () => {
    const err = new SandboxAtemptedToImportMainFunctionError("effects");
    expect(err.code).toBe("MODULE_ERROR");
    expect(err.message).toContain("main");
    expect(err.moduleName).toBe("effects");
  });

  it("SandboxForbiddenModuleNameError mentions forbidden name", () => {
    const err = new SandboxForbiddenModuleNameError("sandbox");
    expect(err.code).toBe("MODULE_ERROR");
    expect(err.message).toContain("sandbox");
  });

  it("SandboxOverwriteModuleError mentions module name", () => {
    const err = new SandboxOverwriteModuleError("effects");
    expect(err.code).toBe("MODULE_ERROR");
    expect(err.message).toContain("effects");
  });
});

// ─── Shader Errors ──────────────────────────────────────────────────────────

describe("Shader errors", () => {
  it("SandboxShaderVersionMismatchError includes versions", () => {
    const err = new SandboxShaderVersionMismatchError(1, 2);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toContain("1");
    expect(err.message).toContain("2");
    expect(err.vertexVersion).toBe(1);
    expect(err.fragmentVersion).toBe(2);
  });

  it("SandboxGLSLShaderCompilationError parses error lines", () => {
    const infoLog = "ERROR: 0:5: 'foo' : undeclared identifier\nERROR: 0:12: 'bar' : syntax error";
    const err = new SandboxGLSLShaderCompilationError("fragment", "source...", infoLog);
    expect(err.code).toBe("SHADER_ERROR");
    expect(err.shaderType).toBe("fragment");
    expect(err.lines).toContain(5);
    expect(err.lines).toContain(12);
    expect(err.lines).toEqual([5, 12]);
  });

  it("SandboxGLSLShaderCompilationError handles no line numbers", () => {
    const err = new SandboxGLSLShaderCompilationError(
      "vertex",
      "source...",
      "some generic error",
    );
    expect(err.lines).toEqual([]);
  });

  it("SandboxShaderRequirementMismatchError includes all details", () => {
    const err = new SandboxShaderRequirementMismatchError(
      "uniform",
      "u_color",
      "vec3",
      "vec4",
    );
    expect(err.code).toBe("SHADER_ERROR");
    expect(err.requirement).toBe("uniform");
    expect(err.name).toBe("u_color");
    expect(err.expectedType).toBe("vec3");
    expect(err.actualType).toBe("vec4");
    expect(err.message).toContain("vec3");
    expect(err.message).toContain("vec4");
  });

  it("SandboxShaderWithoutFunctionError has correct message", () => {
    const err = new SandboxShaderWithoutFunctionError();
    expect(err.code).toBe("SHADER_ERROR");
    expect(err.message).toContain("function");
  });

  it("SandboxShaderImportSyntaxError includes line and details", () => {
    const err = new SandboxShaderImportSyntaxError(5, "Missing '#' prefix");
    expect(err.code).toBe("SHADER_ERROR");
    expect(err.line).toBe(5);
    expect(err.details).toBe("Missing '#' prefix");
    expect(err.message).toContain("5");
    expect(err.message).toContain("Missing '#' prefix");
  });
});

// ─── Context Errors ─────────────────────────────────────────────────────────

describe("Context errors", () => {
  it("SandboxWebGLNotSupportedError has CONTEXT_ERROR code", () => {
    const err = new SandboxWebGLNotSupportedError();
    expect(err.code).toBe("CONTEXT_ERROR");
    expect(err.message).toContain("WebGL");
  });

  it("SandboxContextCreationError has CONTEXT_ERROR code", () => {
    const err = new SandboxContextCreationError();
    expect(err.code).toBe("CONTEXT_ERROR");
    expect(err.message).toContain("GPU");
  });
});

// ─── Program Errors ─────────────────────────────────────────────────────────

describe("Program errors", () => {
  it("SandboxProgramError includes info log", () => {
    const err = new SandboxProgramError("linking failed: attribute mismatch");
    expect(err.code).toBe("PROGRAM_ERROR");
    expect(err.infoLog).toBe("linking failed: attribute mismatch");
    expect(err.message).toContain("linking failed");
  });
});

// ─── Callback Errors ────────────────────────────────────────────────────────

describe("Callback errors", () => {
  it("SandboxOnLoadCallbackError wraps message", () => {
    const err = new SandboxOnLoadCallbackError("init crashed");
    expect(err.code).toBe("UNKNOWN_ERROR");
    expect(err.message).toContain("onLoad");
    expect(err.message).toContain("init crashed");
  });

  it("SandboxOnHookCallbackError includes hook ID", () => {
    const err = new SandboxOnHookCallbackError("abc123", "bad hook");
    expect(err.code).toBe("UNKNOWN_ERROR");
    expect(err.message).toContain("abc123");
    expect(err.message).toContain("bad hook");
  });
});
