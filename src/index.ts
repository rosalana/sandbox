import type {
  AnyUniformValue,
  HookCallback,
  ModuleDefinition,
  ResolvedSandboxOptions,
  SandboxOptions,
  UniformSchema,
  WebGLVersion,
} from "./types";
import { SandboxError } from "./errors";

import Listener from "./tools/listener";
import WebGL from "./tools/web_gl";
import Program from "./tools/program";
import Module from "./tools/module";
import ModuleRegistry from "./tools/module_registry";
import Shader from "./tools/shader";
import { modules as defaultModules } from "./defaults";

export * from "./types";
export * from "./errors";

import WebGL1_Vert from "./shaders/webgl1_shader.vert?raw";
import WebGL1_Frag from "./shaders/webgl1_shader.frag?raw";
import WebGL2_Vert from "./shaders/webgl2_shader.vert?raw";
import WebGL2_Frag from "./shaders/webgl2_shader.frag?raw";
import Test_Frag from "./shaders/test.frag?raw";

/**
 * Sandbox - A lightweight WebGL wrapper for shader effects.
 *
 * @example
 * // Static rendering
 * const sandbox = new Sandbox(canvas, {
 *   fragment: myShader,
 *   autoplay: false,
 * });
 * sandbox.setUniforms({ u_time: 1.5 }).render();
 *
 * @example
 * // Animation loop
 * const sandbox = new Sandbox(canvas, {
 *   fragment: myShader,
 *   autoplay: true,
 * });
 */
export class Sandbox {
  /** Active event listeners */
  private listeners: (() => void)[] = [];
  /** HTML canvas element */
  private canvasEl: HTMLCanvasElement;
  /** Resolved options */
  private options: ResolvedSandboxOptions;
  /** WebGL engine */
  private engine: WebGL;

  /** User sets custom vertex shader */
  private usingCustomVertex = false;

  constructor(canvas: HTMLCanvasElement, options?: SandboxOptions) {
    this.canvasEl = canvas;
    this.options = this.resolveOptions(options);

    this.engine = WebGL.setup(this.canvasEl, this.options);

    this.setupListeners();
    this.setViewport();

    if (this.options.autoplay) {
      this.play();
    }
  }

  /**
   * Sandbox - A lightweight WebGL wrapper for shader effects.
   *
   * @example
   * // Static rendering
   * const sandbox = Sandbox.create(canvas, {
   *   fragment: myShader,
   *   autoplay: false,
   * });
   * sandbox.setUniforms({ u_time: 1.5 }).render();
   *
   * @example
   * // Animation loop
   * const sandbox = Sandbox.create(canvas, {
   *   fragment: myShader,
   *   autoplay: true,
   * });
   */
  static create(canvas: HTMLCanvasElement, options?: SandboxOptions): Sandbox {
    return new Sandbox(canvas, options);
  }

  /**
   * Define a shader module that can be imported in shader source with `#import <function> from "module_name"`.
   * @example
   * Sandbox.defineModule("my_module", source);
   * // Then in shader:
   * // #import myFunc from "my_module"
   * // void main() {
   * //   myFunc();
   * // }
   */
  static defineModule(definition: ModuleDefinition): void {
    Module.define(definition);
  }

  /**
   * Get the list of available shader modules that can be used with `#import` in shader source.
   */
  static availableModules() {
    return ModuleRegistry.available();
  }

  /**
   * Compile a shader source with Sandbox's shader preprocessor and return the final GLSL code.
   * This is useful for debugging shader code or precompiling shaders for production use.
   */
  static compile(shaderSource: string): string {
    return new Shader(shaderSource).compile();
  }

