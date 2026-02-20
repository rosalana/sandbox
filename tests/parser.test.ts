import { describe, it, expect } from "vitest";
import Parser from "../src/tools/parser";

// ─── Version Detection ──────────────────────────────────────────────────────

describe("Parser — version detection", () => {
  it("detects WebGL1 when no version directive", () => {
    const parser = new Parser(`
      precision mediump float;
      void main() { gl_FragColor = vec4(1.0); }
    `);
    expect(parser.version()).toBe(1);
  });

  it("detects WebGL2 with #version 300 es", () => {
    const parser = new Parser(`#version 300 es
      precision highp float;
      out vec4 fragColor;
      void main() { fragColor = vec4(1.0); }
    `);
    expect(parser.version()).toBe(2);
  });

  it("detects WebGL1 when version is not 300 es", () => {
    const parser = new Parser(`#version 100
      precision mediump float;
      void main() { gl_FragColor = vec4(1.0); }
    `);
    expect(parser.version()).toBe(1);
  });

  it("ignores version in comments", () => {
    const parser = new Parser(`
      // #version 300 es
      precision mediump float;
      void main() { gl_FragColor = vec4(1.0); }
    `);
    // The regex uses ^\\s* with multiline flag, so a comment won't match
    expect(parser.version()).toBe(1);
  });
});

// ─── Import Detection ───────────────────────────────────────────────────────

describe("Parser — import detection", () => {
  it("parses simple import", () => {
    const parser = new Parser(`
      #import blur from 'effects'
      void main() { }
    `);
    const result = parser.parse();
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0]).toMatchObject({
      name: "blur",
      alias: "blur",
      module: "effects",
    });
  });

  it("parses import with alias", () => {
    const parser = new Parser(`
      #import bloom as glow from 'effects'
      void main() { }
    `);
    const result = parser.parse();
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0]).toMatchObject({
      name: "bloom",
      alias: "glow",
      module: "effects",
    });
  });

  it("parses import with double quotes", () => {
    const parser = new Parser(`
      #import blur from "effects"
      void main() { }
    `);
    const result = parser.parse();
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].module).toBe("effects");
  });

  it("parses multiple imports", () => {
    const parser = new Parser(`
      #import blur from 'effects'
      #import noise from 'noise'
      #import bloom as glow from 'effects'
      void main() { }
    `);
    const result = parser.parse();
    expect(result.imports).toHaveLength(3);
    expect(result.imports[0].name).toBe("blur");
    expect(result.imports[1].name).toBe("noise");
    expect(result.imports[2]).toMatchObject({ name: "bloom", alias: "glow" });
  });

  it("parses module with slash path", () => {
    const parser = new Parser(`
      #import gradient from 'sandbox/effects'
      void main() { }
    `);
    const result = parser.parse();
    expect(result.imports[0].module).toBe("sandbox/effects");
  });

  it("assigns line numbers to imports", () => {
    const parser = new Parser(
      `#import blur from 'effects'
#import noise from 'noise'
void main() { }`,
    );
    const result = parser.parse();
    expect(result.imports[0].line).toBe(1);
    expect(result.imports[1].line).toBe(2);
  });

  it("handles no imports gracefully", () => {
    const parser = new Parser(`void main() { gl_FragColor = vec4(1.0); }`);
    const result = parser.parse();
    expect(result.imports).toHaveLength(0);
  });
});

// ─── Import Syntax Errors ───────────────────────────────────────────────────

describe("Parser — import syntax errors", () => {
  it("throws on @import (wrong prefix)", () => {
    const parser = new Parser(`
      @import blur from 'effects'
      void main() { }
    `);
    expect(() => parser.parse()).toThrow("Invalid prefix '@'");
  });

  it("throws on import without # (missing prefix)", () => {
    const parser = new Parser(`
      import blur from 'effects'
      void main() { }
    `);
    expect(() => parser.parse()).toThrow("Missing '#' prefix");
  });

  it("throws on #import from without function name", () => {
    const parser = new Parser(`
      #import from 'effects'
      void main() { }
    `);
    expect(() => parser.parse()).toThrow("Missing function name");
  });

  it("throws on #import blur without from clause", () => {
    const parser = new Parser(`
      #import blur
      void main() { }
    `);
    expect(() => parser.parse()).toThrow("Missing 'from' clause");
  });

  it("throws on #import blur as (missing alias name)", () => {
    const parser = new Parser(`
      #import blur as from 'effects'
      void main() { }
    `);
    expect(() => parser.parse()).toThrow("Missing alias name");
  });

  it("throws on #import blur from module (unquoted module)", () => {
    const parser = new Parser(`
      #import blur from effects
      void main() { }
    `);
    expect(() => parser.parse()).toThrow("Module name must be quoted");
  });

  it("throws on #import blur as glow (missing from clause with alias)", () => {
    const parser = new Parser(`
      #import blur as glow
      void main() { }
    `);
    expect(() => parser.parse()).toThrow("Missing 'from' clause");
  });
});

