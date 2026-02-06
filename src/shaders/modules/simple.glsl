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
 * Sunset palette - warm oranges and purples.
 */
vec3 sunset(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.0, 0.15, 0.2);
    return palette(t, a, b, c, d);
}
