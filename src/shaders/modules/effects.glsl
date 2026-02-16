#import hash from 'sandbox'
#import noise from 'sandbox'
#import fbm from 'sandbox'
#import voronoi from 'sandbox'
#import worley from 'sandbox'

uniform float u_intensity;

// ─── UV Effects ─────────────────────────────────────────────
// Each function takes UV and returns modified UV.
// All use u_intensity uniform for configuration.

/**
 * Pixelate — blocky mosaic effect.
 * Snaps UV to a grid. Higher intensity = larger pixels.
 * intensity = pixel count along shortest axis (default: 20)
 * @uv-modifier
 */
vec2 pixelate(vec2 uv, float intensity) {
    float size = length(u_resolution) / (max(intensity, 1.0) * 10.0);
    return floor(uv / size) * size;
}

/**
 * Twist — spiral distortion from center outward.
 * Expects centered UV (use center() first).
 * intensity = twist strength (0.4 = subtle, 1.0 = full spiral)
 * @uv-modifier
 */
vec2 twist(vec2 uv, float intensity) {
    float dist = length(uv);
    float angle = atan(uv.y, uv.x) - intensity * 20.0 * dist;
    return vec2(cos(angle), sin(angle)) * dist;
}

/**
 * Ripple — concentric wave distortion from center.
 * Expects centered UV (use center() first).
 * Creates water-drop-like rings.
 * intensity = wave amplitude (0.5 = gentle, 2.0 = strong)
 * @uv-modifier
 */
vec2 ripple(vec2 uv, float intensity) {
    float dist = length(uv);
    float wave = sin(dist * 40.0 - u_time * 3.0) * intensity * 0.02;
    return uv + normalize(uv + 0.001) * wave;
}

/**
 * Fisheye — barrel distortion from center.
 * Expects centered UV (use center() first).
 * Bends space outward like a fisheye lens.
 * intensity = distortion power (0.5 = subtle, 2.0 = extreme)
 * @uv-modifier
 */
vec2 fisheye(vec2 uv, float intensity) {
    float dist = length(uv);
    float power = pow(dist, intensity) / dist;
    return uv * power;
}

/**
 * Wobble — animated sine wave displacement.
 * Creates a jelly-like horizontal wobble.
 * intensity = wobble amount (1.0 = gentle, 5.0 = wild)
 * @uv-modifier
 */
vec2 wobble(vec2 uv, float intensity) {
    uv.x += sin(uv.y * 10.0 + u_time * 2.0) * intensity * 0.01;
    uv.y += cos(uv.x * 10.0 + u_time * 2.0) * intensity * 0.01;
    return uv;
}

/**
 * Organic — iterative fluid morph distortion.
 * Creates marble-like flowing patterns.
 * intensity = animation speed (3.0 = default)
 * @uv-modifier
 */
vec2 organic(vec2 uv, float intensity) {
    float speed = u_time * intensity;
    vec2 acc = vec2(uv.x + uv.y);

    for (int i = 0; i < 5; i++) {
        acc += sin(max(uv.x, uv.y)) + uv;
        uv += 0.5 * vec2(
            cos(5.1123314 + 0.353 * acc.y + speed * 0.131121),
            sin(acc.x - 0.113 * speed)
        );
        uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
    }

    return uv;
}

/**
 * Glitch — random horizontal line displacement.
 * Creates digital glitch artifact bands.
 * intensity = glitch strength (0.5 = subtle, 3.0 = heavy)
 * @uv-modifier
 */
vec2 glitch(vec2 uv, float intensity) {
    float line = floor(uv.y * 50.0);
    float shift = hash(vec2(line, floor(u_time * 8.0)));
    shift = step(0.9, shift) * (shift - 0.9) * 10.0;
    uv.x += shift * intensity * 0.1 * u_resolution.x;
    return uv;
}

/**
 * Mirror — reflect UV across a chosen axis.
 * Creates bilateral symmetry.
 * intensity = 0 for horizontal mirror, 1 for vertical mirror
 * @uv-modifier
 */
vec2 mirror(vec2 uv, float intensity) {
    if (intensity < 0.5) {
        uv.x = abs(uv.x);
    } else {
        uv.y = abs(uv.y);
    }
    return uv;
}

