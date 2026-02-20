import type {
  ResolvedTextureOptions,
  TextureOptions,
  TextureSource,
  TextureWrap,
  WebGLContext,
} from "../types";

/**
 * Handles a single WebGL texture.
 * Manages texture creation, pixel upload, binding, and location caching.
 * Mirrors the Uniform class pattern for consistency.
 */
export default class Texture {
  readonly name: string;

  private gl: WebGLContext;
  private texture: WebGLTexture | null = null;
  private location: WebGLUniformLocation | null = null;
  private locationResolved = false;
  private source: TextureSource;
  private options: ResolvedTextureOptions;
  private dynamicOverride: boolean | undefined;
  private needsUpload = true;
  private needsReupload = false;

  constructor(
    gl: WebGLContext,
    name: string,
    source: TextureSource,
    options?: TextureOptions,
  ) {
    this.gl = gl;
    this.name = name;
    this.source = source;
    this.dynamicOverride = options?.dynamic;
    this.options = Texture.resolveOptions(source, options);
    this.needsReupload = this.options.dynamic;
  }

  /**
   * Update the texture source.
   * Marks texture for re-upload on next bind.
   * Respects the original `dynamic` option if explicitly set, otherwise re-infers from source type.
   */
  setSource(source: TextureSource): void {
    this.source = source;
    this.needsUpload = true;
    this.needsReupload = this.dynamicOverride ?? Texture.isDynamicSource(source);
  }

  /**
   * Resolve and cache uniform location from program.
   * Returns null if the sampler uniform doesn't exist in the shader.
   */
  resolveLocation(
    gl: WebGLContext,
    program: WebGLProgram,
  ): WebGLUniformLocation | null {
    if (!this.locationResolved) {
      this.location = gl.getUniformLocation(program, this.name);
      this.locationResolved = true;
    }
    return this.location;
  }

  /**
   * Invalidate cached location (call when program changes).
   */
  invalidateLocation(): void {
    this.location = null;
    this.locationResolved = false;
  }

  /**
   * Bind texture to a texture unit and set the sampler uniform.
   * @param program - Current WebGL program (for location resolution)
   * @param unit - Texture unit index (0, 1, 2, ...)
   */
  upload(program: WebGLProgram, unit: number): void {
    const gl = this.gl;
    const location = this.resolveLocation(gl, program);

    // Sampler uniform doesn't exist in shader — silently skip
    if (location === null) {
      return;
    }

    // Create texture object if needed
    if (!this.texture) {
      this.texture = gl.createTexture();
      if (!this.texture) return;
      this.needsUpload = true;
    }

    // Activate texture unit and bind
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Upload pixel data if needed (first time, source changed, or dynamic source)
    if (this.needsUpload || this.needsReupload) {
      this.uploadPixels();
      this.needsUpload = false;
    }

    // Set sampler uniform to texture unit index
    gl.uniform1i(location, unit);
  }

  /**
   * Cleanup WebGL texture resource.
   */
  destroy(): void {
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
    this.location = null;
    this.locationResolved = false;
  }

  /**
   * Upload pixel data from source and apply texture parameters.
   */
  private uploadPixels(): void {
    const gl = this.gl;

    // Flip Y (images have origin at top-left, WebGL at bottom-left)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.options.flipY);

    // Upload pixel data
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.source,
    );

    // Apply wrap and filter parameters
    this.applyParameters();
  }

  /**
   * Apply texture wrap and filter parameters.
   */
  private applyParameters(): void {
    const gl = this.gl;

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      Texture.resolveWrap(gl, this.options.wrapS),
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      Texture.resolveWrap(gl, this.options.wrapT),
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      this.options.minFilter === "nearest" ? gl.NEAREST : gl.LINEAR,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      this.options.magFilter === "nearest" ? gl.NEAREST : gl.LINEAR,
    );
  }

  /**
   * Resolve wrap mode string to WebGL constant.
   */
  private static resolveWrap(gl: WebGLContext, wrap: TextureWrap): number {
    switch (wrap) {
      case "repeat":
        return gl.REPEAT;
      case "mirror":
        return gl.MIRRORED_REPEAT;
      case "clamp":
      default:
        return gl.CLAMP_TO_EDGE;
    }
  }

  /**
   * Resolve texture options with defaults.
   */
  private static resolveOptions(source: TextureSource, options?: TextureOptions): ResolvedTextureOptions {
    const wrap = options?.wrap ?? "clamp";
    return {
      wrap,
      wrapS: options?.wrapS ?? wrap,
      wrapT: options?.wrapT ?? wrap,
      minFilter: options?.minFilter ?? "linear",
      magFilter: options?.magFilter ?? "linear",
      flipY: options?.flipY ?? true,
      dynamic: options?.dynamic ?? Texture.isDynamicSource(source),
    };
  }

  /**
   * Check if a source is dynamic (needs re-upload every frame).
   */
  private static isDynamicSource(source: TextureSource): boolean {
    return source instanceof HTMLVideoElement;
  }
}
