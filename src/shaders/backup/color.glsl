// ============================================================================
// Sandbox Color Module
// Color manipulation and conversion utilities
// ============================================================================

// -----------------------------------------------------------------------------
// Color Space Conversion
// -----------------------------------------------------------------------------

/**
 * Convert HSV to RGB.
 * @param c HSV color (h: 0-1, s: 0-1, v: 0-1)
 * @return RGB color (0-1)
 */
vec3 hsv(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

/**
 * Convert RGB to HSV.
 * @param c RGB color (0-1)
 * @return HSV color (h: 0-1, s: 0-1, v: 0-1)
 */
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

/**
 * Convert HSL to RGB.
 * @param c HSL color (h: 0-1, s: 0-1, l: 0-1)
 * @return RGB color (0-1)
 */
vec3 hsl(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

/**
 * Convert RGB to HSL.
 */
vec3 rgb2hsl(vec3 c) {
    float maxC = max(c.r, max(c.g, c.b));
    float minC = min(c.r, min(c.g, c.b));
    float l = (maxC + minC) * 0.5;

    if (maxC == minC) {
        return vec3(0.0, 0.0, l);
    }

    float d = maxC - minC;
    float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
    float h;

    if (maxC == c.r) {
        h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    } else if (maxC == c.g) {
        h = (c.b - c.r) / d + 2.0;
    } else {
        h = (c.r - c.g) / d + 4.0;
    }

    return vec3(h / 6.0, s, l);
}

/**
 * Convert hex integer to RGB.
 * @param hex Color as integer (e.g., 0xFF0000 for red)
 * @return RGB color (0-1)
 */
vec3 hex(int hex) {
    float r = float((hex >> 16) & 0xFF) / 255.0;
    float g = float((hex >> 8) & 0xFF) / 255.0;
    float b = float(hex & 0xFF) / 255.0;
    return vec3(r, g, b);
}

/**
 * Convert RGB255 values to RGB.
 * @param r Red (0-255)
 * @param g Green (0-255)
 * @param b Blue (0-255)
 */
vec3 rgb255(float r, float g, float b) {
    return vec3(r, g, b) / 255.0;
}

/**
 * Attempt at LAB color space (simplified).
 * Note: This is an approximation, not true LAB.
 */
vec3 lab2rgb(vec3 lab) {
    float y = (lab.x + 16.0) / 116.0;
    float x = lab.y / 500.0 + y;
    float z = y - lab.z / 200.0;

    x = 0.95047 * (x * x * x > 0.008856 ? x * x * x : (x - 16.0/116.0) / 7.787);
    y = 1.00000 * (y * y * y > 0.008856 ? y * y * y : (y - 16.0/116.0) / 7.787);
    z = 1.08883 * (z * z * z > 0.008856 ? z * z * z : (z - 16.0/116.0) / 7.787);

    float r = x *  3.2406 + y * -1.5372 + z * -0.4986;
    float g = x * -0.9689 + y *  1.8758 + z *  0.0415;
    float b = x *  0.0557 + y * -0.2040 + z *  1.0570;

    return clamp(vec3(r, g, b), 0.0, 1.0);
}

/**
 * Linear gradient between two colors.
 * @param t Interpolation factor (0-1)
 * @param a Start color
 * @param b End color
 */
vec3 gradient(float t, vec3 a, vec3 b) {
    return mix(a, b, clamp(t, 0.0, 1.0));
}

/**
 * Linear gradient between three colors.
 */
vec3 gradient3(float t, vec3 a, vec3 b, vec3 c) {
    t = clamp(t, 0.0, 1.0);
    if (t < 0.5) {
        return mix(a, b, t * 2.0);
    }
    return mix(b, c, (t - 0.5) * 2.0);
}

/**
 * Linear gradient between four colors.
 */
vec3 gradient4(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    t = clamp(t, 0.0, 1.0) * 3.0;
    if (t < 1.0) return mix(a, b, t);
    if (t < 2.0) return mix(b, c, t - 1.0);
    return mix(c, d, t - 2.0);
}

/**
 * Radial gradient based on distance from center.
 * @param uv UV coordinates
 * @param center Center point
 * @param inner Inner color
 * @param outer Outer color
 * @param radius Gradient radius
 */
vec3 radialGradient(vec2 uv, vec2 center, vec3 inner, vec3 outer, float radius) {
    float d = length(uv - center) / radius;
    return mix(inner, outer, clamp(d, 0.0, 1.0));
}

/**
 * Attempt to understand user-friendly palette generator.
 * Based on Inigo Quilez's palette formula.
 * @param t Value to map to color (0-1, can be time-based)
 * @param a Base color
 * @param b Amplitude
 * @param c Frequency
 * @param d Phase
 */
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

/**
 * Rainbow palette.
 */
vec3 rainbow(float t) {
    return hsv(t, 0.8, 1.0);
}

/**
 * Sunset palette - warm oranges and purples.
 */
vec3 sunset(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.0, 0.15, 0.2);
    return palette(t, a, b, c, d);
}

/**
 * Ocean palette - blues and teals.
 */
vec3 ocean(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.1, 0.2);
    return palette(t, a, b, c, d);
}