/**
 * Kaleidoscope — repeating angular symmetry.
 * Expects centered UV (use center() first).
 * Creates mandala-like radial repeats.
 * intensity = number of segments (4 = quad, 6 = hex, 8 = octa)
 * @uv-modifier
 */
vec2 kaleidoscope(vec2 uv, float intensity) {
    float segments = max(intensity, 1.0);
    float angle = atan(uv.y, uv.x);
    float segment_angle = 6.28318 / segments;
    angle = mod(angle, segment_angle);
    angle = abs(angle - segment_angle * 0.5);
    float r = length(uv);
    return vec2(cos(angle), sin(angle)) * r;
}

/**
 * Warp — domain warping using fractal noise.
 * Displaces UV by layered fbm noise for smoke/cloud-like distortion.
 * Animated over time.
 * intensity = warp strength (0.5 = subtle haze, 3.0 = heavy distortion)
 * @uv-modifier
 */
vec2 warp(vec2 uv, float intensity) {
    vec2 offset = vec2(
        fbm(uv + u_time * 0.3),
        fbm(uv + vec2(5.2, 1.3) + u_time * 0.3)
    );
    return uv + offset * intensity * 0.1;
}

/**
 * Displace — noise-based UV displacement.
 * Shifts UV using smooth value noise for a wavy, heat-haze look.
 * Animated over time.
 * intensity = displacement amount (1.0 = gentle, 5.0 = strong)
 * @uv-modifier
 */
vec2 displace(vec2 uv, float intensity) {
    float nx = noise(uv * 5.0 + u_time);
    float ny = noise(uv * 5.0 + vec2(3.7, 7.1) + u_time);
    return uv + (vec2(nx, ny) - 0.5) * intensity * 0.05;
}

/**
 * Shatter — voronoi cell-based UV snapping.
 * Snaps UV to nearest cell point, creating a broken-glass look.
 * intensity = cell density (5.0 = large shards, 20.0 = fine fragments)
 * @uv-modifier
 */
vec2 shatter(vec2 uv, float intensity) {
    return voronoi(uv * intensity) / intensity;
}

/**
 * Cells — cellular distortion using Worley distance.
 * Displaces UV outward from cell edges, like looking through textured glass.
 * intensity = cell scale (3.0 = large bubbles, 15.0 = fine texture)
 * @uv-modifier
 */
vec2 cells(vec2 uv, float intensity) {
    float dist = worley(uv * intensity);
    vec2 grad = vec2(
        worley(uv * intensity + vec2(0.01, 0.0)) - dist,
        worley(uv * intensity + vec2(0.0, 0.01)) - dist
    );
    return uv + grad * dist * 2.0;
}

/**
 * Glass — liquid glass refraction distortion.
 * Smooth blobby lens shapes that bend UV like looking through thick glass.
 * Slow animated flowing movement. Needs center().
 * intensity = refraction strength (0.5 = subtle lens, 2.0 = heavy distortion)
 * @uv-modifier
 */
vec2 glass(vec2 uv, float intensity) {
    vec2 p = uv * 3.0;
    float t = u_time * 0.3;
    float e = 0.01;

    // Animated noise field — two octaves at different speeds
    vec2 d1 = p + vec2(t, -t * 0.7);
    vec2 d2 = p * 2.0 + vec2(-t * 0.5, t * 0.8);

    // Height + offset samples for gradient computation
    float h  = noise(d1) + noise(d2) * 0.5;
    float hx = noise(d1 + vec2(e, 0.0)) + noise(d2 + vec2(e * 2.0, 0.0)) * 0.5;
    float hy = noise(d1 + vec2(0.0, e)) + noise(d2 + vec2(0.0, e * 2.0)) * 0.5;

    // Sharpen into rounded glass-blob shapes
    float s1 = 0.35, s2 = 0.85;
    h  = smoothstep(s1, s2, h * 0.667);
    hx = smoothstep(s1, s2, hx * 0.667);
    hy = smoothstep(s1, s2, hy * 0.667);

    // Surface gradient → refraction offset
    vec2 refraction = vec2(hx - h, hy - h) / e;

    return uv + refraction * intensity * 0.02;
}

void main() {}
