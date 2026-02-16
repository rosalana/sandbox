#version 300 es
precision highp float;

// UV transforms
#import center from 'sandbox'
#import rotate from 'sandbox'
#import aspect from 'sandbox'
#import noise from 'sandbox'
#import zoom from 'sandbox'

// UV effects
#import wobble from 'sandbox/effects'
#import warp from 'sandbox/effects'

// Colors
#import hex from 'sandbox/colors'
#import gradient3 from 'sandbox/colors'

// Filters
#import grain from 'sandbox/filters'
#import contrast from 'sandbox/filters'
#import saturate from 'sandbox/filters'
#import gamma from 'sandbox/filters'

in vec2 v_texcoord;
out vec4 fragColor;

void main() {
    // UV pipeline
    vec2 uv = v_texcoord * u_resolution;
    uv = center(uv);
    uv = zoom(uv, 0.9);

    // Noise-based rotation — flowing movement
    float angle = (noise(vec2(u_time * 0.025, length(uv)) * 2.0) - 0.5) * 8.73;
    uv = rotate(uv, angle);

    // Sine wave warping
    uv = wobble(uv, 5.0);

    // Domain warp for organic flow
    uv = warp(uv, 0.5);

    // 3-color gradient from warped UV
    vec3 color = gradient3(
        hex(0xFF9FFC),
        hex(0x5227FF),
        hex(0xB19EEF),
        length(uv) * 1.5 + 0.5
    );

    // Post-processing
    color = grain(color, v_texcoord, 0.1);
    color = contrast(color, 1.5);
    color = saturate(color, 1.0);
    color = gamma(color, 1.0);

    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}

// ─── TypeScript ─────────────────────────────────────────────
//
// Sandbox.create(canvas, {
//     fragment: grainientShader,
//     modules: {
//         zoom:     { intensity: 0.9 },
//         wobble:   { intensity: 5.0 },
//         warp:     { intensity: 0.5 },
//         grain:    { intensity: 0.1 },
//         contrast: { intensity: 1.5 },
//     }
// });
