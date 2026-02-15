/**
 * HSV to RGB.
 * Input: vec3(hue 0-1, saturation 0-1, value 0-1)
 */
vec3 hsv(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

/**
 * HSL to RGB.
 * Input: vec3(hue 0-1, saturation 0-1, lightness 0-1)
 */
vec3 hsl(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

/**
 * Hex integer to RGB.
 * Usage: hex(0xFF6600) → orange
 * WebGL1-compatible — no bitwise operations.
 */
vec3 hex(int value) {
    float v = float(value);
    float r = floor(v / 65536.0);
    float g = floor((v - r * 65536.0) / 256.0);
    float b = v - r * 65536.0 - g * 256.0;
    return vec3(r, g, b) / 255.0;
}

/**
 * RGB 0-255 to normalized RGB 0-1.
 * Usage: rgb255(255.0, 128.0, 0.0)
 */
vec3 rgb255(float r, float g, float b) {
    return vec3(r, g, b) / 255.0;
}

/**
 * Cosine palette — Inigo Quilez formula.
 * color = a + b * cos(2π(c·t + d))
 * Generates infinite smooth color ramps from 4 vec3 params.
 */
vec3 palette(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
    return a + b * cos(6.28318 * (c * t + d));
}

/**
 * Linear gradient between two colors.
 * t is clamped to 0-1.
 */
vec3 gradient(vec3 a, vec3 b, float t) {
    return mix(a, b, clamp(t, 0.0, 1.0));
}

/**
 * 3-stop gradient.
 * t=0 → a, t=0.5 → b, t=1 → c
 */
vec3 gradient3(vec3 a, vec3 b, vec3 c, float t) {
    t = clamp(t, 0.0, 1.0);
    return t < 0.5
        ? mix(a, b, t * 2.0)
        : mix(b, c, (t - 0.5) * 2.0);
}

/**
 * 3-color palette with contrast-based blending.
 * Maps value t to 3 colors with adjustable transition sharpness,
 * base tint toward c1, and highlight boost on peak regions.
 * sharpness = transition contrast (1.0 = soft, 3.0 = sharp)
 * tint = blend toward c1 (0.0 = none, 0.3 = subtle warmth)
 * highlight = additive light on dominant color regions
 * @color-modifier
 */
uniform float u_sharpness;
uniform float u_tint;
uniform float u_highlight;

vec3 tri_mix(vec3 c1, vec3 c2, vec3 c3, float t) {
    float value = clamp(t * u_sharpness, 0.0, 2.0);

    float w1 = max(0.0, 1.0 - u_sharpness * abs(1.0 - value));
    float w2 = max(0.0, 1.0 - u_sharpness * abs(value));
    float w3 = 1.0 - min(1.0, w1 + w2);

    vec3 color = c1 * w1 + c2 * w2 + c3 * w3;

    color = mix(color, c1, u_tint);

    float light = u_highlight * (max(w1 * 5.0 - 4.0, 0.0) + max(w2 * 5.0 - 4.0, 0.0));
    color += light;

    return color;
}

void main() {}
