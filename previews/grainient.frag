#version 300 es
precision highp float;

// UV transforms
#import center from 'sandbox'
#import rotate from 'sandbox'
#import aspect from 'sandbox'
#import noise from 'sandbox'
#import zoom from 'sandbox'
#import scale from 'sandbox'
#import norm from 'sandbox'

// UV effects
#import wobble from 'sandbox/effects'
#import warp from 'sandbox/effects'
#import twist from 'sandbox/effects'

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

    // Sine wave warping
    uv = center(uv);
    uv = scale(uv, 0.8);
    uv = norm(uv);
    uv = wobble(uv, 9.0 * max(sin(u_time * 0.5), 1.5));

    // Domain warp for organic flow

    // 3-color gradient from warped UV
    vec3 color = gradient3(
        hex(0x1E3A8A),  // blue-900
        hex(0x60A5FA),  // blue-400
        hex(0x1E40AF),  // blue-800
        length(uv) * 1.5 + 0.5
    );

    // Post-processing
    color = grain(color, v_texcoord, 0.2);
    color = contrast(color, 1.2);
    // color = saturate(color, 2.0);
    // color = gamma(color, 1.8);

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