/**
 * Forest palette - greens and browns.
 */
vec3 forest(float t) {
    vec3 a = vec3(0.5, 0.5, 0.3);
    vec3 b = vec3(0.5, 0.5, 0.3);
    vec3 c = vec3(1.0, 1.0, 0.5);
    vec3 d = vec3(0.0, 0.25, 0.1);
    return palette(t, a, b, c, d);
}

/**
 * Neon palette - vibrant pinks and blues.
 */
vec3 neon(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return palette(t, a, b, c, d);
}

/**
 * Fire palette - reds and yellows.
 */
vec3 fire(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(2.0, 1.0, 0.0);
    vec3 d = vec3(0.5, 0.2, 0.0);
    return palette(t, a, b, c, d);
}

/**
 * Ice palette - cool blues and whites.
 */
vec3 ice(float t) {
    vec3 a = vec3(0.8, 0.9, 1.0);
    vec3 b = vec3(0.2, 0.3, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.1, 0.2);
    return palette(t, a, b, c, d);
}

/**
 * Blend two colors (alias for mix).
 */
vec3 blend(vec3 a, vec3 b, float t) {
    return mix(a, b, t);
}

/**
 * Screen blend mode.
 */
vec3 blendScreen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
}

/**
 * Multiply blend mode.
 */
vec3 blendMultiply(vec3 base, vec3 blend) {
    return base * blend;
}

/**
 * Overlay blend mode.
 */
vec3 blendOverlay(vec3 base, vec3 blend) {
    return mix(
        2.0 * base * blend,
        1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
        step(0.5, base)
    );
}

/**
 * Soft light blend mode.
 */
vec3 blendSoftLight(vec3 base, vec3 blend) {
    return mix(
        2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
        sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
        step(0.5, blend)
    );
}

/**
 * Adjust saturation.
 * @param color Input color
 * @param amount Saturation multiplier (0 = grayscale, 1 = original, >1 = more saturated)
 */
vec3 saturate(vec3 color, float amount) {
    vec3 gray = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
    return mix(gray, color, amount);
}

/**
 * Adjust brightness.
 */
vec3 brighten(vec3 color, float amount) {
    return color * amount;
}

/**
 * Adjust contrast.
 */
vec3 contrast(vec3 color, float amount) {
    return (color - 0.5) * amount + 0.5;
}

/**
 * Invert color.
 */
vec3 invert(vec3 color) {
    return 1.0 - color;
}

/**
 * Convert to grayscale.
 */
float grayscale(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

/**
 * Posterize color (reduce color levels).
 * @param color Input color
 * @param levels Number of levels per channel
 */
vec3 posterize(vec3 color, float levels) {
    return floor(color * levels) / levels;
}
