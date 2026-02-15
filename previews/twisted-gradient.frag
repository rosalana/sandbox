#version 300 es
precision highp float;

// 1. Pick colors
#import hex from 'sandbox/colors'

// 2. Arrange into gradient
#import gradient3 from 'sandbox/colors'

// 3. UV effects
#import twist from 'sandbox/effects'
#import pixelate from 'sandbox/effects'

// 4. Color effects
#import posterize from 'sandbox/effects'

// 5. Filters
#import contrast from 'sandbox/filters'
#import brightness from 'sandbox/filters'

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // Transform UV
    uv = twist(uv);
    uv = pixelate(uv);

    // Create colors and map to gradient
    vec3 color = gradient3(uv.x, hex(0xFF0000), hex(0x0000FF), hex(0x00FF00));

    // Color effects
    color = posterize(color);

    // Filter stack
    color = contrast(color);
    color = brightness(color);

    fragColor = vec4(color, 1.0);
}

// ─── TypeScript ─────────────────────────────────────────────
//
// Sandbox.create(canvas, {
//     fragment: shader,
//     modules: {
//         twist:      { intensity: 2.0 },
//         pixelate:   { intensity: 4.0 },
//         posterize:  { intensity: 8.0 },
//         contrast:   { intensity: 1.5 },
//         brightness: { intensity: 1.1 },
//     }
// });