  private resolveOptions(options?: SandboxOptions): ResolvedSandboxOptions {
    const defaults = {
      vertex: WebGL1_Vert,
      fragment: WebGL1_Frag,
      autoplay: true,
      pauseWhenHidden: true,
      dpr: "auto" as "auto",
      fps: 0,
      preserveDrawingBuffer: false,
      antialias: true,
      onError: (error: SandboxError) => {
        console.error(
          "Oops!",
          error,
          "\nYou can handle errors programmatically by providing an onError callback to suppress this log and implement custom fallback behavior.",
        );
      },
      onLoad: () => {},
      onBeforeRender: null,
      onAfterRender: null,
      uniforms: {},
    };

    if (options?.vertex) this.usingCustomVertex = true;

    // If only vertex is provided, set matching fragment
    if (options?.vertex && !options?.fragment) {
      const version = Program.detectVersion(options.vertex);
      defaults.vertex = options.vertex;
      defaults.fragment = version === 2 ? WebGL2_Frag : WebGL1_Frag;
    }

    // If only fragment is provided, set matching vertex
    if (options?.fragment && !options?.vertex) {
      const version = Program.detectVersion(options.fragment);
      defaults.fragment = options.fragment;
      defaults.vertex = version === 2 ? WebGL2_Vert : WebGL1_Vert;
    }

    return { ...defaults, ...options };
  }

  private setupListeners(): void {
    this.listeners.push(
      // Window resize
      Listener.on(window, "resize", () => {
        this.setViewport();
      }),

      // Canvas resize
      Listener.on(this.canvasEl, "resize", () => {
        this.setViewport();
      }),

      // Visibility check on scroll
      (() => {
        let pausedByViewport = false;

        return Listener.on(document, "scroll", (event) => {
          if (!this.options.pauseWhenHidden) return;

          if (this.isInViewport()) {
            // should be playing if not paused manually
            if (pausedByViewport && !this.isPlaying()) {
              this.play();
              pausedByViewport = false;
            }
          } else {
            // should be paused...
            if (this.isPlaying()) {
              this.pause();
              pausedByViewport = true;
            }
          }
        });
      })(),

      // Mouse tracking
      Listener.on(document, "mousemove", (e) => {
        this.setMouse(e.clientX || e.pageX, e.clientY || e.pageY);
      }),

      // Touch tracking
      Listener.on(document, "touchmove", (e) => {
        if (e.touches.length > 0) {
          this.setMouse(e.touches[0].clientX, e.touches[0].clientY);
        }
      }),
    );
  }

  private destroyListeners(): void {
    this.listeners.forEach((destroy) => destroy());
    this.listeners = [];
  }

  private setViewport(): void {
    const dpr =
      this.options.dpr === "auto"
        ? Math.min(2, window.devicePixelRatio || 1)
        : this.options.dpr;

    const cssW = this.canvasEl.clientWidth || this.canvasEl.width || 1;
    const cssH = this.canvasEl.clientHeight || this.canvasEl.height || 1;

    this.engine.viewport(
      0,
      0,
      Math.max(1, Math.floor(cssW * dpr)),
      Math.max(1, Math.floor(cssH * dpr)),
    );
  }

