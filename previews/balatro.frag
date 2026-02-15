#version 300 es
precision highp float;

// UV transforms
#import centerize from 'sandbox'
#import translate from 'sandbox'
#import rotate from 'sandbox'
#import scale from 'sandbox'

// UV effects
#import pixelate from 'sandbox/effects'
#import twist from 'sandbox/effects'
#import organic from 'sandbox/effects'

// Colors
#import hex from 'sandbox/colors'
#import tri_mix from 'sandbox/colors'

in vec2 v_texcoord;
out vec4 fragColor;

void main() {
    // UV pipeline
    vec2 uv = v_texcoord * u_resolution;
    uv = pixelate(uv);
    uv = centerize(uv);
    uv = translate(uv, vec2(0.0));
    uv = rotate(uv, 0.0);
    uv = twist(uv);
    uv = scale(uv, 20.0);
    uv = organic(uv);

    // Color pipeline
    vec3 color = tri_mix(
        hex(0xDE443B),
        hex(0x006BB4),
        hex(0x162325),
        length(uv) * 0.035
    );

    fragColor = vec4(color, 1.0);
}

// ─── TypeScript ─────────────────────────────────────────────
//
// Sandbox.create(canvas, {
//     fragment: balatroShader,
//     modules: {
//         pixelate:  { intensity: 50.0 },
//         twist:     { intensity: 0.4 },
//         organic:   { intensity: 3.0 },
//         tri_mix:   { sharpness: 2.175, tint: 0.158, highlight: 1.1 },
//     }
// });
