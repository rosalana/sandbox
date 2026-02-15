#import hash from 'sandbox'

uniform float u_intensity;

// ─── UV Transforms ──────────────────────────────────────────

/**
 * Pixelate - blocky mosaic effect.
 * @uv-modifier
 * #done
 */
vec2 pixelate(vec2 uv) {
    float size = length(u_resolution) / (max(u_intensity, 1.0) * 10.0);

    return floor(uv / size) * size;
}

/**
 * Spiral warp — spin distortion proportional to distance from origin.
 * Expects centered UV (use centerize first).
 * intensity = twist strength (0.4 = subtle, 1.0 = full spiral)
 * @uv-modifier
 */
vec2 twist(vec2 uv) {
    float dist = length(uv);
    float angle = atan(uv.y, uv.x) - u_intensity * 20.0 * dist;
    return vec2(cos(angle), sin(angle)) * dist;
}

/**
 * Organic warp — iterative fluid morph distortion.
 * Creates marble-like flowing patterns.
 * intensity = animation speed
 * @uv-modifier
 */
vec2 organic(vec2 uv) {
    float speed = u_time * u_intensity;
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

// ─── Color Effects ──────────────────────────────────────────

/**
 * Posterize — reduce color to N discrete levels per channel.
 * @color-modifier
 * #done
 */
vec3 posterize(vec3 color) {
    return floor(color * u_intensity + 0.5) / u_intensity;
}

/**
 * Film grain — animated noise overlay.
 * intensity = grain strength
 * @color-modifier
 */
vec3 grain(vec3 color, vec2 uv) {
    float n = (hash(uv * 1000.0 + u_time) - 0.5) * u_intensity;
    return color + n;
}

/**
 * Glow — luminance-based bloom, bright areas get amplified.
 * intensity = glow strength
 * @color-modifier
 */
vec3 glow(vec3 color) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    return color + color * luminance * u_intensity;
}

// ─── Multipliers ────────────────────────────────────────────

/**
 * Vignette — darkens canvas edges.
 * intensity = how much edges darken (1.0 = subtle, 2.0 = strong)
 * @multiplier
 */
float vignette(vec2 uv) {
    vec2 center = uv - 0.5;
    float dist = length(center);
    return 1.0 - smoothstep(0.3, 0.5, dist * u_intensity);
}

void main() {}
