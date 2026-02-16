#version 300 es
precision highp float;

// UV transforms
#import center from 'sandbox'
#import aspect from 'sandbox'
#import rotate from 'sandbox'
#import scale from 'sandbox'

// Noise
#import fbm from 'sandbox'

// UV effects
#import warp from 'sandbox/effects'

// Color
#import gradient3 from 'sandbox/colors'
#import hex from 'sandbox/colors'

// Filters
#import brightness from 'sandbox/filters'
#import arcade from 'sandbox/filters'

in vec2 v_texcoord;
out vec4 fragColor;

void main() {
    // UV pipeline
    vec2 uv = v_texcoord * u_resolution;
    uv = scale(uv, 2.5);
    uv = center(uv);
    uv = aspect(uv);

    // Double domain warp — fbm(uv + fbm offset)
    uv = warp(uv, 40.0);
    uv = rotate(uv, u_time * 0.2);
    // Pattern from warped fbm
    float pattern = fbm(uv);

    vec3 color = brightness(gradient3(
        hex(0x0f172a), // slate-900
        hex(0x1e293b), // slate-800
        hex(0xff33ff), // hot pink arcade
        1.0
    ), pattern);

    // Ordered dithering — 4 color levels
    color = arcade(color, v_texcoord, 4.0);

    fragColor = vec4(color, 1.0);
}

// ─── TypeScript ─────────────────────────────────────────────
//
// Sandbox.create(canvas, {
//     fragment: ditherShader,
//     modules: {
//         warp:   { intensity: 1.0 },
//         arcade: { intensity: 4.0 },
//     }
// });
