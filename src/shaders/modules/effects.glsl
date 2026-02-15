#import hash from 'sandbox'

uniform float u_intensity;

// ─── UV Transforms ──────────────────────────────────────────

/**
 * Spiral warp — spin distortion from center.
 * Options: intensity (twist strength), speed (animation speed)
 * Usage: uv = spiralWarp(uv);
 */
vec2 spiralWarp(vec2 uv) {
    vec2 center = uv - 0.5;
    float r = length(center);
    float a = atan(center.y, center.x);

    a += u_intensity * (1.0 + 10.0 * r);

    return vec2(cos(a), sin(a)) * r + 0.5;
}

/**
 * Pixelate - blocky mosaic effect.
 * @uv-modifier
 * #done
 */
vec2 pixelate(vec2 uv) {
    float size = length(u_resolution) / (max(u_intensity, 1.0) * 10.0);

    return floor(uv / size) * size;
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
 * Options: intensity (grain strength)
 * Usage: color = grain(color, uv);
 */
vec3 grain(vec3 color, vec2 uv) {
    float n = (hash(uv * 1000.0 + u_time) - 0.5) * u_intensity;
    return color + n;
}

/**
 * Glow — luminance-based bloom, bright areas get amplified.
 * Options: intensity (glow strength)
 * Usage: color = glow(color);
 */
vec3 glow(vec3 color) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    return color + color * luminance * u_intensity;
}

// ─── Multipliers ────────────────────────────────────────────

/**
 * Vignette — darkens canvas edges.
 * Options: intensity (edge darkening), smoothness (falloff softness)
 * Usage: color *= vignette(uv);
 */
float vignette(vec2 uv) {
    vec2 center = uv - 0.5;
    float dist = length(center);
    return 1.0 - smoothstep(0.5 - u_smoothness, 0.5, dist * u_intensity);
}

void main() {}
