// ─── Constants ──────────────────────────────────────────────

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

// ─── UV Transforms ──────────────────────────────────────────

/**
 * Center UV coordinates — remap to range where (0,0) is canvas center.
 * Aspect-ratio corrected using resolution length.
 * @uv-modifier
 */
vec2 center(vec2 uv) {
    return (uv - 0.5 * u_resolution) / length(u_resolution);
}

/**
 * Translate UV coordinates by offset.
 * @uv-modifier
 */
vec2 translate(vec2 uv, vec2 offset) {
    return uv - offset;
}

/**
 * Scale UV coordinates by factor around origin.
 * @uv-modifier
 */
vec2 scale(vec2 uv, float factor) {
    return uv * factor;
}

/**
 * Zoom — scale UV with aspect ratio correction.
 * Expects centered UV (use center() first).
 * Pushes UV outward/inward from origin.
 * factor = zoom factor (>1 = zoom in, <1 = zoom out)
 * @uv-modifier
 */
vec2 zoom(vec2 uv, float factor) {
    return uv / max(factor, 0.001);
}

/**
 * Normalize UV to range -1 to 1 with aspect ratio correction.
 * @uv-modifier
 */
vec2 norm(vec2 uv) {
    uv *= min(u_resolution.x, u_resolution.y) / length(u_resolution);
    return uv;
}

/**
 * Rotate UV coordinates around origin by angle (radians).
 * @uv-modifier
 */
vec2 rotate(vec2 uv, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
}

/**
 * Tile — repeat coordinates in a grid of given size.
 * @uv-modifier
 */
vec2 tile(vec2 uv, float size) {
    return fract(uv / size) * size;
}

/**
 * Cartesian to polar coordinates.
 * Returns vec2(angle, radius) where angle is -PI to PI.
 */
vec2 polar(vec2 uv) {
    return vec2(atan(uv.y, uv.x), length(uv));
}

/**
 * Aspect ratio correction — makes UV square regardless of canvas shape.
 * @uv-modifier
 */
vec2 aspect(vec2 uv) {
    return uv * vec2(u_resolution.x / u_resolution.y, 1.0);
}

// ─── Math Utilities ─────────────────────────────────────────

/**
 * Remap a value from one range to another.
 * map(0.5, 0.0, 1.0, -1.0, 1.0) → 0.0
 */
float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

// ─── Noise & Random ─────────────────────────────────────────

/**
 * Pseudo-random hash from 2D coordinates.
 * Returns float in 0–1 range.
 */
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

/**
 * 2D pseudo-random hash.
 * Returns vec2 in 0–1 range — used for point scattering (worley etc).
 */
vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
}

/**
 * Smooth value noise — interpolated hash grid.
 */
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

/**
 * Fractal Brownian Motion — 6 octaves of layered noise.
 * Returns ~0–1 range. Great for clouds, terrain, organic textures.
 */
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }

    return value;
}

/**
 * Worley (cellular / voronoi) noise.
 * Returns distance to nearest random cell point.
 * Great for cells, cracks, organic patterns.
 */
float worley(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float minDist = 1.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash2(i + neighbor);
            float dist = length(neighbor + point - f);
            minDist = min(minDist, dist);
        }
    }

    return minDist;
}

/**
 * Waves — layered sine wave interference pattern.
 * Creates clean, regular wave lines like fabric or moiré.
 * frequency = wave density (5.0 = fabric, 10.0 = fine lines)
 * Returns 0–1 range.
 */
float waves(vec2 p, float frequency) {
    return 0.6 + 0.4 * sin(
        frequency * (p.x + p.y + cos(3.0 * p.x + 5.0 * p.y)) +
        sin(frequency * 4.0 * (p.x + p.y))
    );
}

/**
 * Voronoi cell lookup — returns the position of the nearest cell point.
 * Same algorithm as worley, but returns the point instead of distance.
 * Great for UV snapping, cell-based effects.
 */
vec2 voronoi(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float minDist = 10.0;
    vec2 nearest = vec2(0.0);

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash2(i + neighbor);
            float dist = length(neighbor + point - f);
            if (dist < minDist) {
                minDist = dist;
                nearest = i + neighbor + point;
            }
        }
    }

    return nearest;
}

void main() {}
