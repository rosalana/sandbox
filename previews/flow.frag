#version 300 es
precision highp float;

// Pattern
#import fbm from 'sandbox'

// Colors
#import palette from 'sandbox/colors'

// Effects + Filters
#import vignette from 'sandbox/effects'
#import grain from 'sandbox/effects'
#import contrast from 'sandbox/filters'

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 p = uv * 3.0;

    // Domain warping — feed fbm into itself
    vec2 q = vec2(
        fbm(p),
        fbm(p + vec2(5.2, 1.3))
    );

    vec2 r = vec2(
        fbm(p + 4.0 * q + vec2(1.7, 9.2) + u_time * 0.15),
        fbm(p + 4.0 * q + vec2(8.3, 2.8) + u_time * 0.126)
    );

    float f = fbm(p + 4.0 * r);

    // Map to warm amber / teal palette
    vec3 color = palette(
        f * 2.0 + u_time * 0.04,
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(1.0, 1.0, 0.5),
        vec3(0.8, 0.9, 0.3)
    );

    // Dark background where pattern is weak
    color = mix(vec3(0.02, 0.01, 0.06), color, f * f * 3.0);

    // Filter stack
    color = contrast(color);
    color *= vignette(uv);
    color = grain(color, uv);

    fragColor = vec4(color, 1.0);
}

// ─── TypeScript ─────────────────────────────────────────────
//
// Sandbox.create(canvas, {
//     fragment: flowShader,
//     modules: {
//         contrast: { intensity: 1.3 },
//         vignette: { intensity: 1.4 },
//         grain:    { intensity: 0.05 },
//     }
// });
