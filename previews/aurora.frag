#version 300 es
precision highp float;

// Noise
#import noise from 'sandbox'

// Colors
#import hex from 'sandbox/colors'
#import gradient3 from 'sandbox/colors'

// Filters
#import brightness from 'sandbox/filters'

in vec2 v_texcoord;
out vec4 fragColor;

void main() {
    vec2 uv = v_texcoord;

    // Color sweep across x-axis
    vec3 color = gradient3(hex(0x5227FF), hex(0x7CFF67), hex(0x5227FF), uv.x);

    // Aurora wave shape — noise modulates a horizontal band
    float wave = (noise(vec2(uv.x * 4.0 + u_time * 0.1, u_time * 0.25)) * 2.0 - 1.0) * 0.5;
    float band = (uv.y * 2.0 - exp(wave) + 0.2) * 0.6;
    float alpha = smoothstep(-0.05, 0.45, band);

    // Apply band intensity as brightness
    color = brightness(color, band);

    fragColor = vec4(color * alpha, alpha);
}

// ─── TypeScript ─────────────────────────────────────────────
//
// Sandbox.create(canvas, {
//     fragment: auroraShader,
//     modules: {
//         brightness: { intensity: 1.0 },
//     }
// });