// ─── Uniform Detection ──────────────────────────────────────────────────────

describe("Parser — uniform detection", () => {
  it("detects simple uniform", () => {
    const parser = new Parser(`
      uniform float u_time;
      void main() { }
    `);
    const result = parser.parse();
    expect(result.uniforms).toHaveLength(1);
    expect(result.uniforms[0]).toMatchObject({
      name: "u_time",
      type: "float",
    });
  });

  it("detects multiple uniforms of different types", () => {
    const parser = new Parser(`
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec3 u_color;
      uniform mat4 u_matrix;
      uniform int u_frame;
      void main() { }
    `);
    const result = parser.parse();
    expect(result.uniforms).toHaveLength(5);
    expect(result.uniforms.map((u) => u.type)).toEqual([
      "float",
      "vec2",
      "vec3",
      "mat4",
      "int",
    ]);
  });

  it("detects array uniforms", () => {
    const parser = new Parser(`
      uniform vec3 u_colors[10];
      void main() { }
    `);
    const result = parser.parse();
    expect(result.uniforms).toHaveLength(1);
    expect(result.uniforms[0]).toMatchObject({
      name: "u_colors",
      type: "vec3",
      arrayNum: 10,
    });
  });

  it("detects uniforms with precision qualifiers", () => {
    const parser = new Parser(`
      uniform highp float u_time;
      uniform mediump vec2 u_resolution;
      uniform lowp vec4 u_color;
      void main() { }
    `);
    const result = parser.parse();
    expect(result.uniforms).toHaveLength(3);
    expect(result.uniforms[0]).toMatchObject({
      name: "u_time",
      type: "float",
    });
    expect(result.uniforms[1]).toMatchObject({
      name: "u_resolution",
      type: "vec2",
    });
  });

  it("assigns line numbers to uniforms", () => {
    const parser = new Parser(
      `uniform float u_time;
uniform vec2 u_resolution;
void main() { }`,
    );
    const result = parser.parse();
    expect(result.uniforms[0].line).toBe(1);
    expect(result.uniforms[1].line).toBe(2);
  });
});

// ─── Function Detection ─────────────────────────────────────────────────────