  private isInViewport(): boolean {
    const rect = this.canvasEl.getBoundingClientRect();

    return (
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.top <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.left <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  private setMouse(x: number, y: number): void {
    const rect = this.canvasEl.getBoundingClientRect();
    const inCanvas =
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

    if (inCanvas) {
      this.engine.mouse(x - rect.left, y - rect.top);
    }
  }

  /**
   * Set a single uniform value with type checking.
   * @example
   * sandbox.setUniform<Vec3>("u_color", [1, 0, 0]);
   * sandbox.setUniform<number>("u_time", 1.5);
   * sandbox.setUniform<Vec3[]>("u_colors", [[1, 0, 0], [0, 1, 0]]);
   */
  setUniform<T extends AnyUniformValue>(name: string, value: T): this {
    this.engine.uniform<T>(name, value);
    return this;
  }

  /**
   * Set multiple uniforms at once with type checking.
   * @example
   * interface MyUniforms extends UniformSchema {
   *   u_time: number;
   *   u_resolution: Vec2;
   *   u_colors: Vec3[];
   * }
   * sandbox.setUniforms<MyUniforms>({
   *   u_time: 1.5,
   *   u_resolution: [800, 600],
   *   u_colors: [[1, 0, 0], [0, 1, 0]],
   * });
   */
  setUniforms<T extends UniformSchema>(uniforms: T): this {
    this.engine.uniforms<T>(uniforms);
    return this;
  }

  /**
   * Get current uniform value.
   */
  getUniform<T extends AnyUniformValue>(name: string): T | undefined {
    return this.engine.getUniform<T>(name);
  }

  /**
   * Update shaders.
   * @example
   * sandbox.setShader(vertexSource, fragmentSource);
   */
  setShader(vertex: string, fragment: string): this {
    // Update options
    this.options.vertex = vertex;
    this.options.fragment = fragment;

    // Mark as custom shader
    this.usingCustomVertex = true;

    this.engine.shader(this.options.vertex, this.options.fragment);
    return this;
  }

  /**
   * Update only fragment shader (uses default vertex).
   * @example
   * sandbox.setFragment(fragmentSource);
   */
  setFragment(fragment: string): this {
    // Detect versions
    const fragVersion = Program.detectVersion(fragment);
    const vertVersion = Program.detectVersion(this.options.vertex);

    // Update options
    this.options.fragment = fragment;

    if (fragVersion !== vertVersion) {
      if (!this.usingCustomVertex) {
        // Auto-switch only if not using custom vertex shader
        this.options.vertex = fragVersion === 2 ? WebGL2_Vert : WebGL1_Vert;
      }
    }

    this.engine.shader(this.options.vertex, this.options.fragment);
    return this;
  }

  /**
   * Get current fragment shader source.
   */
  getFragment(): string {
    return this.options.fragment;
  }

  /**
   * Get current vertex shader source.
   */
  getVertex(): string {
    return this.options.vertex;
  }

  /**
   * Set the max frame rate runtime
   *
   * @example
   * sandbox.setFps(30); // Limit to 30 FPS
   * sandbox.setFps(0);  // Unlimited FPS
   */
  setFps(fps: number): this {
    this.engine.getClock().setMaxFps(fps);
    return this;
  }

  /**
   * Add a runtime render hook.
   */
  hook(callback: HookCallback, when: "before" | "after" = "before") {
    if (when === "before") {
      return this.engine.onBeforeHooks.add(callback);
    } else {
      return this.engine.onAfterHooks.add(callback);
    }
  }

  /**
   * Start animation loop.
   */
  play(): this {
    this.engine.play();
    return this;
  }

  /**
   * Start animation loop at specific time (in seconds).
   */
  playAt(time: number): this {
    this.engine.clock(time);
    this.engine.play();
    return this;
  }

  /**
   * Stop animation loop.
   */
  pause(): this {
    this.engine.pause();
    return this;
  }

  /**
   * Pause animation loop at specific time (in seconds).
   */
  pauseAt(time: number): this {
    const remove = this.hook((state) => {
      if (state.time >= time) {
        remove();
        this.pause();
      }
    }, "after");

    return this;
  }

  /**
   * Toggle play/pause state.
   */
  toggle(): this {
    if (this.engine.playing) {
      this.pause();
    } else {
      this.play();
    }
    return this;
  }

  /**
   * Set current time (in seconds).
   */
  time(time: number): this {
    this.engine.clock(time);
    return this;
  }

  /**
   * Render a single frame (for static rendering).
   * @example
   * sandbox.time(1.4).render();
   */
  render(): this {
    this.engine.render();
    return this;
  }

  /**
   * Render at specific time (for deterministic output).
   * @example
   * sandbox.renderAt(2.5); // Render as if 2.5 seconds elapsed
   */
  renderAt(time: number): this {
    this.engine.clock(time);
    this.engine.render();
    return this;
  }

  /**
   * Check if currently playing.
   */
  isPlaying(): boolean {
    return this.engine.playing;
  }

  /**
   * Get WebGL version using (1 or 2).
   */
  get version(): WebGLVersion {
    return this.engine.getVersion();
  }

  /**
   * Get canvas element.
   */
  get canvas(): HTMLCanvasElement {
    return this.canvasEl;
  }

  /**
   * Destroy sandbox and release all resources.
   * @example
   * onUnmounted(() => {
   *   sandbox.destroy();
   * });
   */
  destroy(): void {
    this.destroyListeners();
    this.engine.destroy();
  }
}

// Initialize default modules
ModuleRegistry.load(
  Array.from(defaultModules.values()).map(
    (def) => new Module(def.name, def.source, def.options),
  ),
);
