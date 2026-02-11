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
  /** Max Frame rate (default: 0 as unlimited) */
  fps?: number;
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
  /** Is the clock currently running */
  running: boolean;
  /** Frame rate in frames per second */
  fps: number;
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

/** GLSL uniform types */
export type GLSLType =
  | "float"
  | "int"
  | "bool"
  | "vec2"
  | "vec3"
  | "vec4"
  | "ivec2"
  | "ivec3"
  | "ivec4"
  | "bvec2"
  | "bvec3"
  | "bvec4"
  | "mat2"
  | "mat3"
  | "mat4"
  | "sampler2D"
  | "samplerCube";

export type GLSLVariable = {
  /** Variable name */
  name: string;
  /** GLSL type */
  type: GLSLType;
};

/** Import statement parsed from shader */
export type ShaderImport = {
  /** Module identifier (e.g., "sandbox/math") */
  module: string;
  /** Original function name in module */
  name: string;
  /** Alias to use in shader (defaults to name) */
  alias: string;
  /** Line number where import appears */
  line?: number;
};

export type ShaderUniform = GLSLVariable & {
  /** Line number where import appears */
  name: "u_time" | "u_resolution" | "u_delta" | "u_mouse" | "u_frame" | string;
  line?: number;
};

type ShaderFunctionDependency = {
  /** Name of the dependent */
  name: string;
  /** Type of dependency */
  type: "function" | "uniform";
  /** Line number where the dependent is used */
  line?: number;
  /** Character position in source where the dependent is used (for better error reporting) */
  position?: number;
}

export type ShaderFunction = {
  /** Function name */
  name: string;
  /** Return type */
  type: GLSLType;
  /** Function parameters */
  params: GLSLVariable[];
  /** Function body (including braces) */
  body: string;
  /** List of dependencies (functions or uniforms) this function has */
  dependencies: ShaderFunctionDependency[];
  /** Line number where function is declared */
  line?: number;
};

export type ShaderParseResult = {
  /** All imports found in shader */
  imports: ShaderImport[];
  /** All uniforms declared in shader */
  uniforms: ShaderUniform[];
  /** All functions declared in shader */
  functions: ShaderFunction[];
  /** GLSL version */
  version: WebGLVersion;
};

export interface ModuleDefinition {
  /** Module name */
  name: string;
  /** GLSL source code containing functions */
  source: string;
  /** Optional options for module */
  options?: Record<string, any>; // add TS for this
}

export type ModuleFunctionExtraction = {
  function: ShaderFunction;
  uniforms: ShaderUniform[];
};
