// ============================================================================
// Sandbox Effects Module
// Visual effects for shader compositions
// ============================================================================

// -----------------------------------------------------------------------------
// Noise Functions
// -----------------------------------------------------------------------------

/**
 * Simple hash function for pseudo-random values.
 */
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

/**
 * Value noise.
 */
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float perlin(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}

/**
 * Simplex noise (2D).
 */
float simplex(vec2 p) {
    const float K1 = 0.366025404; // (sqrt(3)-1)/2
    const float K2 = 0.211324865; // (3-sqrt(3))/6

    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    float m = step(a.y, a.x);
    vec2 o = vec2(m, 1.0 - m);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;

    vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
    vec3 n = h * h * h * h * vec3(dot(a, hash2(i) - 0.5), dot(b, hash2(i + o) - 0.5), dot(c, hash2(i + 1.0) - 0.5));

    return dot(n, vec3(70.0));
}

/**
 * Worley (cellular) noise.
 */
float worley(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    float minDist = 1.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash2(i + neighbor);
            vec2 diff = neighbor + point - f;
            float dist = length(diff);
            minDist = min(minDist, dist);
        }
    }

    return minDist;
}

/**
 * Fractal Brownian Motion.
 * @param p Position
 * @param octaves Number of octaves (1-8)
 */
float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    return value;
}

/**
 * FBM with default 6 octaves.
 */
float fbm(vec2 p) {
    return fbm(p, 6);
}

/**
 * Turbulence - absolute value FBM.
 */
float turbulence(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * abs(noise(p * frequency) * 2.0 - 1.0);
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    return value;
}

float turbulence(vec2 p) {
    return turbulence(p, 6);
}

// -----------------------------------------------------------------------------
// Blur Effects
// -----------------------------------------------------------------------------

uniform float u_blurRadius;

/**
 * Box blur (requires texture - simulated with noise for demo).
 * In real usage, this would sample from a texture.
 * @param color Base color
 * @param uv UV coordinates
 * @param radius Blur radius
 */
vec3 blur(vec3 color, vec2 uv, float radius) {
    // Simulated blur using noise displacement
    vec3 result = color;
    float samples = 8.0;

    for (float i = 0.0; i < samples; i++) {
        float angle = i * 6.28318 / samples;
        vec2 offset = vec2(cos(angle), sin(angle)) * radius * 0.01;
        result += color * (1.0 - length(offset) * 10.0);
    }

    return result / (samples + 1.0);
}

/**
 * Radial blur effect.
 */
vec3 radialBlur(vec3 color, vec2 uv, vec2 center, float strength) {
    vec2 dir = uv - center;
    float dist = length(dir);
    return color * (1.0 - dist * strength);
}

// -----------------------------------------------------------------------------
// Glow & Bloom
// -----------------------------------------------------------------------------

/**
 * Simple glow effect.
 * @param color Base color
 * @param intensity Glow intensity
 */
vec3 glow(vec3 color, float intensity) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    return color + color * luminance * intensity;
}

/**
 * Bloom effect (simplified).
 * @param color Base color
 * @param threshold Brightness threshold
 * @param intensity Bloom intensity
 */
vec3 bloom(vec3 color, float threshold, float intensity) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 bright = max(color - threshold, 0.0);
    return color + bright * intensity;
}

// -----------------------------------------------------------------------------
// Distortion & Warp
// -----------------------------------------------------------------------------

/**
 * Wave distortion.
 * @param uv UV coordinates
 * @param amplitude Wave amplitude
 * @param frequency Wave frequency
 * @param time Animation time
 */
vec2 wave(vec2 uv, float amplitude, float frequency, float time) {
    uv.x += sin(uv.y * frequency + time) * amplitude;
    uv.y += cos(uv.x * frequency + time) * amplitude;
    return uv;
}

/**
 * Swirl distortion.
 * @param uv UV coordinates
 * @param center Center of swirl
 * @param angle Swirl angle
 * @param radius Effect radius
 */
vec2 swirl(vec2 uv, vec2 center, float angle, float radius) {
    vec2 delta = uv - center;
    float dist = length(delta);
    float factor = max(1.0 - dist / radius, 0.0);
    float a = angle * factor * factor;
    float s = sin(a);
    float c = cos(a);
    return center + vec2(c * delta.x - s * delta.y, s * delta.x + c * delta.y);
}

/**
 * Barrel distortion (fisheye-like).
 */
