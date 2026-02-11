import type {
  AnyUniformValue,
  ClockState,
  ResolvedSandboxOptions,
  UniformSchema,
  Vec2,
  WebGLContext,
  WebGLVersion,
} from "../types";
import { SandboxError, SandboxWebGLNotSupportedError } from "../errors";
import Clock from "./clock";
import Geometry from "./geometry";
import Program from "./program";
import Uniforms from "./uniforms";
import Hooks from "./hooks";
import Shader from "./shader";

/**
 * Main WebGL orchestrator.
 * Manages context, program, geometry, uniforms, and rendering loop.
 */
export default class WebGL {
  private canvas: HTMLCanvasElement;
  private gl: WebGLContext;
  private options: ResolvedSandboxOptions;

  onBeforeHooks: Hooks = new Hooks();
  onAfterHooks: Hooks = new Hooks();

  private _program: Program;
  private _geometry: Geometry;
  private _uniforms: Uniforms;
  private _clock: Clock;

  private _resolution: Vec2 = [1, 1];
  private _mouse: Vec2 = [0, 0];
  private _version: WebGLVersion = 1;

  playing = false;

  private constructor(
    canvas: HTMLCanvasElement,
    options: ResolvedSandboxOptions,
  ) {
    this.canvas = canvas;
    this.options = options;

    // Initialize context
    this.gl = this.initContext();

    // Enable extensions
    this.enableExtensions();

    // Initialize subsystems
    this._program = new Program(this.gl);
    this._geometry = Geometry.fullscreenQuad(this.gl);
    this._uniforms = new Uniforms(this.gl);
    this._clock = new Clock();

    // Apply max FPS if specified
    if (this.options.fps) {
      this._clock.setMaxFps(this.options.fps);
    }

    if (this.options.onBeforeRender) {
      this.onBeforeHooks.add(this.options.onBeforeRender);
    }

    if (this.options.onAfterRender) {
      this.onAfterHooks.add(this.options.onAfterRender);
    }

    // Bind render method
    this.onRender = this.onRender.bind(this);
  }

  /**
   * Factory method to create and setup WebGL instance.
   */
  static setup(
    canvas: HTMLCanvasElement,
    options: ResolvedSandboxOptions,
  ): WebGL {
    const webgl = new WebGL(canvas, options);

    // Compile shaders if provided
    if (options.vertex && options.fragment) {
      webgl.shader(options.vertex, options.fragment);
    }

    // Set initial uniforms
    if (options.uniforms) {
      webgl._uniforms.setMany(options.uniforms);
    }

    return webgl;
  }

  /**
   * Initialize WebGL context.
   * Tries WebGL2 first, falls back to WebGL1.
   * Context errors are fatal but still reported via onError.
   */
  private initContext(): WebGLContext {
    const attrs: WebGLContextAttributes = {
      antialias: this.options.antialias,
      preserveDrawingBuffer: this.options.preserveDrawingBuffer,
      alpha: true,
      depth: false,
      stencil: false,
    };

    // Try WebGL2 first
    const gl2 = this.canvas.getContext("webgl2", attrs);
    if (gl2) {
      this._version = 2;
      return gl2;
    }

    // Fallback to WebGL1
    const gl1 = this.canvas.getContext("webgl", attrs);
    if (gl1) {
      this._version = 1;
      return gl1;
    }

    // WebGL not supported - fatal error
    const error = new SandboxWebGLNotSupportedError();
    this.options.onError(error);
    throw error;
  }

  /**
   * Enable useful WebGL extensions.
   */
  private enableExtensions(): void {
    // OES_standard_derivatives for dFdx/dFdy in fragment shaders
    this.gl.getExtension("OES_standard_derivatives");

    // Float textures (for future texture support)
    this.gl.getExtension("OES_texture_float");
    this.gl.getExtension("OES_texture_float_linear");

    // VAO extension for WebGL1
    if (this._version === 1) {
      this.gl.getExtension("OES_vertex_array_object");
    }
  }

  /**
   * Set viewport dimensions.
   */
  viewport(x: number, y: number, width: number, height: number): this {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(x, y, width, height);
    this._resolution = [width, height];
    return this;
  }

  /**
   * Set the clock time
   */
  clock(time: number): this {
    this._clock.setTime(time);
    return this;
  }

  /**
   * Update mouse position.
   */
  mouse(x: number, y: number): this {
    this._mouse = [x, y];
    return this;
  }

  /**
   * Set a uniform value.
   */
  uniform<T extends AnyUniformValue>(name: string, value: T): this {
    this._uniforms.set(name, value);
    return this;
  }

  /**
   * Set multiple uniforms.
   */
  uniforms<T extends UniformSchema>(values: T): this {
    this._uniforms.setMany(values);
    return this;
  }

  /**
   * Get current uniform value.
   */
  getUniform<T extends AnyUniformValue>(name: string): T | undefined {
    return this._uniforms.get(name) as T | undefined;
  }

  /**
   * Compile and link shaders.
   * Errors are handled via onError callback, never thrown.
   */
  shader(vertex: string, fragment: string): this {
    try {
      // Compile Sandbox syntax shaders to WebGL GLSL
      const vert = new Shader(vertex).compile();
      const frag = new Shader(fragment).compile();

      this._program.compile(vert, frag);

      // Update version based on shaders
      this._version = this._program.getVersion();

      // Link attributes to geometry
      this._geometry.linkAttributes(this._program);

      // Attach program to uniforms for location caching
      const webglProgram = this._program.getProgram();
      if (webglProgram) {
        this._uniforms.attachProgram(webglProgram);
      }

      // Call onLoad callback after successful shader setup
      this.options.onLoad();
    } catch (error) {
      if (error instanceof SandboxError) {
        this.options.onError(error);
      }
    }

    return this;
  }

  /**
   * Start animation loop.
   */
  play(): this {
    if (this.playing) return this;

    this.playing = true;
    this._clock.start(this.onRender);

    return this;
  }

  /**
   * Stop animation loop.
   */
  pause(): this {
    if (!this.playing) return this;

    const state = this._clock.getState();

    this.onBeforeHooks.run(state);

    this.playing = false;
    this._clock.stop();

    this.onAfterHooks.run(state);

    return this;
  }

  /**
   * Render a single frame.
   */
  render(): this {
    this.onRender(this._clock.getState());
    return this;
  }

  /**
   * Get WebGL context.
   */
  getContext(): WebGLContext {
    return this.gl;
  }

  /**
   * Get detected WebGL version.
   */
  getVersion(): WebGLVersion {
    return this._version;
  }

  /**
   * Get the clock instance
   */
  getClock(): Clock {
    return this._clock;
  }

  /**
   * Cleanup all resources.
   */
  destroy(): void {
    this.pause();
    this._clock.destroy();
    this._geometry.destroy();
    this._program.destroy();
    this._uniforms.destroy();
    this.onAfterHooks.destroy();
    this.onBeforeHooks.destroy();
  }

  /**
   * Internal render callback.
   */
  private onRender(state: ClockState): void {
    const gl = this.gl;

    // Call before render callback
    this.onBeforeHooks.run(state);

    // Clear canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use program
    this._program.use();

    // Upload built-in uniforms
    this._uniforms.uploadBuiltIns(state, this._resolution, this._mouse);

    // Upload all other uniforms
    this._uniforms.uploadAll();

    // Draw geometry
    this._geometry.bind();
    this._geometry.draw();

    // Call after render callback
    this.onAfterHooks.run(state);
  }
}
