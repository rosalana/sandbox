#import hash from 'sandbox'

uniform float u_intensity;

// ─── Color Filters ──────────────────────────────────────────
// Each function takes a color and returns modified color.
// All use u_intensity uniform for configuration.

/**
 * Contrast — adjust contrast around mid-gray.
 * intensity: 1.0 = original, >1 = more contrast, <1 = flatter
 * @color-modifier
 */
vec3 contrast(vec3 color, float intensity) {
    return (color - 0.5) * intensity + 0.5;
}

/**
 * Brightness — multiply overall brightness.
 * intensity: 1.0 = original, >1 = brighter, <1 = darker
 * @color-modifier
 */
vec3 brightness(vec3 color, float intensity) {
    return color * intensity;
}

/**
 * Saturate — adjust color saturation.
 * intensity: 0 = grayscale, 1.0 = original, >1 = oversaturated
 * @color-modifier
 */
vec3 saturate(vec3 color, float intensity) {
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(gray), color, intensity);
}

/**
 * Posterize — reduce color to N discrete levels per channel.
 * intensity = number of levels (4 = retro, 16 = subtle, 256 = nearly smooth)
 * @color-modifier
 */
vec3 posterize(vec3 color, float intensity) {
    float levels = max(intensity, 1.0);
    return floor(color * levels + 0.5) / levels;
}

/**
 * Threshold — convert to black and white based on cutoff.
 * intensity = cutoff point (0.5 = balanced, lower = more white)
 * @color-modifier
 */
vec3 threshold(vec3 color, float intensity) {
    float avg = dot(color, vec3(0.299, 0.587, 0.114));
    return avg > intensity ? vec3(1.0) : vec3(0.0);
}

/**
 * Invert — flip all color channels.
 * intensity: 0.0 = original, 1.0 = fully inverted, 0.5 = mid-gray
 * @color-modifier
 */
vec3 invert(vec3 color, float intensity) {
    return mix(color, 1.0 - color, intensity);
}

/**
 * Glow — luminance-based bloom, bright areas get amplified.
 * intensity = glow strength (0.5 = subtle, 2.0 = intense)
 * @color-modifier
 */
vec3 glow(vec3 color, float intensity) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    return color + color * luminance * intensity;
}

/**
 * Grain — animated film noise overlay.
 * intensity = noise strength (0.1 = subtle, 0.5 = heavy)
 * @color-modifier
 */
vec3 grain(vec3 color, vec2 uv, float intensity) {
    float n = (hash(uv * 1000.0 + u_time) - 0.5) * intensity;
    return color + n;
}

/**
 * Vignette — darken canvas edges.
 * Applies circular falloff from center.
 * intensity = darkness strength (1.0 = subtle, 2.0 = strong)
 * @color-modifier
 */
vec3 vignette(vec3 color, vec2 uv, float intensity) {
    vec2 centered = uv / u_resolution - 0.5;
    float dist = length(centered);
    float falloff = 1.0 - smoothstep(0.3, 0.7, dist * intensity);
    return color * falloff;
}

/**
 * Sepia — warm brownish tint like old photographs.
 * intensity: 0.0 = original, 1.0 = full sepia
 * @color-modifier
 */
vec3 sepia(vec3 color, float intensity) {
    vec3 s;
    s.r = dot(color, vec3(0.393, 0.769, 0.189));
    s.g = dot(color, vec3(0.349, 0.686, 0.168));
    s.b = dot(color, vec3(0.272, 0.534, 0.131));
    return mix(color, s, intensity);
}

/**
 * Gamma — apply gamma correction curve.
 * intensity = gamma value (1.0 = linear, 2.2 = standard sRGB, <1 = brighten darks)
 * @color-modifier
 */
vec3 gamma(vec3 color, float intensity) {
    return pow(max(color, 0.0), vec3(1.0 / max(intensity, 0.001)));
}

/**
 * Tint — blend color toward a target tint.
 * intensity: 0.0 = original, 1.0 = fully tinted
 * @color-modifier
 */
vec3 tint(vec3 color, vec3 tintColor, float intensity) {
    return mix(color, color * tintColor, intensity);
}

/**
 * Highlights — add white light to bright areas.
 * Uses max channel brightness so even saturated colors trigger highlights.
 * intensity = highlight strength (0.2 = subtle sheen, 1.0 = strong gloss)
 * @color-modifier
 */
vec3 highlights(vec3 color, float intensity) {
    float bright = max(color.r, max(color.g, color.b + 0.3));
    return color + max(bright * 5.5 - 4.0, 0.0) * intensity;
}

/**
 * Bayer 8×8 threshold matrix — computed mathematically.
 * Returns threshold value 0–1 for ordered dithering.
 */
float bayer8(vec2 p) {
    p = mod(floor(p), 8.0);
    float value = 0.0;
    float divisor = 1.0;
    float multiplier = 16.0;

    for (int i = 0; i < 3; i++) {
        vec2 q = mod(floor(p / divisor), 2.0);
        value += (q.x * 2.0 + q.y * 3.0 - q.x * q.y * 4.0) * multiplier;
        divisor *= 2.0;
        multiplier *= 0.25;
    }

    return value / 64.0;
}

/**
 * Dither — ordered Bayer 8×8 dithering.
 * Reduces color to discrete levels with a threshold pattern.
 * Use pixelate() on UV before coloring for blocky dither cells.
 * intensity = number of color levels (2 = 1-bit, 4 = retro, 8 = subtle)
 * @color-modifier
 */
vec3 dither(vec3 color, vec2 uv, float intensity) {
    float levels = max(intensity, 2.0);
    float threshold = bayer8(uv) - 0.5;
    float stepSize = 1.0 / (levels - 1.0);
    color += threshold * stepSize;
    return clamp(floor(color * (levels - 1.0) + 0.5) / (levels - 1.0), 0.0, 1.0);
}

/**
 * Arcade — pixelated Bayer dithering.
 * Combines pixelation and ordered dither for retro 8-bit look.
 * intensity = number of color levels (2 = 1-bit, 4 = retro, 8 = subtle)
 * @color-modifier
 */
vec3 arcade(vec3 color, vec2 uv, float intensity) {
    vec2 grid = uv * u_resolution * 0.5;
    return dither(color, grid, intensity);
}

void main() {}
