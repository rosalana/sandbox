#version 300 es
precision highp float;

// Test shader for module system
// This demonstrates importing and using functions from built-in modules

#import fbm from "sandbox/effects"
#import sunset from "sandbox/color"
#import vignette from "sandbox/effects"
#import easeInOut from "sandbox/easing"

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

out vec4 fragColor;

void main() {
    // Get normalized UV coordinates
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // Create animated noise pattern
    float n = fbm(uv * 4.0 + u_time * 0.2);

    // Apply easing to time for smooth animation
    float t = easeInOut(fract(u_time * 0.1));

    // Get color from sunset palette
    vec3 color = sunset(n + t);

    // Apply vignette
    float v = vignette(uv);
    color *= v;

    fragColor = vec4(color, 1.0);
}
