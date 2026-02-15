import { describe, it, expect } from "vitest";
// Import globals first to avoid circular dependency resolution issue
import { modules as MODULES } from "../src/globals";
import ModuleRegistry from "../src/tools/module_registry";
import Module from "../src/tools/module";
import { SandboxModuleNotFoundError } from "../src/errors";

function createModule(name: string, source: string, options?: any): Module {
  return new Module(name, source, options);
}

// ─── Registration ───────────────────────────────────────────────────────────

describe("ModuleRegistry — registration", () => {
  it("registers and resolves a module", () => {
    const registry = new ModuleRegistry();
    const mod = createModule("test", `void f() { }`);
    registry.register("test", mod);

    const resolved = registry.resolve("test");
    expect(resolved).toBe(mod);
  });

  it("has() returns true for registered module", () => {
    const registry = new ModuleRegistry();
    const mod = createModule("test", `void f() { }`);
    registry.register("test", mod);
    expect(registry.has("test")).toBe(true);
  });

  it("has() returns false for unregistered module", () => {
    const registry = new ModuleRegistry();
    expect(registry.has("nope")).toBe(false);
  });

  it("throws on resolve of unregistered module", () => {
    const registry = new ModuleRegistry();
    expect(() => registry.resolve("nope")).toThrow(SandboxModuleNotFoundError);
  });

  it("initializes with provided modules", () => {
    const mod1 = createModule("a", `void f() { }`);
    const mod2 = createModule("b", `void g() { }`);
    const registry = new ModuleRegistry([mod1, mod2]);

    expect(registry.has("a")).toBe(true);
    expect(registry.has("b")).toBe(true);
  });
});

// ─── Removal ────────────────────────────────────────────────────────────────

describe("ModuleRegistry — removal", () => {
  it("removes a module", () => {
    const registry = new ModuleRegistry();
    registry.register("test", createModule("test", `void f() { }`));
    registry.remove("test");
    expect(registry.has("test")).toBe(false);
  });

  it("clear removes all modules", () => {
    const registry = new ModuleRegistry();
    registry.register("a", createModule("a", `void f() { }`));
    registry.register("b", createModule("b", `void g() { }`));
    registry.clear();
    expect(registry.has("a")).toBe(false);
    expect(registry.has("b")).toBe(false);
  });
});

// ─── Load ───────────────────────────────────────────────────────────────────

describe("ModuleRegistry — load", () => {
  it("loads multiple modules at once", () => {
    const registry = new ModuleRegistry();
    registry.load([
      createModule("x", `void f() { }`),
      createModule("y", `void g() { }`),
    ]);
    expect(registry.has("x")).toBe(true);
    expect(registry.has("y")).toBe(true);
  });
});

// ─── Available ──────────────────────────────────────────────────────────────

describe("ModuleRegistry — available", () => {
  it("returns definitions of all modules", () => {
    const registry = new ModuleRegistry();
    registry.register(
      "mymod",
      createModule(
        "mymod",
        `
          float helper() { return 1.0; }
          vec3 gradient(float t) { return vec3(t); }
        `,
      ),
    );

    const available = registry.available();
    expect(available).toHaveLength(1);
    expect(available[0].name).toBe("mymod");
    expect(available[0].methods).toContain("helper");
    expect(available[0].methods).toContain("gradient");
  });
});

// ─── resolveOptions ─────────────────────────────────────────────────────────

describe("ModuleRegistry — resolveOptions", () => {
  it("resolves options for a function name", () => {
    const registry = new ModuleRegistry();
    const mod = createModule(
      "effects",
      `
        uniform float u_intensity;
        vec3 glow(float t) { return vec3(t * u_intensity); }
      `,
      {
        glow: {
          intensity: { uniform: "u_intensity", default: 0.5 },
        },
      },
    );
    registry.register("effects", mod);

    const opts = registry.resolveOptions("glow");
    expect(opts).not.toBeNull();
    expect(opts!.intensity.uniform).toBe("u_intensity");
    expect(opts!.intensity.default).toBe(0.5);
  });

  it("returns null for unknown function", () => {
    const registry = new ModuleRegistry();
    registry.register(
      "effects",
      createModule("effects", `vec3 glow(float t) { return vec3(t); }`, {
        glow: { intensity: { uniform: "u_intensity" } },
      }),
    );

    expect(registry.resolveOptions("nonexistent")).toBeNull();
  });

  it("searches across multiple modules", () => {
    const registry = new ModuleRegistry();
    registry.register(
      "mod_a",
      createModule("mod_a", `vec3 funcA(float t) { return vec3(t); }`, {
        funcA: { optA: { uniform: "u_a" } },
      }),
    );
    registry.register(
      "mod_b",
      createModule("mod_b", `vec3 funcB(float t) { return vec3(t); }`, {
        funcB: { optB: { uniform: "u_b" } },
      }),
    );

    expect(registry.resolveOptions("funcA")).not.toBeNull();
    expect(registry.resolveOptions("funcB")).not.toBeNull();
    expect(registry.resolveOptions("funcA")!.optA.uniform).toBe("u_a");
    expect(registry.resolveOptions("funcB")!.optB.uniform).toBe("u_b");
  });
});

