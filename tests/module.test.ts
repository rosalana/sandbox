import { describe, it, expect, beforeEach } from "vitest";
// Import globals first to avoid circular dependency resolution issue
// (globals → Module → Compilable → globals)
import { modules as MODULES } from "../src/globals";
import Module from "../src/tools/module";
import {
  SandboxModuleNotFoundError,
  SandboxModuleMethodNotFoundError,
  SandboxAtemptedToImportMainFunctionError,
  SandboxForbiddenModuleNameError,
  SandboxOverwriteModuleError,
} from "../src/errors";

// Helper to clean up registered modules after each test
function cleanupModule(name: string) {
  if (MODULES.has(name)) {
    MODULES.remove(name);
  }
}

// ─── Module.define ──────────────────────────────────────────────────────────

describe("Module.define", () => {
  it("defines and registers a module", () => {
    const mod = Module.define({
      name: "test_define",
      source: `vec3 myFunc(float t) { return vec3(t); }`,
    });
    expect(mod).toBeInstanceOf(Module);
    expect(mod.name).toBe("test_define");
    expect(MODULES.has("test_define")).toBe(true);
    cleanupModule("test_define");
  });

  it("defines module with options", () => {
    const mod = Module.define({
      name: "test_opts",
      source: `
        uniform float u_intensity;
        vec3 glow(float t) { return vec3(t * u_intensity); }
      `,
      options: {
        glow: {
          intensity: { uniform: "u_intensity", default: 0.5 },
        },
      },
    });
    expect(mod.options).toHaveProperty("glow");
    expect(mod.options!.glow.intensity.uniform).toBe("u_intensity");
    expect(mod.options!.glow.intensity.default).toBe(0.5);
    cleanupModule("test_opts");
  });

  it("forbids 'sandbox' as module name", () => {
    expect(() =>
      Module.define({ name: "sandbox", source: `void f() { }` }),
    ).toThrow(SandboxForbiddenModuleNameError);
  });

  it("forbids names starting with 'sandbox/'", () => {
    expect(() =>
      Module.define({ name: "sandbox/utils", source: `void f() { }` }),
    ).toThrow(SandboxForbiddenModuleNameError);
  });

  it("throws on duplicate module name", () => {
    Module.define({ name: "test_dup", source: `void f() { }` });
    expect(() =>
      Module.define({ name: "test_dup", source: `void g() { }` }),
    ).toThrow(SandboxOverwriteModuleError);
    cleanupModule("test_dup");
  });
});

// ─── Module.resolve ─────────────────────────────────────────────────────────

describe("Module.resolve", () => {
  it("resolves a registered module", () => {
    Module.define({ name: "test_resolve", source: `void f() { }` });
    const mod = Module.resolve("test_resolve");
    expect(mod.name).toBe("test_resolve");
    cleanupModule("test_resolve");
  });

  it("throws on unregistered module", () => {
    expect(() => Module.resolve("nonexistent_xyz")).toThrow(
      SandboxModuleNotFoundError,
    );
  });
});

// ─── Module.extract ─────────────────────────────────────────────────────────

