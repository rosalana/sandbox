import { describe, it, expect, beforeEach, afterEach } from "vitest";
// Import globals first to avoid circular dependency resolution issue
import { modules as MODULES, runtime_modules as RUNTIME_MODULES } from "../src/globals";
import Module from "../src/tools/module";
import Shader from "../src/tools/shader";

function cleanupModule(name: string) {
  if (MODULES.has(name)) MODULES.remove(name);
}

afterEach(() => {
  RUNTIME_MODULES.clear();
});

// ─── Basic Compilation ──────────────────────────────────────────────────────

describe("Compilable — basic compilation", () => {
  it("compiles shader without imports (passthrough)", () => {
    const shader = new Shader(`
      precision mediump float;
      uniform float u_time;
      void main() {
        gl_FragColor = vec4(u_time);
      }
    `);
    const result = shader.compile();
    expect(result).toContain("void main()");
    expect(result).toContain("u_time");
  });

  it("returns same result on second compile call (caching)", () => {
    const shader = new Shader(`
      void main() { gl_FragColor = vec4(1.0); }
    `);
    const r1 = shader.compile();
    const r2 = shader.compile();
    expect(r1).toBe(r2); // Same reference
  });

  it("recompile forces fresh compilation", () => {
    const shader = new Shader(`
      void main() { gl_FragColor = vec4(1.0); }
    `);
    const r1 = shader.compile();
    const r2 = shader.recompile();
    // Content should be the same but it's a fresh pass
    expect(r2).toContain("void main()");
  });

  it("preserves original source", () => {
    const src = `void main() { gl_FragColor = vec4(1.0); }`;
    const shader = new Shader(src);
    shader.compile();
    expect(shader.source()).toBe(src);
  });
});

// ─── Shader Built-in Uniforms ───────────────────────────────────────────────

describe("Shader — built-in uniform injection", () => {
  it("adds built-in uniforms to requirements on construction", () => {
    const shader = new Shader(`
      void main() { gl_FragColor = vec4(1.0); }
    `);
    // Built-in uniforms should be in requirements
    // They get added to the compiled output
    const compiled = shader.compile();
    expect(compiled).toContain("u_resolution");
    expect(compiled).toContain("u_time");
    expect(compiled).toContain("u_delta");
    expect(compiled).toContain("u_mouse");
    expect(compiled).toContain("u_frame");
  });

  it("does not duplicate built-in uniforms already declared", () => {
    const shader = new Shader(`
      uniform float u_time;
      uniform vec2 u_resolution;
      void main() { gl_FragColor = vec4(u_time); }
    `);
    const compiled = shader.compile();

    // Count occurrences of uniform declarations
    const timeMatches = compiled.match(/uniform\s+float\s+u_time/g);
    const resMatches = compiled.match(/uniform\s+vec2\s+u_resolution/g);

    // Should only appear once each
    expect(timeMatches).toHaveLength(1);
    expect(resMatches).toHaveLength(1);
  });
});

// ─── Import Resolution ──────────────────────────────────────────────────────

