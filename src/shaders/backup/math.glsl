// ============================================================================
// Sandbox Math Module
// Basic math utilities for shader effects
// ============================================================================

// -----------------------------------------------------------------------------
// Rotation
// -----------------------------------------------------------------------------

/**
 * Create a 2D rotation matrix.
 * @param angle Rotation angle in radians
 */
mat2 rotate2d(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

/**
 * Rotate a 2D point around origin.
 * @param p Point to rotate
 * @param angle Rotation angle in radians
 */
vec2 rotate(vec2 p, float angle) {
    return rotate2d(angle) * p;
}

/**
 * Rotate a 2D point around a center point.
 * @param p Point to rotate
 * @param center Center of rotation
 * @param angle Rotation angle in radians
 */
vec2 rotateAround(vec2 p, vec2 center, float angle) {
    return rotate(p - center, angle) + center;
}

// -----------------------------------------------------------------------------
// Scale
// -----------------------------------------------------------------------------

/**
 * Scale a 2D point from origin.
 * @param p Point to scale
 * @param s Scale factor (uniform)
 */
vec2 scale(vec2 p, float s) {
    return p * s;
}

/**
 * Scale a 2D point with separate x/y factors.
 * @param p Point to scale
 * @param s Scale factors (x, y)
 */
vec2 scale2(vec2 p, vec2 s) {
    return p * s;
}

/**
 * Scale a 2D point from a center point.
 * @param p Point to scale
 * @param center Center of scaling
 * @param s Scale factor
 */
vec2 scaleAround(vec2 p, vec2 center, float s) {
    return (p - center) * s + center;
}

// -----------------------------------------------------------------------------
// Translate
// -----------------------------------------------------------------------------

/**
 * Translate a 2D point.
 * @param p Point to translate
 * @param offset Translation offset
 */
vec2 translate(vec2 p, vec2 offset) {
    return p + offset;
}

// -----------------------------------------------------------------------------
// Mapping & Clamping
// -----------------------------------------------------------------------------

/**
 * Remap a value from one range to another.
 * @param value Input value
 * @param inMin Input range minimum
 * @param inMax Input range maximum
 * @param outMin Output range minimum
 * @param outMax Output range maximum
 */
float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

/**
 * Clamp value to 0-1 range.
 */
float clamp01(float x) {
    return clamp(x, 0.0, 1.0);
}

/**
 * Clamp vec2 to 0-1 range.
 */
vec2 clamp01(vec2 x) {
    return clamp(x, 0.0, 1.0);
}

/**
 * Clamp vec3 to 0-1 range.
 */
vec3 clamp01(vec3 x) {
    return clamp(x, 0.0, 1.0);
}

// -----------------------------------------------------------------------------
// Smoothstep Variants
// -----------------------------------------------------------------------------

/**
 * Attempt to understand user-friendly smoothstep override. t of 0.5 makes smooth transition.
 */
float smooth(float edge0, float edge1, float x) {
    return smoothstep(edge0, edge1, x);
}

/**
 * Attempt to understand user-friendly smoothstep override. t of 0.5 makes smooth transition.
 */
float smooth(float t) {
    return smoothstep(0.0, 1.0, t);
}

/**
 * Attempt to understand user-friendly smoothstep override. t of 0.5 makes smooth transition.
 */
float smoother(float t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Smooth minimum - blend between two values.
 * @param a First value
 * @param b Second value
 * @param k Smoothness factor
 */
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

/**
 * Smooth maximum.
 */
float smax(float a, float b, float k) {
    return -smin(-a, -b, k);
}

/**
 * Fract with offset for tiling patterns.
 */
vec2 tile(vec2 p, float size) {
    return fract(p / size) * size;
}

/**
 * Get UV coordinates normalized to 0-1.
 */
vec2 uv(vec2 fragCoord, vec2 resolution) {
    return fragCoord / resolution;
}

/**
 * Get centered UV coordinates (-0.5 to 0.5).
 */
vec2 uvCenter(vec2 fragCoord, vec2 resolution) {
    return (fragCoord - resolution * 0.5) / resolution;
}

/**
 * Get aspect-corrected UV coordinates.
 */
vec2 uvAspect(vec2 fragCoord, vec2 resolution) {
    vec2 uv = (fragCoord - resolution * 0.5) / resolution.y;
    return uv;
}

/**
 * Linear interpolation (alias for mix).
 */
float lerp(float a, float b, float t) {
    return mix(a, b, t);
}

vec2 lerp(vec2 a, vec2 b, float t) {
    return mix(a, b, t);
}

vec3 lerp(vec3 a, vec3 b, float t) {
    return mix(a, b, t);
}

vec4 lerp(vec4 a, vec4 b, float t) {
    return mix(a, b, t);
}

/**
 * Inverse linear interpolation - find t given value.
 */
float invLerp(float a, float b, float value) {
    return (value - a) / (b - a);
}

/**
 * Modulo that works correctly with negative numbers.
 */
float modulo(float x, float y) {
    return x - y * floor(x / y);
}

vec2 modulo(vec2 x, float y) {
    return x - y * floor(x / y);
}

void main() {
    // Module file - no main implementation
}