// ─── Compile ────────────────────────────────────────────────────────────────

describe("ModuleRegistry — compile", () => {
  it("compiles all registered modules", () => {
    const registry = new ModuleRegistry();
    const mod = createModule(
      "comptest",
      `vec3 gradient(float t) { return vec3(t); }`,
    );
    registry.register("comptest", mod);

    // Should not throw
    expect(() => registry.compile()).not.toThrow();
  });
});

// ─── Global Module Registry ─────────────────────────────────────────────────

describe("Global MODULES registry", () => {
  it("has the built-in 'sandbox' module", () => {
    expect(MODULES.has("sandbox")).toBe(true);
  });

  it("has the built-in 'sandbox/colors' module", () => {
    expect(MODULES.has("sandbox/colors")).toBe(true);
  });

  it("has the built-in 'sandbox/effects' module", () => {
    expect(MODULES.has("sandbox/effects")).toBe(true);
  });

  it("has the built-in 'sandbox/filters' module", () => {
    expect(MODULES.has("sandbox/filters")).toBe(true);
  });

  it("sandbox module has core utility methods", () => {
    const mod = MODULES.resolve("sandbox");
    const def = mod.getDefinition();
    expect(def.methods).toContain("hash");
    expect(def.methods).toContain("noise");
    expect(def.methods).toContain("fbm");
    expect(def.methods).toContain("worley");
    expect(def.methods).toContain("map");
    expect(def.methods).toContain("rotate");
    expect(def.methods).toContain("polar");
  });

  it("sandbox/colors module has color conversion methods", () => {
    const mod = MODULES.resolve("sandbox/colors");
    const def = mod.getDefinition();
    expect(def.methods).toContain("hsv");
    expect(def.methods).toContain("hsl");
    expect(def.methods).toContain("hex");
    expect(def.methods).toContain("palette");
    expect(def.methods).toContain("gradient");
    expect(def.methods).toContain("gradient3");
    expect(def.methods).toContain("tri_mix");
  });

  it("sandbox/colors module has tri_mix options", () => {
    const mod = MODULES.resolve("sandbox/colors");
    expect(mod.options).toHaveProperty("tri_mix");
    expect(mod.options!.tri_mix.sharpness.uniform).toBe("u_sharpness");
    expect(mod.options!.tri_mix.tint.uniform).toBe("u_tint");
    expect(mod.options!.tri_mix.highlight.uniform).toBe("u_highlight");
  });

  it("sandbox/effects module has UV transforms and color effects", () => {
    const mod = MODULES.resolve("sandbox/effects");
    expect(mod.options).toHaveProperty("twist");
    expect(mod.options).toHaveProperty("organic");
    expect(mod.options).toHaveProperty("pixelate");
    expect(mod.options).toHaveProperty("posterize");
    expect(mod.options).toHaveProperty("vignette");
    expect(mod.options).toHaveProperty("grain");
    expect(mod.options).toHaveProperty("glow");
    expect(mod.options!.twist.intensity.uniform).toBe("u_intensity");
    expect(mod.options!.organic.intensity.uniform).toBe("u_intensity");
    expect(mod.options!.posterize.intensity.uniform).toBe("u_intensity");
  });

  it("sandbox/filters module has color adjustment filters", () => {
    const mod = MODULES.resolve("sandbox/filters");
    expect(mod.options).toHaveProperty("contrast");
    expect(mod.options).toHaveProperty("brightness");
    expect(mod.options).toHaveProperty("saturate");
    expect(mod.options!.contrast.intensity.uniform).toBe("u_intensity");
    expect(mod.options!.brightness.intensity.uniform).toBe("u_intensity");
    expect(mod.options!.saturate.intensity.uniform).toBe("u_intensity");
  });
});
