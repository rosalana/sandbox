import type {
  TextureOptions,
  TextureSource,
  WebGLContext,
} from "../types";
import Texture from "./texture";

/**
 * Manages a collection of textures with fluent API.
 * Assigns texture units sequentially and handles program attachment.
 * Mirrors the Uniforms class pattern for consistency.
 */
export default class Textures {
  private gl: WebGLContext;
  private program: WebGLProgram | null = null;
  private textures: Map<string, Texture> = new Map();

  constructor(gl: WebGLContext) {
    this.gl = gl;
  }

  /**
   * Attach to a WebGL program.
   * Invalidates all cached locations since they're program-specific.
   */
  attachProgram(program: WebGLProgram): this {
    this.program = program;

    for (const texture of this.textures.values()) {
      texture.invalidateLocation();
    }

    return this;
  }

  /**
   * Set a texture.
   * Creates the texture entry if it doesn't exist, updates source if it does.
   */
  set(name: string, source: TextureSource, options?: TextureOptions): this {
    const existing = this.textures.get(name);

    if (existing) {
      existing.setSource(source);
    } else {
      this.textures.set(name, new Texture(this.gl, name, source, options));
    }

    return this;
  }

  /**
   * Get a texture by name.
   */
  get(name: string): Texture | undefined {
    return this.textures.get(name);
  }

  /**
   * Check if a texture exists.
   */
  has(name: string): boolean {
    return this.textures.has(name);
  }

  /**
   * Remove a texture and free its GPU resources.
   */
  delete(name: string): boolean {
    const texture = this.textures.get(name);
    if (texture) {
      texture.destroy();
      return this.textures.delete(name);
    }
    return false;
  }

  /**
   * Upload all textures to their respective texture units.
   * Units are assigned sequentially (0, 1, 2, ...).
   */
  uploadAll(): this {
    if (!this.program) {
      return this;
    }

    let unit = 0;
    for (const texture of this.textures.values()) {
      texture.upload(this.program, unit);
      unit++;
    }

    return this;
  }

  /**
   * Get texture count.
   */
  get size(): number {
    return this.textures.size;
  }

  /**
   * Cleanup all textures.
   */
  destroy(): void {
    for (const texture of this.textures.values()) {
      texture.destroy();
    }
    this.textures.clear();
    this.program = null;
  }
}
