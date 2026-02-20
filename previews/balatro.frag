#version 300 es
precision highp float;

// UV transforms
#import center from 'sandbox'
#import rotate from 'sandbox'
#import scale from 'sandbox'
#import norm from 'sandbox'

// UV effects
#import pixelate from 'sandbox/effects'
#import twist from 'sandbox/effects'
#import organic from 'sandbox/effects'

// Colors
#import hex from 'sandbox/colors'
#import bands from 'sandbox/colors'

// Filters
#import tint from 'sandbox/filters'
#import highlights from 'sandbox/filters'

in vec2 v_texcoord;
out vec4 fragColor;

void main() {
    // UV pipeline
    vec2 uv = v_texcoord * u_resolution;
    uv = pixelate(uv, 74.5);
    uv = center(uv);
    uv = norm(uv);
    uv = rotate(uv, 286.8);
    uv = twist(uv, 0.25);
    uv = scale(uv, 30.0);
    uv = organic(uv, 7.0);

    // Color — banded radial gradient
    vec3 color = bands(
        hex(0xDE443B),
        hex(0x006BB4),
        hex(0x162325),
        length(uv) * 0.077,
        2.2
    );

    // Base tint + highlights
    color = tint(color, hex(0xDE443B), 0.09);
    color = highlights(color, 0.4);

    fragColor = vec4(color, 1.0);
}

// ─── TypeScript ─────────────────────────────────────────────
//
// Sandbox.create(canvas, {
//     fragment: balatroShader,
//     modules: {
//         pixelate:    { intensity: 74.5 },
//         twist:       { intensity: 0.25 },
//         organic:     { intensity: 7.0 },
//         tint:        { intensity: 0.09 },
//         highlights:  { intensity: 0.4 },
//     }
// });
