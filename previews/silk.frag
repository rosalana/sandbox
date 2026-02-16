#version 300 es
precision highp float;

// UV transforms
#import center from 'sandbox'
#import rotate from 'sandbox'
#import scale from 'sandbox'

// Noise & patterns
#import waves from 'sandbox'

// UV effects
#import wobble from 'sandbox/effects'

// Colors
#import hex from 'sandbox/colors'

// Filters
#import brightness from 'sandbox/filters'
#import grain from 'sandbox/filters'

in vec2 v_texcoord;
out vec4 fragColor;

void main() {
    // UV pipeline
    vec2 uv = v_texcoord * u_resolution;
    uv = center(uv);
    uv = scale(uv, 5.0);
    uv = wobble(uv, 1.0);

    // Wave interference pattern — animated via UV offset
    float pattern = waves(uv + vec2(u_time * 0.02, -u_time * 0.01), 5.0);

    // Color from pattern
    vec3 color = brightness(hex(0x7B7481), pattern);

    // Film grain overlay
    color = grain(color, v_texcoord, 0.1);

    fragColor = vec4(color, 1.0);
}

// ─── TypeScript ─────────────────────────────────────────────
//
// Sandbox.create(canvas, {
//     fragment: silkShader,
//     modules: {
//         wobble: { intensity: 1.0 },
//         grain:  { intensity: 0.1 },
//     }
// });