describe("Module.extract", () => {
  it("extracts a function from module", () => {
    const mod = Module.define({
      name: "test_extract",
      source: `
        vec3 gradient(float t) {
          return vec3(t, t * 0.5, 1.0 - t);
        }
      `,
    });

    const extraction = mod.extract("gradient");
    expect(extraction.function.name).toBe("gradient");
    expect(extraction.function.type).toBe("vec3");
    expect(extraction.function.params).toHaveLength(1);
    cleanupModule("test_extract");
  });

  it("throws when extracting 'main'", () => {
    const mod = Module.define({
      name: "test_no_main",
      source: `
        void helper() { }
        void main() { helper(); }
      `,
    });

    expect(() => mod.extract("main")).toThrow(
      SandboxAtemptedToImportMainFunctionError,
    );
    cleanupModule("test_no_main");
  });

  it("throws when function does not exist", () => {
    const mod = Module.define({
      name: "test_missing_fn",
      source: `vec3 gradient(float t) { return vec3(t); }`,
    });

    expect(() => mod.extract("nonexistent")).toThrow(
      SandboxModuleMethodNotFoundError,
    );
    cleanupModule("test_missing_fn");
  });

  it("collects uniform dependencies", () => {
    const mod = Module.define({
      name: "test_uniform_deps",
      source: `
        uniform float u_intensity;
        uniform vec2 u_offset;
        vec3 effect(float t) {
          return vec3(t * u_intensity) + vec3(u_offset, 0.0);
        }
      `,
    });

    const extraction = mod.extract("effect");
    const uniformNames = extraction.dependencies.uniforms.map((u) => u.name);
    expect(uniformNames).toContain("u_intensity");
    expect(uniformNames).toContain("u_offset");
    cleanupModule("test_uniform_deps");
  });

  it("collects helper function dependencies (tree-shaking)", () => {
    const mod = Module.define({
      name: "test_helpers",
      source: `
        float helper1() { return 1.0; }
        float helper2() { return helper1() * 2.0; }
        float unused() { return 99.0; }
        vec3 effect(float t) {
          return vec3(helper2() * t);
        }
      `,
    });

    const extraction = mod.extract("effect");
    const depNames = extraction.dependencies.functions.map((f) => f.name);

    // Should include helper2 (direct dep) and helper1 (transitive dep)
    expect(depNames).toContain("helper2");
    expect(depNames).toContain("helper1");

    // Should NOT include unused
    expect(depNames).not.toContain("unused");
    cleanupModule("test_helpers");
  });

  it("handles deep transitive dependencies", () => {
    const mod = Module.define({
      name: "test_deep_deps",
      source: `
        float level3() { return 3.0; }
        float level2() { return level3() + 2.0; }
        float level1() { return level2() + 1.0; }
        float top() { return level1(); }
      `,
    });

    const extraction = mod.extract("top");
    const depNames = extraction.dependencies.functions.map((f) => f.name);
    expect(depNames).toContain("level1");
    expect(depNames).toContain("level2");
    expect(depNames).toContain("level3");
    cleanupModule("test_deep_deps");
  });

  it("handles function with no dependencies", () => {
    const mod = Module.define({
      name: "test_no_deps",
      source: `
        float rand(vec2 co) {
          return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
        }
      `,
    });

    const extraction = mod.extract("rand");
    expect(extraction.dependencies.functions).toHaveLength(0);
    expect(extraction.dependencies.uniforms).toHaveLength(0);
    cleanupModule("test_no_deps");
  });

  it("does not collect built-in GLSL functions as dependencies", () => {
    const mod = Module.define({
      name: "test_builtins",
      source: `
        vec3 effect(float t) {
          return vec3(sin(t), cos(t), abs(t));
        }
      `,
    });

    const extraction = mod.extract("effect");
    // sin, cos, abs are GLSL built-ins — they're not in scope functions
    expect(extraction.dependencies.functions).toHaveLength(0);
    cleanupModule("test_builtins");
  });
});

// ─── Module.copy ────────────────────────────────────────────────────────────

describe("Module.copy", () => {
  it("creates an independent copy", () => {
    const mod = Module.define({
      name: "test_copy",
      source: `
        uniform float u_intensity;
        vec3 effect(float t) { return vec3(t * u_intensity); }
      `,
      options: {
        effect: {
          intensity: { uniform: "u_intensity", default: 1.0 },
        },
      },
    });

    const copy = mod.copy();
    expect(copy.name).toBe(mod.name);
    expect(copy.options).not.toBe(mod.options); // Different reference

    // Mutating copy should not affect original
    copy.options!.effect.intensity.default = 999;
    expect(mod.options!.effect.intensity.default).toBe(1.0);
    cleanupModule("test_copy");
  });
});

// ─── Module.getDefinition ───────────────────────────────────────────────────

describe("Module.getDefinition", () => {
  it("returns module definition with methods list", () => {
    const mod = Module.define({
      name: "test_definition",
      source: `
        float helper() { return 1.0; }
        vec3 gradient(float t) { return vec3(t); }
        vec4 bloom(vec2 uv) { return vec4(uv, 0.0, 1.0); }
        void main() { gradient(0.5); }
      `,
    });

    const def = mod.getDefinition();
    expect(def.name).toBe("test_definition");
    // main is excluded from methods
    expect(def.methods).toContain("helper");
    expect(def.methods).toContain("gradient");
    expect(def.methods).toContain("bloom");
    expect(def.methods).not.toContain("main");
    cleanupModule("test_definition");
  });
});
