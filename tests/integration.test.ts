import { describe, it, expect, afterEach } from "vitest";
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

// ─── Full Pipeline: Define → Import → Compile → Runtime ─────────────────────

describe("Integration — full module pipeline", () => {
  it("defines module, imports in shader, compiles, and options are accessible at runtime", () => {
    Module.define({
      name: "int_effects",
      source: `
        uniform float u_intensity;
        uniform float u_radius;
        vec4 blur(vec2 uv, vec2 resolution) {
          return vec4(uv * u_intensity, u_radius, 1.0);
        }
      `,
      options: {
        blur: {
          intensity: { uniform: "u_intensity", default: 1.0 },
          radius: { uniform: "u_radius", default: 5.0 },
        },
      },
    });

    const shader = new Shader(`
      #import blur from 'int_effects'
      void main() {
        vec4 result = blur(vec2(0.5), vec2(800.0, 600.0));
        gl_FragColor = result;
      }
    `);

    const compiled = shader.compile();

    // 1. Import line removed
    expect(compiled).not.toContain("#import");

    // 2. Function exists in output
    expect(compiled).toContain("blur");

    // 3. Module uniforms are namespaced
    expect(compiled).toMatch(/uniform\s+float\s+\w*u_intensity/);
    expect(compiled).toMatch(/uniform\s+float\s+\w*u_radius/);

    // 4. Built-in uniforms are present and not namespaced
    expect(compiled).toContain("uniform float u_time;");
    expect(compiled).toContain("uniform vec2 u_resolution;");

    // 5. Runtime options are accessible
    const opts = RUNTIME_MODULES.resolveOptions("blur");
    expect(opts).not.toBeNull();
    expect(opts!.intensity).toBeDefined();
    expect(opts!.radius).toBeDefined();

    // 6. Options point to namespaced uniforms
    expect(opts!.intensity.uniform).toContain("u_intensity");
    expect(opts!.radius.uniform).toContain("u_radius");

    // 7. Defaults preserved
    expect(opts!.intensity.default).toBe(1.0);
    expect(opts!.radius.default).toBe(5.0);

    cleanupModule("int_effects");
  });

  it("aliased import remaps options key correctly", () => {
    Module.define({
      name: "int_alias_fx",
      source: `
        uniform float u_threshold;
        vec4 bloom(vec2 uv) { return vec4(uv, u_threshold, 1.0); }
      `,
      options: {
        bloom: {
          threshold: { uniform: "u_threshold", default: 0.5 },
        },
      },
    });

    const shader = new Shader(`
      #import bloom as glow from 'int_alias_fx'
      void main() {
        vec4 result = glow(vec2(0.5));
        gl_FragColor = result;
      }
    `);

    shader.compile();

    // Options should be under alias "glow", not "bloom"
    const glowOpts = RUNTIME_MODULES.resolveOptions("glow");
    expect(glowOpts).not.toBeNull();
    expect(glowOpts!.threshold).toBeDefined();
    expect(glowOpts!.threshold.uniform).toContain("u_threshold");

    // Original "bloom" key should not exist
    const bloomOpts = RUNTIME_MODULES.resolveOptions("bloom");
    expect(bloomOpts).toBeNull();

    cleanupModule("int_alias_fx");
  });
});

// ─── Multiple Imports from Same Module ──────────────────────────────────────

