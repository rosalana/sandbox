#version 300 es
precision highp float;

// UV transforms
#import center from 'sandbox'
#import aspect from 'sandbox'

// Noise
#import fbm from 'sandbox'

// UV effects
#import warp from 'sandbox/effects'

// Filters
#import brightness from 'sandbox/filters'
#import dither from 'sandbox/filters'

in vec2 v_texcoord;
out vec4 fragColor;

void main() {
    // UV pipeline
    vec2 uv = v_texcoord * u_resolution;
    uv = center(uv);
    uv = aspect(uv);

    // Double domain warp — fbm(uv + fbm offset)
    uv = warp(uv, 1.0);

    // Pattern from warped fbm
    float pattern = fbm(uv);

    // Color — grayscale wave pattern
    vec3 color = brightness(vec3(0.5), pattern);

    // Ordered dithering — 4 color levels
    color = dither(color, v_texcoord * u_resolution * 0.5, 4.0);

    fragColor = vec4(color, 1.0);
}

// ─── TypeScript ─────────────────────────────────────────────
//
// Sandbox.create(canvas, {
//     fragment: ditherShader,
//     modules: {
//         warp:   { intensity: 1.0 },
//         dither: { intensity: 4.0 },
//     }
// });
