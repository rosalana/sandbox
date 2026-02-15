#version 300 es
precision highp float;

// ─── Modules ────────────────────────────────────────────────
#import worley from 'sandbox'
#import fbm from 'sandbox'
#import noise from 'sandbox'
#import palette from 'sandbox/colors'
#import saturate from 'sandbox/colors'
#import vignette from 'sandbox/effects'

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 p = (gl_FragCoord.xy - u_resolution * 0.5) / u_resolution.y;

    // Slowly distort the coordinate space with fbm
    float drift = u_time * 0.2;
    p += vec2(
        fbm(p * 2.0 + drift) * 0.3,
        fbm(p * 2.0 + drift + 100.0) * 0.3
    );

    // Layered worley at different scales
    float w1 = worley(p * 5.0 + drift * 0.5);
    float w2 = worley(p * 10.0 - drift * 0.3);
    float cells = w1 * 0.7 + w2 * 0.3;

    // Cell edges glow
    float edge = 1.0 - smoothstep(0.0, 0.15, cells);

    // Noise drives the color shift per cell
    float colorSeed = noise(floor(p * 5.0) + drift * 0.1);

    // Iridescent palette
    vec3 cellColor = palette(
        colorSeed + cells * 0.5 + u_time * 0.03,
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(1.0, 1.0, 1.0),
        vec3(0.0, 0.1, 0.2)
    );

    // Cell body + bright edges
    vec3 color = cellColor * (0.3 + cells * 0.7);
    color += edge * vec3(0.9, 0.95, 1.0) * 0.8;

    // Post-process stack
    color = saturate(color, 1.4);
    color *= vignette(uv);

    fragColor = vec4(color, 1.0);
}