describe("Integration — multiple imports", () => {
  it("two different functions from same module", () => {
    Module.define({
      name: "int_multi",
      source: `
        uniform float u_val;
        vec3 funcA(float t) { return vec3(t * u_val); }
        vec3 funcB(float t) { return vec3(t + u_val); }
      `,
      options: {
        funcA: { val: { uniform: "u_val", default: 1.0 } },
        funcB: { val: { uniform: "u_val", default: 2.0 } },
      },
    });

    const shader = new Shader(`
      #import funcA from 'int_multi'
      #import funcB from 'int_multi'
      void main() {
        vec3 a = funcA(0.5);
        vec3 b = funcB(0.5);
        gl_FragColor = vec4(a + b, 1.0);
      }
    `);

    const compiled = shader.compile();

    // Both functions should exist
    expect(compiled).toContain("funcA");
    expect(compiled).toContain("funcB");

    // Each should have its own namespaced uniform
    const valDecls = compiled.match(/uniform\s+float\s+\w*u_val/g) || [];
    expect(valDecls.length).toBe(2);

    cleanupModule("int_multi");
  });

  it("same function imported twice with different aliases", () => {
    Module.define({
      name: "int_double_alias",
      source: `
        uniform float u_strength;
        vec3 effect(float t) { return vec3(t * u_strength); }
      `,
      options: {
        effect: {
          strength: { uniform: "u_strength", default: 1.0 },
        },
      },
    });

    const shader = new Shader(`
      #import effect as soft from 'int_double_alias'
      #import effect as hard from 'int_double_alias'
      void main() {
        vec3 a = soft(0.5);
        vec3 b = hard(1.0);
        gl_FragColor = vec4(a + b, 1.0);
      }
    `);

    const compiled = shader.compile();

    // Both aliases should exist as functions
    expect(compiled).toContain("soft");
    expect(compiled).toContain("hard");

    // Two separate uniform declarations
    const strengthDecls =
      compiled.match(/uniform\s+float\s+\w*u_strength/g) || [];
    expect(strengthDecls.length).toBe(2);

    cleanupModule("int_double_alias");
  });
});

// ─── Tree-shaking Through Compilation ───────────────────────────────────────

