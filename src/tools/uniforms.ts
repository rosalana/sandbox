import type {
  AnyUniformValue,
  ClockState,
  UniformSchema,
  Vec2,
  WebGLContext,
} from "../types";
import Uniform from "./uniform";
import { defaultUniforms } from "../defaults";

/**
 * Manages a collection of uniforms with fluent API.
 * Handles built-in uniforms (u_resolution, u_time, etc.) automatically.
 */
export default class Uniforms {
  private gl: WebGLContext;
  private program: WebGLProgram | null = null;
  private uniforms: Map<string, Uniform> = new Map();

  constructor(gl: WebGLContext) {
    this.gl = gl;
  }

  /**
   * Attach to a WebGL program.
   * Invalidates all cached locations since they're program-specific.
   */
  attachProgram(program: WebGLProgram): this {
    this.program = program;

    // Invalidate all cached locations
    for (const uniform of this.uniforms.values()) {
      uniform.invalidateLocation();
    }

    return this;
  }

  /**
   * Set a uniform value.
   * Creates the uniform if it doesn't exist, updates if it does.
   */
  set<T extends AnyUniformValue>(name: string, value: T): this {
    const existing = this.uniforms.get(name);

    if (existing) {
      existing.setValue(value);
    } else {
      this.uniforms.set(name, new Uniform(name, value));
    }

    return this;
  }

  /**
   * Set multiple uniforms at once.
   */
  setMany<T extends UniformSchema>(values: T): this {
    for (const [name, value] of Object.entries(values)) {
      this.set(name, value);
    }
    return this;
  }

  /**
   * Get current uniform value.
   */
  get<T extends AnyUniformValue>(name: string): T | undefined {
    return this.uniforms.get(name)?.getValue() as T | undefined;
  }

  /**
   * Check if uniform exists.
   */
  has(name: string): boolean {
    return this.uniforms.has(name);
  }

  /**
   * Remove a uniform.
   */
  delete(name: string): boolean {
    return this.uniforms.delete(name);
  }

  /**
   * Upload all uniforms to GPU.
   * Requires a program to be attached.
   */
  uploadAll(): this {
    if (!this.program) {
      return this;
    }

    for (const uniform of this.uniforms.values()) {
      uniform.upload(this.gl, this.program);
    }

    return this;
  }

  /**
   * Upload only built-in uniforms (u_resolution, u_time, u_delta, u_mouse, u_frame).
   * Call this every frame with current values.
   */
  uploadBuiltIns(clock: ClockState, resolution: Vec2, mouse: Vec2): this {
    // Set built-in values (creates uniforms if they don't exist)
    this.set("u_resolution", resolution);
    this.set("u_time", clock.time);
    this.set("u_delta", clock.delta);
    this.set("u_mouse", mouse);
    this.set("u_frame", clock.frame);

    // Upload only built-ins
    if (!this.program) {
      return this;
    }

    for (const name of defaultUniforms.keys()) {
      const uniform = this.uniforms.get(name);
      if (uniform) {
        uniform.upload(this.gl, this.program);
      }
    }

    return this;
  }

  /**
   * Clear all uniforms.
   */
  clear(): void {
    this.uniforms.clear();
  }

  /**
   * Cleanup.
   */
  destroy(): void {
    this.uniforms.clear();
    this.program = null;
  }

  /**
   * Get all uniform names.
   */
  keys(): IterableIterator<string> {
    return this.uniforms.keys();
  }

  /**
   * Get uniform count.
   */
  get size(): number {
    return this.uniforms.size;
  }
}
