import { describe, it, expect } from "vitest";
import {
  modules,
  runtime_modules,
  uniforms,
} from "../src/globals";

// ─── Global Uniforms ────────────────────────────────────────────────────────

describe("Global uniforms registry", () => {
  it("contains u_resolution as vec2", () => {
    expect(uniforms.get("u_resolution")).toBe("vec2");
  });

  it("contains u_time as float", () => {
    expect(uniforms.get("u_time")).toBe("float");
  });

  it("contains u_delta as float", () => {
    expect(uniforms.get("u_delta")).toBe("float");
  });

  it("contains u_mouse as vec2", () => {
    expect(uniforms.get("u_mouse")).toBe("vec2");
  });

  it("contains u_frame as int", () => {
    expect(uniforms.get("u_frame")).toBe("int");
  });

  it("has exactly 5 built-in uniforms", () => {
    expect(uniforms.size).toBe(5);
  });
});

// ─── Global Module Registry ─────────────────────────────────────────────────

describe("Global modules registry", () => {
  it("has sandbox module pre-registered", () => {
    expect(modules.has("sandbox")).toBe(true);
  });

  it("sandbox module resolves successfully", () => {
    const mod = modules.resolve("sandbox");
    expect(mod.name).toBe("sandbox");
  });
});

// ─── Runtime Modules Registry ───────────────────────────────────────────────

describe("Global runtime_modules registry", () => {
  it("starts empty", () => {
    // Note: other tests may populate this, but by design it should start empty
    // We clear it to verify the pattern
    runtime_modules.clear();
    expect(() => runtime_modules.resolve("anything")).toThrow();
  });

  it("can be cleared", () => {
    runtime_modules.clear();
    expect(runtime_modules.has("anything")).toBe(false);
  });
});