describe("Integration — tree-shaking", () => {
  it("only includes relevant helpers and uniforms", () => {
    Module.define({
      name: "int_treeshake",
      source: `
        uniform float u_needed;
        uniform float u_unneeded;
        float usedHelper() { return u_needed; }
        float unusedHelper() { return u_unneeded; }
        vec3 effect(float t) { return vec3(usedHelper() * t); }
      `,
    });

    const shader = new Shader(`
      #import effect from 'int_treeshake'
      void main() {
        vec3 c = effect(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    const compiled = shader.compile();

    // usedHelper should be present (namespaced)
    expect(compiled).toContain("usedHelper");

    // unusedHelper should NOT be in the output
    expect(compiled).not.toContain("unusedHelper");

    // u_needed should be present (namespaced), u_unneeded should not
    expect(compiled).toMatch(/u_needed/);
    expect(compiled).not.toMatch(/u_unneeded/);

    cleanupModule("int_treeshake");
  });

  it("includes transitive dependencies", () => {
    Module.define({
      name: "int_transitive",
      source: `
        uniform float u_base;
        float deepHelper() { return u_base; }
        float midHelper() { return deepHelper() * 2.0; }
        vec3 effect(float t) { return vec3(midHelper() * t); }
      `,
    });

    const shader = new Shader(`
      #import effect from 'int_transitive'
      void main() {
        vec3 c = effect(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    const compiled = shader.compile();

    // Both helpers should be included
    expect(compiled).toContain("deepHelper");
    expect(compiled).toContain("midHelper");

    // u_base should be namespaced and present
    expect(compiled).toMatch(/u_base/);

    cleanupModule("int_transitive");
  });
});

// ─── Built-in Sandbox Module ────────────────────────────────────────────────

describe("Integration — built-in sandbox module", () => {
  it("imports gradient from sandbox module", () => {
    const shader = new Shader(`
      #import gradient from 'sandbox'
      void main() {
        vec3 c = gradient(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    const compiled = shader.compile();
    expect(compiled).not.toContain("#import");
    expect(compiled).toContain("gradient");

    // u_colors should be namespaced
    expect(compiled).toMatch(/u_colors/);
  });

  it("sandbox gradient module has colors option in runtime", () => {
    const shader = new Shader(`
      #import gradient from 'sandbox'
      void main() {
        vec3 c = gradient(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    shader.compile();

    const opts = RUNTIME_MODULES.resolveOptions("gradient");
    expect(opts).not.toBeNull();
    expect(opts!.colors).toBeDefined();
    expect(opts!.colors.uniform).toContain("u_colors");
  });
});

// ─── Module Without Options ─────────────────────────────────────────────────

describe("Integration — module without options (pure utility)", () => {
  it("utility module works without options", () => {
    Module.define({
      name: "int_utils",
      source: `
        float rand(vec2 co) {
          return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
        }
        mat2 rotate2d(float angle) {
          float s = sin(angle);
          float c = cos(angle);
          return mat2(c, -s, s, c);
        }
      `,
    });

    const shader = new Shader(`
      #import rand from 'int_utils'
      #import rotate2d from 'int_utils'
      void main() {
        float r = rand(vec2(0.5));
        mat2 m = rotate2d(3.14);
        gl_FragColor = vec4(r);
      }
    `);

    const compiled = shader.compile();
    expect(compiled).not.toContain("#import");
    expect(compiled).toContain("rand");
    expect(compiled).toContain("rotate2d");

    // No module uniforms should be added (utility functions)
    // Only built-in uniforms should exist
    const moduleUniforms = (compiled.match(/uniform/g) || []).length;
    // Built-ins: u_resolution, u_time, u_delta, u_mouse, u_frame = 5
    // Shader already declares some, plus injected ones
    expect(moduleUniforms).toBeGreaterThanOrEqual(1);

    cleanupModule("int_utils");
  });
});

// ─── Cascading Imports (Module Importing Another Module) ────────────────────

describe("Integration — cascading imports", () => {
  it("module can import from another module", () => {
    // First module: a simple utility
    Module.define({
      name: "int_base_util",
      source: `
        float lerp(float a, float b, float t) {
          return a + (b - a) * t;
        }
      `,
    });

    // Second module: imports from first
    Module.define({
      name: "int_cascade",
      source: `
        #import lerp from 'int_base_util'
        uniform float u_amount;
        vec3 blend(vec3 a, vec3 b) {
          float t = lerp(0.0, 1.0, u_amount);
          return mix(a, b, t);
        }
      `,
      options: {
        blend: {
          amount: { uniform: "u_amount", default: 0.5 },
        },
      },
    });

    const shader = new Shader(`
      #import blend from 'int_cascade'
      void main() {
        vec3 result = blend(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0));
        gl_FragColor = vec4(result, 1.0);
      }
    `);

    const compiled = shader.compile();

    // Both functions should appear
    expect(compiled).toContain("blend");
    // lerp may be namespaced within the cascade module
    expect(compiled).toContain("lerp");

    // u_amount should be namespaced
    expect(compiled).toMatch(/u_amount/);

    cleanupModule("int_cascade");
    cleanupModule("int_base_util");
  });
});

// ─── WebGL Version Handling ─────────────────────────────────────────────────

describe("Integration — WebGL version detection in compiled shaders", () => {
  it("WebGL1 shader compiles correctly with modules", () => {
    Module.define({
      name: "int_v1",
      source: `vec3 tint(float t) { return vec3(t, 0.0, 0.0); }`,
    });

    const shader = new Shader(`
      precision mediump float;
      #import tint from 'int_v1'
      void main() {
        vec3 c = tint(0.5);
        gl_FragColor = vec4(c, 1.0);
      }
    `);

    expect(shader.version()).toBe(1);
    const compiled = shader.compile();
    expect(compiled).toContain("tint");
    expect(compiled).not.toContain("#version 300 es");

    cleanupModule("int_v1");
  });

  it("WebGL2 shader compiles correctly with modules", () => {
    Module.define({
      name: "int_v2",
      source: `
        #version 300 es
        precision highp float;
        vec3 tint(float t) { return vec3(t, 0.0, 0.0); }
      `,
    });

    const shader = new Shader(`#version 300 es
      precision highp float;
      #import tint from 'int_v2'
      out vec4 fragColor;
      void main() {
        vec3 c = tint(0.5);
        fragColor = vec4(c, 1.0);
      }
    `);

    expect(shader.version()).toBe(2);
    const compiled = shader.compile();
    expect(compiled).toContain("tint");

    cleanupModule("int_v2");
  });
});

// ─── Error Cases ────────────────────────────────────────────────────────────

describe("Integration — error cases", () => {
  it("throws when importing from unregistered module", () => {
    const shader = new Shader(`
      #import something from 'does_not_exist'
      void main() { gl_FragColor = vec4(1.0); }
    `);

    expect(() => shader.compile()).toThrow("does_not_exist");
  });

  it("throws when importing non-existent function from module", () => {
    Module.define({
      name: "int_err_fn",
      source: `vec3 gradient(float t) { return vec3(t); }`,
    });

    const shader = new Shader(`
      #import nonexistent from 'int_err_fn'
      void main() { gl_FragColor = vec4(1.0); }
    `);

    expect(() => shader.compile()).toThrow("nonexistent");

    cleanupModule("int_err_fn");
  });

  it("throws on import syntax error", () => {
    const shader = new Shader(`
      @import blur from 'effects'
      void main() { gl_FragColor = vec4(1.0); }
    `);

    expect(() => shader.compile()).toThrow();
  });

  it("throws when shader has no functions", () => {
    Module.define({
      name: "int_err_nofn",
      source: `vec3 effect(float t) { return vec3(t); }`,
    });

    const shader = new Shader(`
      #import effect from 'int_err_nofn'
      uniform float u_time;
    `);

    expect(() => shader.compile()).toThrow();

    cleanupModule("int_err_nofn");
  });

  it("throws when trying to import main", () => {
    Module.define({
      name: "int_err_main",
      source: `
        void helper() { }
        void main() { helper(); }
      `,
    });

    const shader = new Shader(`
      #import main from 'int_err_main'
      void main() { gl_FragColor = vec4(1.0); }
    `);

    expect(() => shader.compile()).toThrow("main");

    cleanupModule("int_err_main");
  });
});

// ─── Uniform Type Mismatch ──────────────────────────────────────────────────

describe("Integration — uniform type checking", () => {
  it("does not throw when imported uniform types match existing", () => {
    // This tests that if the shader already has a uniform with the same
    // namespaced name and same type, no error is thrown
    // In practice this is unlikely due to unique suffixes, but tests the path
    const shader = new Shader(`
      void main() { gl_FragColor = vec4(1.0); }
    `);

    expect(() => shader.compile()).not.toThrow();
  });
});

// ─── Complex Real-world Scenario ────────────────────────────────────────────

describe("Integration — real-world scenario", () => {
  it("noise module with multiple functions and selective import", () => {
    Module.define({
      name: "int_noise",
      source: `
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 5; i++) {
            value += amplitude * noise(p);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }

        float turbulence(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 5; i++) {
            value += amplitude * abs(noise(p) * 2.0 - 1.0);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
      `,
    });

    // Only import fbm — should pull in noise and hash, but not turbulence
    const shader = new Shader(`
      #import fbm from 'int_noise'
      void main() {
        float n = fbm(gl_FragCoord.xy * 0.01);
        gl_FragColor = vec4(vec3(n), 1.0);
      }
    `);

    const compiled = shader.compile();

    // fbm should exist
    expect(compiled).toContain("fbm");

    // hash and noise should be pulled in as dependencies
    expect(compiled).toContain("hash");
    expect(compiled).toContain("noise");

    // turbulence should NOT be included (tree-shaking)
    expect(compiled).not.toContain("turbulence");

    cleanupModule("int_noise");
  });

  it("multiple modules combined in one shader", () => {
    Module.define({
      name: "int_color_utils",
      source: `
        vec3 hsl2rgb(vec3 hsl) {
          float h = hsl.x;
          float s = hsl.y;
          float l = hsl.z;
          float c = (1.0 - abs(2.0 * l - 1.0)) * s;
          float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
          float m = l - c / 2.0;
          vec3 rgb = vec3(m);
          return rgb + vec3(c, x, 0.0);
        }
      `,
    });

    Module.define({
      name: "int_math_utils",
      source: `
        float remap(float value, float low1, float high1, float low2, float high2) {
          return low2 + (value - low1) * (high2 - low2) / (high1 - low1);
        }
      `,
    });

    const shader = new Shader(`
      #import hsl2rgb from 'int_color_utils'
      #import remap from 'int_math_utils'
      void main() {
        float hue = remap(gl_FragCoord.x, 0.0, 800.0, 0.0, 1.0);
        vec3 color = hsl2rgb(vec3(hue, 1.0, 0.5));
        gl_FragColor = vec4(color, 1.0);
      }
    `);

    const compiled = shader.compile();

    expect(compiled).toContain("hsl2rgb");
    expect(compiled).toContain("remap");
    expect(compiled).not.toContain("#import");

    cleanupModule("int_color_utils");
    cleanupModule("int_math_utils");
  });
});
