/**
 * Hex integer to RGB.
 * Usage: hex(0xFF6600) → orange
 */
vec3 hex(int value) {
    float v = float(value);
    float r = floor(v / 65536.0);
    float g = floor((v - r * 65536.0) / 256.0);
    float b = v - r * 65536.0 - g * 256.0;
    return vec3(r, g, b) / 255.0;
}

/**
 * RGB 0–255 to normalized RGB 0–1.
 * Usage: rgb255(255.0, 128.0, 0.0) → orange
 */
vec3 rgb255(float r, float g, float b) {
    return vec3(r, g, b) / 255.0;
}

/**
 * HSV to RGB.
 * Input: vec3(hue 0–1, saturation 0–1, value 0–1)
 */
vec3 hsv(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

/**
 * HSL to RGB.
 * Input: vec3(hue 0–1, saturation 0–1, lightness 0–1)
 */
vec3 hsl(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

/**
 * Linear gradient between two colors.
 * t is clamped to 0–1.
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
 * Cosine palette — Inigo Quilez formula.
 * color = a + b * cos(2π(c·t + d))
 * Generates infinite smooth color ramps from 4 vec3 params.
 */
vec3 palette(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
    return a + b * cos(6.28318 * (c * t + d));
}

/**
 * Banded gradient — 3-zone color mapping with sharp transitions.
 * Uses tent functions instead of linear interpolation.
 * t=0 → b (center), t=1 → a (middle), t=2 → c (outer).
 * sharpness = transition width (2.0 = sharp, 1.0 = soft).
 */
vec3 bands(vec3 a, vec3 b, vec3 c, float t, float sharpness) {
    float w1 = max(0.0, 1.0 - sharpness * abs(1.0 - t));
    float w2 = max(0.0, 1.0 - sharpness * abs(t));
    float w3 = 1.0 - min(1.0, w1 + w2);
    return a * w1 + b * w2 + c * w3;
}

/**
 * Iridescent — iterative interference color pattern.
 * Generates rainbow-like colors from UV through trigonometric iteration.
 * Creates shimmering, oil-slick-like color fields.
 * time = animation time (pass u_time), speed = animation speed
 */
vec3 iridescent(vec2 uv, float time, float speed) {
    float d = -time * 0.5 * speed;
    float a = 0.0;
    for (int i = 0; i < 8; i++) {
        a += cos(float(i) - d - a * uv.x);
        d += sin(uv.y * float(i) + a);
    }
    d += time * 0.5 * speed;
    vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
    return cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5);
}

void main() {}
