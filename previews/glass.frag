#version 300 es
precision highp float;

// UV transforms
#import center from 'sandbox'

// UV effects
#import glass from 'sandbox/effects'

// Colors
#import hex from 'sandbox/colors'
#import gradient3 from 'sandbox/colors'

// Filters
#import contrast from 'sandbox/filters'
#import highlights from 'sandbox/filters'
#import vignette from 'sandbox/filters'

in vec2 v_texcoord;
out vec4 fragColor;

void main() {
    // UV pipeline
    vec2 uv = v_texcoord * u_resolution;
    uv = center(uv);
    uv = glass(uv, 1.5);

    // Color — radial gradient through glass
    vec3 color = gradient3(
        hex(0x1A1A2E),
        hex(0x16213E),
        hex(0x0F3460),
        length(uv) * 2.0 + 0.3
    );

    // Post-processing
    color = contrast(color, 1.8);
    color = highlights(color, 0.6);
    color = vignette(color, v_texcoord * u_resolution, 1.2);

    fragColor = vec4(color, 1.0);
}

// ─── TypeScript ─────────────────────────────────────────────
//
// Sandbox.create(canvas, {
//     fragment: glassShader,
//     modules: {
//         glass:      { intensity: 1.5 },
//         contrast:   { intensity: 1.8 },
//         highlights: { intensity: 0.6 },
//         vignette:   { intensity: 1.2 },
//     }
// });