describe("Parser — function detection", () => {
  it("detects a simple function", () => {
    const parser = new Parser(`
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);
    const result = parser.parse();
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0]).toMatchObject({
      name: "main",
      type: "void",
    });
    expect(result.functions[0].params).toHaveLength(0);
  });

  it("detects function with parameters", () => {
    const parser = new Parser(`
      vec4 blur(sampler2D tex, vec2 uv, vec2 resolution) {
        return texture(tex, uv);
      }
      void main() { }
    `);
    const result = parser.parse();
    const blur = result.functions.find((f) => f.name === "blur");
    expect(blur).toBeDefined();
    expect(blur!.type).toBe("vec4");
    expect(blur!.params).toHaveLength(3);
    expect(blur!.params[0]).toMatchObject({ type: "sampler2D", name: "tex" });
    expect(blur!.params[1]).toMatchObject({ type: "vec2", name: "uv" });
  });

  it("detects multiple functions", () => {
    const parser = new Parser(`
      float helper() { return 1.0; }
      vec3 gradient(float t) { return vec3(t); }
      void main() { }
    `);
    const result = parser.parse();
    expect(result.functions).toHaveLength(3);
    expect(result.functions.map((f) => f.name)).toEqual([
      "helper",
      "gradient",
      "main",
    ]);
  });

  it("extracts function body including braces", () => {
    const parser = new Parser(`
      float square(float x) {
        return x * x;
      }
      void main() { }
    `);
    const result = parser.parse();
    const fn = result.functions.find((f) => f.name === "square")!;
    expect(fn.body).toContain("return x * x;");
    expect(fn.body.startsWith("{")).toBe(true);
    expect(fn.body.endsWith("}")).toBe(true);
  });

  it("handles nested braces in function body", () => {
    const parser = new Parser(`
      float complex(float x) {
        if (x > 0.0) {
          for (int i = 0; i < 10; i++) {
            x += 1.0;
          }
        }
        return x;
      }
      void main() { }
    `);
    const result = parser.parse();
    const fn = result.functions.find((f) => f.name === "complex")!;
    expect(fn.body).toContain("if (x > 0.0)");
    expect(fn.body).toContain("for (int i = 0;");
    expect(fn.body).toContain("return x;");
  });

  it("handles parameters with qualifiers", () => {
    const parser = new Parser(`
      void compute(in vec2 a, out vec4 b, const highp float c) {
        b = vec4(a, 0.0, c);
      }
      void main() { }
    `);
    const result = parser.parse();
    const fn = result.functions.find((f) => f.name === "compute")!;
    expect(fn.params).toHaveLength(3);
    expect(fn.params[0]).toMatchObject({ type: "vec2", name: "a" });
    expect(fn.params[1]).toMatchObject({ type: "vec4", name: "b" });
    expect(fn.params[2]).toMatchObject({ type: "float", name: "c" });
  });

  it("detects various return types", () => {
    const parser = new Parser(`
      float f1() { return 1.0; }
      int f2() { return 1; }
      vec2 f3() { return vec2(0.0); }
      vec3 f4() { return vec3(0.0); }
      vec4 f5() { return vec4(0.0); }
      mat3 f6() { return mat3(1.0); }
      mat4 f7() { return mat4(1.0); }
      bool f8() { return true; }
      void main() { }
    `);
    const result = parser.parse();
    expect(result.functions.map((f) => f.type)).toEqual([
      "float",
      "int",
      "vec2",
      "vec3",
      "vec4",
      "mat3",
      "mat4",
      "bool",
      "void",
    ]);
  });
});

// ─── Dependency Detection ───────────────────────────────────────────────────

describe("Parser — dependency detection in functions", () => {
  it("detects function calls as dependencies", () => {
    const parser = new Parser(`
      float helper() { return 1.0; }
      void main() {
        float x = helper();
      }
    `);
    const result = parser.parse();
    const main = result.functions.find((f) => f.name === "main")!;
    const funcDeps = main.dependencies.filter((d) => d.type === "function");
    expect(funcDeps.some((d) => d.name === "helper")).toBe(true);
  });

  it("detects uniform references as dependencies", () => {
    const parser = new Parser(`
      uniform float u_time;
      uniform vec2 u_mouse;
      void main() {
        float t = u_time;
        vec2 m = u_mouse;
      }
    `);
    const result = parser.parse();
    const main = result.functions.find((f) => f.name === "main")!;
    const uniformDeps = main.dependencies.filter((d) => d.type === "uniform");
    expect(uniformDeps.some((d) => d.name === "u_time")).toBe(true);
    expect(uniformDeps.some((d) => d.name === "u_mouse")).toBe(true);
  });

  it("records character index for dependencies", () => {
    const parser = new Parser(`
      uniform float u_time;
      void main() {
        float t = u_time;
      }
    `);
    const result = parser.parse();
    const main = result.functions.find((f) => f.name === "main")!;
    const dep = main.dependencies.find((d) => d.name === "u_time")!;
    expect(dep.index).toBeDefined();
    expect(dep.index).toBeGreaterThan(0);
  });

  it("does not count GLSL keywords as function dependencies", () => {
    const parser = new Parser(`
      void main() {
        if (true) { }
        for (int i = 0; i < 10; i++) { }
        while (false) { }
        return;
      }
    `);
    const result = parser.parse();
    const main = result.functions.find((f) => f.name === "main")!;
    const funcDeps = main.dependencies.filter((d) => d.type === "function");
    const keywords = ["if", "for", "while", "return"];
    for (const kw of keywords) {
      expect(funcDeps.some((d) => d.name === kw)).toBe(false);
    }
  });

  it("detects built-in GLSL function calls", () => {
    const parser = new Parser(`
      void main() {
        float x = sin(1.0);
        vec3 c = mix(vec3(0.0), vec3(1.0), 0.5);
      }
    `);
    const result = parser.parse();
    const main = result.functions.find((f) => f.name === "main")!;
    const funcDeps = main.dependencies.filter((d) => d.type === "function");
    expect(funcDeps.some((d) => d.name === "sin")).toBe(true);
    expect(funcDeps.some((d) => d.name === "mix")).toBe(true);
  });
});

// ─── Parse Caching ──────────────────────────────────────────────────────────

describe("Parser — caching", () => {
  it("caches parse result", () => {
    const parser = new Parser(`
      uniform float u_time;
      void main() { }
    `);
    const result1 = parser.parse();
    const result2 = parser.parse();
    expect(result1).toBe(result2); // Same reference
  });

  it("resets cache on setSource", () => {
    const parser = new Parser(`
      uniform float u_time;
      void main() { }
    `);
    const result1 = parser.parse();
    parser.setSource(`
      uniform vec2 u_resolution;
      void main() { }
    `);
    const result2 = parser.parse();
    expect(result1).not.toBe(result2);
    expect(result2.uniforms[0].type).toBe("vec2");
  });

  it("isParsed returns correct state", () => {
    const parser = new Parser(`void main() { }`);
    expect(parser.isParsed()).toBe(false);
    parser.parse();
    expect(parser.isParsed()).toBe(true);
    parser.setSource(`void main() { }`);
    expect(parser.isParsed()).toBe(false);
  });
});
