import type { WebGLContext } from "../types";
import Program from "./program";

/**
 * Manages vertex buffers and geometry for rendering.
 * Handles WebGL1 vs WebGL2 VAO differences automatically.
 */
export default class Geometry {
  private gl: WebGLContext;
  private vao: WebGLVertexArrayObject | null = null;
  private vbo: WebGLBuffer | null = null;
  private ibo: WebGLBuffer | null = null;
  private vertexCount = 0;
  private indexCount = 0;
  private useIndices = false;

  // WebGL1 VAO extension (if available)
  private vaoExt: OES_vertex_array_object | null = null;
  private isWebGL2: boolean;

  constructor(gl: WebGLContext) {
    this.gl = gl;
    this.isWebGL2 = gl instanceof WebGL2RenderingContext;

    // Get VAO extension for WebGL1
    if (!this.isWebGL2) {
      this.vaoExt = gl.getExtension("OES_vertex_array_object");
    }
  }

  /**
   * Create a fullscreen quad geometry.
   * This is the most common use case for shader effects.
   */
  static fullscreenQuad(gl: WebGLContext): Geometry {
    const geometry = new Geometry(gl);

    // Two triangles covering NDC [-1, 1] range
    // Each vertex: position (x, y), texcoord (u, v)
    const vertices = new Float32Array([
      // position    texcoord
      -1, -1,        0, 0,  // bottom-left
       1, -1,        1, 0,  // bottom-right
      -1,  1,        0, 1,  // top-left
       1,  1,        1, 1,  // top-right
    ]);

    const indices = new Uint16Array([
      0, 1, 2,  // first triangle
      2, 1, 3,  // second triangle
    ]);

    geometry.setup(vertices, indices);

    return geometry;
  }

  /**
   * Setup geometry from vertex and index data.
   */
  setup(vertices: Float32Array, indices?: Uint16Array): this {
    const gl = this.gl;

    // Create and bind VAO
    this.createVAO();
    this.bindVAO();

    // Create and upload vertex buffer
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // 4 floats per vertex (position xy + texcoord uv)
    this.vertexCount = vertices.length / 4;

    // Create and upload index buffer if provided
    if (indices) {
      this.ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      this.indexCount = indices.length;
      this.useIndices = true;
    }

    // Unbind VAO
    this.unbindVAO();

    return this;
  }

  /**
   * Link vertex attributes to shader program.
   * Call this after compiling shaders.
   */
  linkAttributes(program: Program): this {
    const gl = this.gl;

    this.bindVAO();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

    // Stride: 4 floats per vertex (16 bytes)
    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;

    // Position attribute (a_position or aPosition)
    const posLoc = this.getPositionLocation(program);
    if (posLoc >= 0) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
    }

    // Texcoord attribute (a_texcoord or aTexCoord)
    const texLoc = this.getTexcoordLocation(program);
    if (texLoc >= 0) {
      gl.enableVertexAttribArray(texLoc);
      gl.vertexAttribPointer(
        texLoc,
        2,
        gl.FLOAT,
        false,
        stride,
        2 * Float32Array.BYTES_PER_ELEMENT,
      );
    }

    // Re-bind index buffer if using indices
    if (this.useIndices) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    }

    this.unbindVAO();

    return this;
  }

  /**
   * Bind geometry for rendering.
   */
  bind(): this {
    this.bindVAO();
    return this;
  }

  /**
   * Unbind geometry.
   */
  unbind(): this {
    this.unbindVAO();
    return this;
  }

  /**
   * Draw the geometry.
   */
  draw(): this {
    const gl = this.gl;

    this.bindVAO();

    if (this.useIndices) {
      gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.vertexCount);
    }

    return this;
  }

  /**
   * Cleanup all GPU resources.
   */
  destroy(): void {
    const gl = this.gl;

    this.deleteVAO();

    if (this.vbo) {
      gl.deleteBuffer(this.vbo);
      this.vbo = null;
    }

    if (this.ibo) {
      gl.deleteBuffer(this.ibo);
      this.ibo = null;
    }
  }

  /**
   * Get position attribute location.
   * Tries common naming conventions.
   */
  private getPositionLocation(program: Program): number {
    // Try common names
    let loc = program.getAttribLocation("a_position");
    if (loc >= 0) return loc;

    loc = program.getAttribLocation("aPosition");
    if (loc >= 0) return loc;

    loc = program.getAttribLocation("position");
    if (loc >= 0) return loc;

    return -1;
  }

  /**
   * Get texcoord attribute location.
   * Tries common naming conventions.
   */
  private getTexcoordLocation(program: Program): number {
    // Try common names
    let loc = program.getAttribLocation("a_texcoord");
    if (loc >= 0) return loc;

    loc = program.getAttribLocation("aTexCoord");
    if (loc >= 0) return loc;

    loc = program.getAttribLocation("texcoord");
    if (loc >= 0) return loc;

    loc = program.getAttribLocation("a_uv");
    if (loc >= 0) return loc;

    return -1;
  }

  // ============================================================================
  // VAO helpers (handle WebGL1 vs WebGL2 differences)
  // ============================================================================

  private createVAO(): void {
    if (this.isWebGL2) {
      this.vao = (this.gl as WebGL2RenderingContext).createVertexArray();
    } else if (this.vaoExt) {
      this.vao = this.vaoExt.createVertexArrayOES();
    }
  }

  private bindVAO(): void {
    if (this.vao) {
      if (this.isWebGL2) {
        (this.gl as WebGL2RenderingContext).bindVertexArray(this.vao);
      } else if (this.vaoExt) {
        this.vaoExt.bindVertexArrayOES(this.vao);
      }
    }
  }

  private unbindVAO(): void {
    if (this.isWebGL2) {
      (this.gl as WebGL2RenderingContext).bindVertexArray(null);
    } else if (this.vaoExt) {
      this.vaoExt.bindVertexArrayOES(null);
    }
  }

  private deleteVAO(): void {
    if (this.vao) {
      if (this.isWebGL2) {
        (this.gl as WebGL2RenderingContext).deleteVertexArray(this.vao);
      } else if (this.vaoExt) {
        this.vaoExt.deleteVertexArrayOES(this.vao);
      }
      this.vao = null;
    }
  }
}
