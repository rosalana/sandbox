/**
 * Type of usage
 * @uv-modifier: uv = func(uv);
 * @color-modifier: color = func(color);
 * @full: void func(inout vec3 color, inout vec2 uv); 
 */


/**
 * Translate UV coordinates by a given offset.
 * @uv-modifier
 * #done
 */
vec2 translate(vec2 uv, vec2 offset) {
    return uv - offset;
}

/**
 * Scale UV coordinates by a factor.
 * @uv-modifier
 * #done
 */
vec2 scale(vec2 uv, float factor) {
    return uv * factor;
}

/**
 * Rotate UV coordinates around the center by a given angle (radians).
 * @uv-modifier
 * #done
 */
vec2 rotate(vec2 uv, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
}

/**
 * Centerize UV coordinates to range -0.5 to 0.5 with (0,0) at center.
 * @uv-modifier
 * #done
 */
vec2 centerize(vec2 uv) {
    return (uv - 0.5 * u_resolution) / length(u_resolution);
}



/**
 * Pseudo-random hash from 2D coordinates.
 * Returns float in 0-1 range.
 */
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

/**
 * 2D pseudo-random hash.
 * Returns vec2 in 0-1 range — used for point scattering (worley etc).
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
 * Returns ~0-1 range. Great for clouds, terrain, organic textures.
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
 * Returns distance to nearest random cell point. Great for cells, cracks, organic patterns.
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
 * Remap a value from one range to another.
 * map(0.5, 0.0, 1.0, -1.0, 1.0) → 0.0
 */
float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

/**
 * Tile — repeat coordinates in a grid of given size.
 */
vec2 tile(vec2 p, float size) {
    return fract(p / size) * size;
}

/**
 * Cartesian to polar coordinates.
 * Returns vec2(angle, radius) where angle is -PI to PI.
 */
vec2 polar(vec2 p) {
    return vec2(atan(p.y, p.x), length(p));
}

void main() {}
