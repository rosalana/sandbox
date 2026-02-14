#version 300 es
precision highp float;

uniform vec3 u_colors[2];

vec3 gradient(float t) {
    return mix(u_colors[0], u_colors[1], t);
}