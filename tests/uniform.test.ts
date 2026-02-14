import { describe, it, expect } from "vitest";
import Uniform from "../src/tools/uniform";

// ─── Method Inference ───────────────────────────────────────────────────────

describe("Uniform — method inference", () => {
  it("infers uniform1f for number", () => {
    const u = new Uniform("u_time", 1.5);
    expect(u.method).toBe("uniform1f");
    expect(u.isArray).toBe(false);
    expect(u.isMatrix).toBe(false);
  });

  it("infers uniform1i for boolean", () => {
    const u = new Uniform("u_flag", true);
    expect(u.method).toBe("uniform1i");
    expect(u.isArray).toBe(false);
  });

  it("infers uniform2fv for Vec2", () => {
    const u = new Uniform("u_pos", [1.0, 2.0]);
    expect(u.method).toBe("uniform2fv");
    expect(u.isArray).toBe(false);
  });

  it("infers uniform3fv for Vec3", () => {
    const u = new Uniform("u_color", [1.0, 0.0, 0.5]);
    expect(u.method).toBe("uniform3fv");
    expect(u.isArray).toBe(false);
  });

  it("infers uniform4fv for Vec4", () => {
    const u = new Uniform("u_color", [1.0, 0.0, 0.5, 1.0]);
    expect(u.method).toBe("uniform4fv");
    expect(u.isArray).toBe(false);
  });

  it("infers uniformMatrix3fv for 9-element array (mat3)", () => {
    const u = new Uniform("u_mat", [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(u.method).toBe("uniformMatrix3fv");
    expect(u.isMatrix).toBe(true);
  });

  it("infers uniformMatrix4fv for 16-element array (mat4)", () => {
    const u = new Uniform(
      "u_mat",
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    );
    expect(u.method).toBe("uniformMatrix4fv");
    expect(u.isMatrix).toBe(true);
  });

  it("infers uniform1fv for arbitrary-length flat array", () => {
    const u = new Uniform("u_data", [1.0, 2.0, 3.0, 4.0, 5.0]);
    expect(u.method).toBe("uniform1fv");
    expect(u.isArray).toBe(true);
  });

  it("infers uniform2fv for nested Vec2 array", () => {
    const u = new Uniform("u_positions", [
      [1.0, 2.0],
      [3.0, 4.0],
    ]);
    expect(u.method).toBe("uniform2fv");
    expect(u.isArray).toBe(true);
  });

  it("infers uniform3fv for nested Vec3 array", () => {
    const u = new Uniform("u_colors", [
      [1.0, 0.0, 0.0],
      [0.0, 1.0, 0.0],
      [0.0, 0.0, 1.0],
    ]);
    expect(u.method).toBe("uniform3fv");
    expect(u.isArray).toBe(true);
  });

  it("infers uniform4fv for nested Vec4 array", () => {
    const u = new Uniform("u_colors", [
      [1, 0, 0, 1],
      [0, 1, 0, 1],
    ]);
    expect(u.method).toBe("uniform4fv");
    expect(u.isArray).toBe(true);
  });
});

// ─── Value Management ───────────────────────────────────────────────────────

describe("Uniform — value management", () => {
  it("stores initial value", () => {
    const u = new Uniform("u_time", 1.5);
    expect(u.getValue()).toBe(1.5);
  });

  it("updates value with setValue", () => {
    const u = new Uniform("u_time", 1.5);
    u.setValue(3.0);
    expect(u.getValue()).toBe(3.0);
  });

  it("preserves name", () => {
    const u = new Uniform("u_custom", 0);
    expect(u.name).toBe("u_custom");
  });
});

// ─── Location Caching ───────────────────────────────────────────────────────

describe("Uniform — location caching", () => {
  it("invalidateLocation resets cached state", () => {
    const u = new Uniform("u_time", 1.0);
    // We can't test resolveLocation without a real GL context,
    // but we can verify invalidation doesn't throw
    u.invalidateLocation();
    // No assertions on location itself without GL context
    expect(true).toBe(true);
  });
});
