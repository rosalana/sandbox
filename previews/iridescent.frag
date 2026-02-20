#version 300 es
precision highp float;

// UV transforms
#import center from 'sandbox'
#import translate from 'sandbox'

// Colors
#import iridescent from 'sandbox/colors'

// Filters
#import tint from 'sandbox/filters'

in vec2 v_texcoord;
out vec4 fragColor;

void main() {
    // UV pipeline
    vec2 uv = v_texcoord * u_resolution;
    uv = center(uv);

    // Mouse interaction — subtle UV offset
    uv = translate(uv, (u_mouse / u_resolution - 0.5) * 0.1);

    // Generate iridescent color pattern
    vec3 color = iridescent(uv, u_time, 1.0);

    // Tint with white (neutral — change for colored iridescence)
    color = tint(color, vec3(1.0), 1.0);

    fragColor = vec4(color, 1.0);
}

// ─── TypeScript ─────────────────────────────────────────────
//
// Sandbox.create(canvas, {
//     fragment: iridescentShader,
//     modules: {
//         tint: { intensity: 1.0 },
//     }
// });