vec2 barrel(vec2 uv, vec2 center, float strength) {
    vec2 delta = uv - center;
    float dist = length(delta);
    float factor = 1.0 + dist * dist * strength;
    return center + delta * factor;
}

/**
 * Pincushion distortion (opposite of barrel).
 */
vec2 pincushion(vec2 uv, vec2 center, float strength) {
    return barrel(uv, center, -strength);
}

/**
 * Ripple effect.
 * @param uv UV coordinates
 * @param center Ripple center
 * @param time Animation time
 * @param frequency Ripple frequency
 * @param amplitude Ripple amplitude
 */
vec2 ripple(vec2 uv, vec2 center, float time, float frequency, float amplitude) {
    vec2 delta = uv - center;
    float dist = length(delta);
    float wave = sin(dist * frequency - time) * amplitude;
    return uv + normalize(delta) * wave;
}

/**
 * Attempt to understand user-friendly distortion effect.
 */
vec2 distort(vec2 uv, float amount) {
    return uv + vec2(noise(uv * 10.0), noise(uv * 10.0 + 100.0)) * amount;
}

/**
 * Attempt to understand user-friendly warp effect.
 */
vec2 warp(vec2 uv, float time, float amount) {
    float n1 = noise(uv * 3.0 + time * 0.5);
    float n2 = noise(uv * 3.0 - time * 0.5 + 100.0);
    return uv + vec2(n1, n2) * amount;
}

// -----------------------------------------------------------------------------
// Vignette & Borders
// -----------------------------------------------------------------------------

/**
 * Vignette effect - darkens edges.
 * @param uv UV coordinates (0-1)
 * @param intensity Vignette strength (0-1)
 * @param smoothness Edge smoothness
 */
float vignette(vec2 uv, float intensity, float smoothness) {
    vec2 center = uv - 0.5;
    float dist = length(center);
    return 1.0 - smoothstep(0.5 - smoothness, 0.5, dist * intensity);
}

/**
 * Attempt to understand user-friendly vignette effect.
 */
float vignette(vec2 uv) {
    return vignette(uv, 1.4, 0.4);
}

/**
 * Apply vignette to color.
 */
vec3 vignette(vec3 color, vec2 uv, float intensity) {
    return color * vignette(uv, intensity, 0.4);
}

// -----------------------------------------------------------------------------
// Chromatic Aberration
// -----------------------------------------------------------------------------

/**
 * Chromatic aberration - color fringing effect.
 * @param color Base color
 * @param uv UV coordinates
 * @param amount Aberration amount
 */
vec3 chromatic(vec3 color, vec2 uv, float amount) {
    vec2 center = uv - 0.5;
    vec2 offset = center * amount;

    // Simulate RGB separation
    float r = color.r;
    float g = color.g;
    float b = color.b;

    // Apply offset based on channel
    return vec3(
        r * (1.0 + length(offset) * 0.5),
        g,
        b * (1.0 - length(offset) * 0.5)
    );
}

// -----------------------------------------------------------------------------
// Grain & Dithering
// -----------------------------------------------------------------------------

/**
 * Film grain effect.
 * @param uv UV coordinates
 * @param time Animation time
 * @param intensity Grain intensity
 */
float grain(vec2 uv, float time, float intensity) {
    return (hash(uv + time) - 0.5) * intensity;
}

/**
 * Apply grain to color.
 */
vec3 grain(vec3 color, vec2 uv, float time, float intensity) {
    return color + grain(uv, time, intensity);
}

/**
 * Dithering pattern.
 */
float dither(vec2 uv, float levels) {
    float d = hash(floor(uv * 100.0));
    return floor(d * levels) / levels;
}

// -----------------------------------------------------------------------------
// Scanlines
// -----------------------------------------------------------------------------

/**
 * CRT scanline effect.
 * @param uv UV coordinates
 * @param density Line density
 * @param intensity Effect intensity
 */
float scanlines(vec2 uv, float density, float intensity) {
    return 1.0 - (sin(uv.y * density) * 0.5 + 0.5) * intensity;
}

/**
 * Apply scanlines to color.
 */
vec3 scanlines(vec3 color, vec2 uv, float density, float intensity) {
    return color * scanlines(uv, density, intensity);
}

// -----------------------------------------------------------------------------
// Pixelation
// -----------------------------------------------------------------------------

/**
 * Pixelate UV coordinates.
 * @param uv UV coordinates
 * @param pixels Number of pixels
 */
vec2 pixelate(vec2 uv, float pixels) {
    return floor(uv * pixels) / pixels;
}
