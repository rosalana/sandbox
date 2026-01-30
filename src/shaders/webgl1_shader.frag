#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

varying vec2 v_texcoord;

void main() {
  vec2 uv = v_texcoord;
  vec3 color = vec3(uv.x, uv.y, 0.5 + 0.5 * sin(u_time));
  gl_FragColor = vec4(color, 1.0);
}
