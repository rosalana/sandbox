#version 300 es
precision highp float;

// Pattern
#import fbm from 'sandbox'
#import hash from 'sandbox'
#import noise from 'sandbox'
#import polar from 'sandbox'

// Colors
#import palette from 'sandbox/colors'
#import gradient3 from 'sandbox/colors'

// Effects + Filters
#import vignette from 'sandbox/effects'
#import brightness from 'sandbox/filters'

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 p = (gl_FragCoord.xy - u_resolution * 0.5) / u_resolution.y;

    // Slow rotation around center
    vec2 pol = polar(p);
    float angle = pol.x + u_time * 0.02;
    float radius = pol.y;
    vec2 rp = vec2(cos(angle), sin(angle)) * radius;

    // Gas cloud layers
    float gas1 = fbm(rp * 3.0 + u_time * 0.05);
    float gas2 = fbm(rp * 6.0 - u_time * 0.03 + 50.0);
    float gas3 = fbm(rp * 1.5 + u_time * 0.08 + 200.0);
    float gas = gas1 * 0.5 + gas2 * 0.3 + gas3 * 0.2;

    // Radial density falloff
    float density = gas * smoothstep(1.2, 0.0, radius);

    // Deep space palette
    vec3 nebulaColor = palette(
        gas * 3.0 + radius * 0.5 + u_time * 0.02,
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(1.0, 0.7, 0.4),
        vec3(0.0, 0.15, 0.2)
    );

    // Dark background
    vec3 bg = gradient3(radius, vec3(0.02, 0.01, 0.04), vec3(0.01, 0.005, 0.02), vec3(0.0));

    // Blend
    vec3 color = bg + nebulaColor * density * 2.0;

    // Core glow
    float core = smoothstep(0.4, 0.0, radius) * gas1;
    color += vec3(1.0, 0.8, 0.6) * core * 0.5;

    // Stars
    vec2 starGrid = floor(uv * 300.0);
    float star = step(0.997, hash(starGrid));
    float twinkle = noise(starGrid + u_time * 2.0);
    color += star * twinkle * 0.7;
    color += step(0.985, hash(starGrid + 1000.0)) * 0.12;

    // Filter stack
    color = brightness(color);
    color *= vignette(uv);

    fragColor = vec4(color, 1.0);
}

// ─── TypeScript ─────────────────────────────────────────────
//
// Sandbox.create(canvas, {
//     fragment: nebulaShader,
//     modules: {
//         brightness: { intensity: 1.1 },
//         vignette:   { intensity: 1.4 },
//     }
// });
