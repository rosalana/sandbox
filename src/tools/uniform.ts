import type {
  AnyUniformValue,
  UniformMethod,
  WebGLContext,
} from "../types";

/**
 * Handles a single uniform variable.
 * Caches WebGL location and infers the correct setter method from value type.
 */
export default class Uniform {
  readonly name: string;
  readonly method: UniformMethod;
  readonly isArray: boolean;
  readonly isMatrix: boolean;

  private location: WebGLUniformLocation | null = null;
  private locationResolved = false;
  private value: AnyUniformValue;

  constructor(name: string, value: AnyUniformValue) {
    this.name = name;
    this.value = value;

    const info = Uniform.inferMethodInfo(value);
    this.method = info.method;
    this.isArray = info.isArray;
    this.isMatrix = info.isMatrix;
  }

  /**
   * Infer WebGL method and metadata from value type.
   */
  private static inferMethodInfo(value: AnyUniformValue): {
    method: UniformMethod;
    isArray: boolean;
    isMatrix: boolean;
  } {
    // Boolean → uniform1i
    if (typeof value === "boolean") {
      return { method: "uniform1i", isArray: false, isMatrix: false };
    }

    // Number → uniform1f
    if (typeof value === "number") {
      return { method: "uniform1f", isArray: false, isMatrix: false };
    }

    // Must be an array at this point
    if (!Array.isArray(value)) {
      return { method: "uniform1f", isArray: false, isMatrix: false };
    }

    const len = value.length;
    const first = value[0];

    // Nested array = array uniform (e.g., [[1,0,0], [0,1,0]] for vec3[])
    if (Array.isArray(first)) {
      const innerLen = first.length;
      switch (innerLen) {
        case 2:
          return { method: "uniform2fv", isArray: true, isMatrix: false };
        case 3:
          return { method: "uniform3fv", isArray: true, isMatrix: false };
        case 4:
          return { method: "uniform4fv", isArray: true, isMatrix: false };
        default:
          return { method: "uniform1fv", isArray: true, isMatrix: false };
      }
    }

    // Flat array - could be vector, matrix, or float array
    switch (len) {
      case 2:
        return { method: "uniform2fv", isArray: false, isMatrix: false };
      case 3:
        return { method: "uniform3fv", isArray: false, isMatrix: false };
      case 4:
        // Could be vec4 or mat2 - assume vec4 (more common)
        return { method: "uniform4fv", isArray: false, isMatrix: false };
      case 9:
        return { method: "uniformMatrix3fv", isArray: false, isMatrix: true };
      case 16:
        return { method: "uniformMatrix4fv", isArray: false, isMatrix: true };
      default:
        // Float array
        return { method: "uniform1fv", isArray: true, isMatrix: false };
    }
  }

  /**
   * Resolve and cache uniform location from program.
   * Returns null if uniform doesn't exist (optimized out by compiler, etc.)
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
   * Update value (doesn't upload to GPU until upload() is called).
   */
  setValue(value: AnyUniformValue): void {
    this.value = value;
  }

  /**
   * Get current value.
   */
  getValue(): AnyUniformValue {
    return this.value;
  }

  /**
   * Upload current value to GPU.
   * @param gl - WebGL context
   * @param program - Current WebGL program (for location resolution)
   */
  upload(gl: WebGLContext, program: WebGLProgram): void {
    const location = this.resolveLocation(gl, program);

    // Uniform doesn't exist in shader (optimized out) - silently skip
    if (location === null) {
      return;
    }

    const value = this.value;

    // Prepare data for WebGL
    let data: number | Int32Array | Float32Array;

    if (typeof value === "boolean") {
      data = value ? 1 : 0;
    } else if (typeof value === "number") {
      data = value;
    } else if (this.isArray && Array.isArray(value[0])) {
      // Flatten nested array: [[1,2,3], [4,5,6]] → [1,2,3,4,5,6]
      data = new Float32Array(
        (value as readonly (readonly number[])[]).flat(),
      );
    } else {
      data = new Float32Array(value as readonly number[]);
    }

    // Call the appropriate WebGL method
    switch (this.method) {
      case "uniform1f":
        gl.uniform1f(location, data as number);
        break;
      case "uniform1i":
        gl.uniform1i(location, data as number);
        break;
      case "uniform1fv":
        gl.uniform1fv(location, data as Float32Array);
        break;
      case "uniform2fv":
        gl.uniform2fv(location, data as Float32Array);
        break;
      case "uniform3fv":
        gl.uniform3fv(location, data as Float32Array);
        break;
      case "uniform4fv":
        gl.uniform4fv(location, data as Float32Array);
        break;
      case "uniformMatrix2fv":
        gl.uniformMatrix2fv(location, false, data as Float32Array);
        break;
      case "uniformMatrix3fv":
        gl.uniformMatrix3fv(location, false, data as Float32Array);
        break;
      case "uniformMatrix4fv":
        gl.uniformMatrix4fv(location, false, data as Float32Array);
        break;
    }
  }
}
