#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

in vec2 v_texcoord;
out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec3 color = vec3(uv.x, uv.y, 0.5 + 0.5 * sin(u_time));
    fragColor = vec4(color, 1.0);
}