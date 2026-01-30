import type { SandboxError } from "./errors";

/** Sandbox configuration options */
export interface SandboxOptions {
  /** Vertex shader source code */
  vertex?: string;
  /** Fragment shader source code */
  fragment?: string;
  /** Auto-play the sandbox on creation (default: true) */
  autoplay?: boolean;
  /** Pause rendering when canvas not visible (default: true) */
  pauseWhenHidden?: boolean;
  /** Device pixel ratio - "auto" uses window.devicePixelRatio (default: "auto") */
  dpr?: number | "auto";
  /** Preserve drawing buffer for screenshots (default: false) */
  preserveDrawingBuffer?: boolean;
  /** Enable antialiasing (default: true) */
  antialias?: boolean;
  /** Error callback for shader compilation or runtime errors */
  onError?: (error: SandboxError) => void;
  /** Callback when sandbox is ready */
  onLoad?: () => void;
  /** Callback called each frame before render */
  onBeforeRender?: HookCallback | null;
  /** Callback called each frame after render */
  onAfterRender?: HookCallback | null;
  /** Initial uniforms to set */
  uniforms?: UniformSchema;
}

/** Resolved sandbox options with all defaults applied */
export type ResolvedSandboxOptions = Required<SandboxOptions>;

/** WebGL version (1 = WebGL, 2 = WebGL2) */
export type WebGLVersion = 1 | 2;

/** Union of WebGL context types */
export type WebGLContext = WebGLRenderingContext | WebGL2RenderingContext;

/** Vector types as tuples */
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

/** Matrix types (column-major, as WebGL expects) */
export type Mat2 = [number, number, number, number];
export type Mat3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export type Mat4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** Single uniform value types (scalars and vectors) */
export type UniformValue =
  | number
  | boolean
  | Vec2
  | Vec3
  | Vec4
  | Mat2
  | Mat3
  | Mat4;

/** Array uniform types (for u_colors[10], u_positions[10], etc.) */
export type UniformArrayValue = number[] | Vec2[] | Vec3[] | Vec4[];

/** All valid uniform value types */
export type AnyUniformValue = UniformValue | UniformArrayValue;

/**
 * Helper type for defining uniform schemas.
 * @example
 * interface GradientUniforms extends UniformSchema {
 *   u_time: number;
 *   u_resolution: Vec2;
 *   u_colors: Vec3[];
 * }
 */
export interface UniformSchema {
  [key: string]: AnyUniformValue;
}

/** WebGL uniform setter method names */
export type UniformMethod =
  | "uniform1f"
  | "uniform1i"
  | "uniform1fv"
  | "uniform2fv"
  | "uniform3fv"
  | "uniform4fv"
  | "uniformMatrix2fv"
  | "uniformMatrix3fv"
  | "uniformMatrix4fv";

/** Clock state passed to render callbacks */
export interface ClockState {
  /** Total elapsed time in seconds */
  time: number;
  /** Delta time since last frame in seconds */
  delta: number;
  /** Frame counter */
  frame: number;
}

/** Internal uniform entry for caching */
export interface UniformEntry {
  name: string;
  location: WebGLUniformLocation | null;
  method: UniformMethod;
  value: AnyUniformValue;
  isArray: boolean;
  needsTranspose: boolean;
}

/** Geometry draw mode */
export type DrawMode = "TRIANGLES" | "TRIANGLE_STRIP" | "TRIANGLE_FAN";

/** Render callback signature */
export type HookCallback = (clock: ClockState) => void | false;