describe("Compilable — import resolution", () => {
  it("resolves simple import and inserts function", () => {
    Module.define({
      name: "test_import_basic",
      source: `
        vec3 gradient(float t) {
          return vec3(t, t * 0.5, 1.0 - t);
        }
      `,
    });

    const shader = new Shader(`
      #import gradient from 'test_import_basic'
      void main() {
        vec3 c = gradient(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    const compiled = shader.compile();

    // Import line should be removed
    expect(compiled).not.toContain("#import");

    // Function should exist (with aliased name = gradient since no alias)
    expect(compiled).toContain("gradient");

    // Should still have main
    expect(compiled).toContain("void main()");

    cleanupModule("test_import_basic");
  });

  it("resolves import with alias", () => {
    Module.define({
      name: "test_import_alias",
      source: `
        vec3 gradient(float t) {
          return vec3(t, t * 0.5, 1.0 - t);
        }
      `,
    });

    const shader = new Shader(`
      #import gradient as myGrad from 'test_import_alias'
      void main() {
        vec3 c = myGrad(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    const compiled = shader.compile();

    // The function should be renamed to the alias
    expect(compiled).toContain("myGrad");

    cleanupModule("test_import_alias");
  });

  it("registers module copy in runtime_modules on import", () => {
    Module.define({
      name: "test_runtime_reg",
      source: `vec3 gradient(float t) { return vec3(t); }`,
    });

    RUNTIME_MODULES.clear();

    const shader = new Shader(`
      #import gradient from 'test_runtime_reg'
      void main() { vec3 c = gradient(0.5); gl_FragColor = vec4(c, 1.0); }
    `);
    shader.compile();

    expect(RUNTIME_MODULES.has("test_runtime_reg")).toBe(true);
    cleanupModule("test_runtime_reg");
  });
});

// ─── Uniform Namespacing ────────────────────────────────────────────────────

describe("Compilable — uniform namespacing", () => {
  it("namespaces module uniforms to avoid collisions", () => {
    Module.define({
      name: "test_ns",
      source: `
        uniform float u_intensity;
        vec3 glow(float t) { return vec3(t * u_intensity); }
      `,
    });

    const shader = new Shader(`
      #import glow from 'test_ns'
      void main() {
        vec3 c = glow(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    const compiled = shader.compile();

    // The original u_intensity should be namespaced (prefixed with alias + unique suffix)
    // It should NOT have a bare u_intensity declaration
    // The pattern is: glow_{randomSuffix}_u_intensity
    const uniformDecls = compiled.match(/uniform\s+float\s+(\w+)/g) || [];
    const namespacedIntensity = uniformDecls.find((d) =>
      d.includes("u_intensity") && d.includes("glow"),
    );
    expect(namespacedIntensity).toBeDefined();

    cleanupModule("test_ns");
  });

  it("does not namespace built-in uniforms", () => {
    Module.define({
      name: "test_no_ns_builtin",
      source: `
        uniform float u_time;
        uniform float u_custom;
        vec3 effect(float t) { return vec3(u_time * u_custom); }
      `,
    });

    const shader = new Shader(`
      #import effect from 'test_no_ns_builtin'
      void main() {
        vec3 c = effect(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    const compiled = shader.compile();

    // u_time should NOT be namespaced (it's built-in)
    // But u_custom SHOULD be namespaced
    const lines = compiled.split("\n");
    const uniformLines = lines.filter((l) => l.includes("uniform"));

    // There should be a namespaced u_custom
    const hasNamespacedCustom = uniformLines.some(
      (l) => l.includes("u_custom") && l.includes("effect"),
    );
    expect(hasNamespacedCustom).toBe(true);

    // u_time should remain as-is (built-in)
    const hasPlainTime = uniformLines.some(
      (l) => l.includes("u_time") && !l.includes("effect_"),
    );
    expect(hasPlainTime).toBe(true);

    cleanupModule("test_no_ns_builtin");
  });

  it("two imports from same module get different namespaces", () => {
    Module.define({
      name: "test_double_import",
      source: `
        uniform float u_intensity;
        vec3 effect(float t) { return vec3(t * u_intensity); }
        vec3 other(float t) { return vec3(t + u_intensity); }
      `,
    });

    const shader = new Shader(`
      #import effect from 'test_double_import'
      #import other from 'test_double_import'
      void main() {
        vec3 a = effect(0.5);
        vec3 b = other(0.5);
        gl_FragColor = vec4(a + b, 1.0);
      }
    `);

    const compiled = shader.compile();

    // Should have two separate namespaced u_intensity uniforms
    const intensityDecls =
      compiled.match(/uniform\s+float\s+\w*u_intensity/g) || [];
    expect(intensityDecls.length).toBeGreaterThanOrEqual(2);

    cleanupModule("test_double_import");
  });

  it("same function imported twice with different aliases gets separate namespaces", () => {
    Module.define({
      name: "test_alias_ns",
      source: `
        uniform float u_intensity;
        vec3 effect(float t) { return vec3(t * u_intensity); }
      `,
    });

    const shader = new Shader(`
      #import effect as softEffect from 'test_alias_ns'
      #import effect as hardEffect from 'test_alias_ns'
      void main() {
        vec3 a = softEffect(0.5);
        vec3 b = hardEffect(1.0);
        gl_FragColor = vec4(a + b, 1.0);
      }
    `);

    const compiled = shader.compile();

    // Both aliases should appear in the compiled output
    expect(compiled).toContain("softEffect");
    expect(compiled).toContain("hardEffect");

    // Each should have its own uniform
    const intensityDecls =
      compiled.match(/uniform\s+float\s+\w*u_intensity/g) || [];
    expect(intensityDecls.length).toBe(2);

    cleanupModule("test_alias_ns");
  });
});

// ─── Helper Function Namespacing ────────────────────────────────────────────

describe("Compilable — helper function namespacing", () => {
  it("namespaces helper functions to prevent collisions", () => {
    Module.define({
      name: "test_helper_ns",
      source: `
        float internalHelper() { return 1.0; }
        vec3 effect(float t) { return vec3(internalHelper() * t); }
      `,
    });

    const shader = new Shader(`
      #import effect from 'test_helper_ns'
      void main() {
        vec3 c = effect(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    const compiled = shader.compile();

    // internalHelper should be namespaced
    expect(compiled).not.toMatch(/\bfloat internalHelper\(\)/);
    expect(compiled).toMatch(/internalHelper/); // Still exists but prefixed

    cleanupModule("test_helper_ns");
  });

  it("rewrites helper function calls inside the main function body", () => {
    Module.define({
      name: "test_helper_rewrite",
      source: `
        uniform float u_val;
        float helper() { return u_val; }
        vec3 effect(float t) { return vec3(helper() * t); }
      `,
    });

    const shader = new Shader(`
      #import effect from 'test_helper_rewrite'
      void main() {
        vec3 c = effect(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    const compiled = shader.compile();

    // Inside the effect function body, helper() should be rewritten to namespaced version
    // The uniform u_val in helper's body should also be namespaced
    // Both should share the same namespace prefix
    expect(compiled).not.toContain("return u_val;");

    cleanupModule("test_helper_rewrite");
  });
});

// ─── Options Rewriting ──────────────────────────────────────────────────────

describe("Compilable — options rewriting during extraction", () => {
  it("rewrites option uniform names to namespaced versions", () => {
    Module.define({
      name: "test_opt_rewrite",
      source: `
        uniform float u_intensity;
        vec3 glow(float t) { return vec3(t * u_intensity); }
      `,
      options: {
        glow: {
          intensity: { uniform: "u_intensity", default: 1.0 },
        },
      },
    });

    const shader = new Shader(`
      #import glow from 'test_opt_rewrite'
      void main() {
        vec3 c = glow(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    shader.compile();

    // After compilation, the runtime module copy should have its option's uniform
    // rewritten to the namespaced version
    const opts = RUNTIME_MODULES.resolveOptions("glow");
    expect(opts).not.toBeNull();
    expect(opts!.intensity.uniform).toContain("glow");
    expect(opts!.intensity.uniform).toContain("u_intensity");

    cleanupModule("test_opt_rewrite");
  });

  it("renames options key from function name to alias", () => {
    Module.define({
      name: "test_opt_alias",
      source: `
        uniform float u_intensity;
        vec3 bloom(float t) { return vec3(t * u_intensity); }
      `,
      options: {
        bloom: {
          intensity: { uniform: "u_intensity", default: 0.8 },
        },
      },
    });

    const shader = new Shader(`
      #import bloom as glow from 'test_opt_alias'
      void main() {
        vec3 c = glow(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    shader.compile();

    // Options should be accessible under the alias "glow", not "bloom"
    const opts = RUNTIME_MODULES.resolveOptions("glow");
    expect(opts).not.toBeNull();
    expect(opts!.intensity).toBeDefined();

    cleanupModule("test_opt_alias");
  });
});

// ─── Build Output Structure ─────────────────────────────────────────────────

describe("Compilable — build output", () => {
  it("import lines are removed from final output", () => {
    Module.define({
      name: "test_remove_import",
      source: `vec3 gradient(float t) { return vec3(t); }`,
    });

    const shader = new Shader(`
      #import gradient from 'test_remove_import'
      void main() {
        vec3 c = gradient(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    const compiled = shader.compile();
    expect(compiled).not.toContain("#import");

    cleanupModule("test_remove_import");
  });

  it("imported functions appear before main", () => {
    Module.define({
      name: "test_order",
      source: `vec3 gradient(float t) { return vec3(t); }`,
    });

    const shader = new Shader(`
      #import gradient from 'test_order'
      void main() {
        vec3 c = gradient(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    const compiled = shader.compile();

    // The imported function should appear before main
    const gradientPos = compiled.indexOf("gradient");
    const mainPos = compiled.indexOf("void main()");
    expect(gradientPos).toBeLessThan(mainPos);

    cleanupModule("test_order");
  });

  it("imported uniform declarations appear at top", () => {
    Module.define({
      name: "test_uniform_pos",
      source: `
        uniform float u_custom;
        vec3 effect(float t) { return vec3(t * u_custom); }
      `,
    });

    const shader = new Shader(`
      #import effect from 'test_uniform_pos'
      void main() {
        vec3 c = effect(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    const compiled = shader.compile();

    // Uniform declarations should come before function code
    const uniformPos = compiled.indexOf("uniform float");
    const functionPos = compiled.search(/vec3\s+\w*effect/);
    expect(uniformPos).toBeLessThan(functionPos);

    cleanupModule("test_uniform_pos");
  });

  it("no triple+ newlines in output", () => {
    Module.define({
      name: "test_clean",
      source: `vec3 gradient(float t) { return vec3(t); }`,
    });

    const shader = new Shader(`
      #import gradient from 'test_clean'

      void main() {
        vec3 c = gradient(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    const compiled = shader.compile();
    expect(compiled).not.toMatch(/\n{3,}/);

    cleanupModule("test_clean");
  });
});

// ─── Version Detection ──────────────────────────────────────────────────────

describe("Shader — version detection", () => {
  it("detects WebGL1 shader version", () => {
    const shader = new Shader(`
      precision mediump float;
      void main() { gl_FragColor = vec4(1.0); }
    `);
    expect(shader.version()).toBe(1);
  });

  it("detects WebGL2 shader version", () => {
    const shader = new Shader(`#version 300 es
      precision highp float;
      out vec4 fragColor;
      void main() { fragColor = vec4(1.0); }
    `);
    expect(shader.version()).toBe(2);
  });
});
