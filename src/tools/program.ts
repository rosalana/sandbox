import type { WebGLContext, WebGLVersion } from "../types";
import {
  SandboxProgramError,
  SandboxShaderCompilationError,
  SandboxShaderVersionMismatchError,
} from "../errors";

/**
 * Manages shader compilation and program linking.
 * Automatically detects WebGL version from shader source.
 */
export default class Program {
  private gl: WebGLContext;
  private program: WebGLProgram | null = null;
  private vertexShader: WebGLShader | null = null;
  private fragmentShader: WebGLShader | null = null;
  private version: WebGLVersion = 1;

  constructor(gl: WebGLContext) {
    this.gl = gl;
  }

  /**
   * Detect WebGL version from shader source.
   * Looks for "#version 300 es" directive.
   */
  static detectVersion(source: string): WebGLVersion {
    // Match "#version 300 es" at the start of a line
    return /^\s*#version\s+300\s+es/m.test(source) ? 2 : 1;
  }

  /**
   * Compile shaders and link program.
   * @throws ShaderCompilationError if compilation fails
   * @throws ProgramLinkError if linking fails
   */
  compile(vertexSource: string, fragmentSource: string): this {
    // Clean up previous program if exists
    this.destroy();

    // Detect version from shaders
    const vertVersion = Program.detectVersion(vertexSource);
    const fragVersion = Program.detectVersion(fragmentSource);

    if (vertVersion != fragVersion) {
      throw new SandboxShaderVersionMismatchError(vertVersion, fragVersion);
    }

    this.version = Math.max(vertVersion, fragVersion) as WebGLVersion;

    // Compile shaders
    this.vertexShader = this.compileShader("vertex", vertexSource);
    this.fragmentShader = this.compileShader("fragment", fragmentSource);

    // Link program
    this.linkProgram();

    return this;
  }

  /**
   * Bind this program for rendering.
   */
  use(): this {
    if (this.program) {
      this.gl.useProgram(this.program);
    }
    return this;
  }

  /**
   * Get the compiled WebGL program.
   */
  getProgram(): WebGLProgram | null {
    return this.program;
  }

  /**
   * Get detected WebGL version.
   */
  getVersion(): WebGLVersion {
    return this.version;
  }

  /**
   * Get attribute location.
   */
  getAttribLocation(name: string): number {
    if (!this.program) return -1;
    return this.gl.getAttribLocation(this.program, name);
  }

  /**
   * Get uniform location.
   */
  getUniformLocation(name: string): WebGLUniformLocation | null {
    if (!this.program) return null;
    return this.gl.getUniformLocation(this.program, name);
  }

  /**
   * Cleanup all GPU resources.
   */
  destroy(): void {
    const gl = this.gl;

    if (this.program) {
      // Detach shaders before deleting program
      if (this.vertexShader) {
        gl.detachShader(this.program, this.vertexShader);
      }
      if (this.fragmentShader) {
        gl.detachShader(this.program, this.fragmentShader);
      }
      gl.deleteProgram(this.program);
      this.program = null;
    }

    if (this.vertexShader) {
      gl.deleteShader(this.vertexShader);
      this.vertexShader = null;
    }

    if (this.fragmentShader) {
      gl.deleteShader(this.fragmentShader);
      this.fragmentShader = null;
    }
  }

  /**
   * Compile a single shader.
   * @throws ShaderCompilationError if compilation fails
   */
  private compileShader(
    type: "vertex" | "fragment",
    source: string,
  ): WebGLShader {
    const gl = this.gl;
    const glType = type === "vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER;

    const shader = gl.createShader(glType);
    if (!shader) {
      throw new SandboxShaderCompilationError(
        type,
        source,
        "Failed to create shader object",
      );
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // Check compilation status
    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
      const infoLog = gl.getShaderInfoLog(shader) || "Unknown error";
      gl.deleteShader(shader);
      throw new SandboxShaderCompilationError(type, source, infoLog);
    }

    return shader;
  }

  /**
   * Link vertex and fragment shaders into a program.
   * @throws ProgramLinkError if linking fails
   */
  private linkProgram(): void {
    const gl = this.gl;

    if (!this.vertexShader || !this.fragmentShader) {
      throw new SandboxProgramError("Shaders not compiled");
    }

    const program = gl.createProgram();
    if (!program) {
      throw new SandboxProgramError("Failed to create program object");
    }

    gl.attachShader(program, this.vertexShader);
    gl.attachShader(program, this.fragmentShader);
    gl.linkProgram(program);

    // Check link status
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
      const infoLog = gl.getProgramInfoLog(program) || "Unknown error";
      gl.deleteProgram(program);
      throw new SandboxProgramError(infoLog);
    }

    this.program = program;
  }
}
