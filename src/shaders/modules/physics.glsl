// ============================================================================
// Sandbox Physics Module
// Simple physics simulations and effects
// Note: Full physics simulation requires multi-pass rendering (textures)
// These are simplified single-pass approximations
// ============================================================================

// -----------------------------------------------------------------------------
// Gravity
// -----------------------------------------------------------------------------

/**
 * Apply gravity to a position.
 * @param pos Current position
 * @param velocity Current velocity
 * @param gravity Gravity vector
 * @param dt Delta time
 */
vec2 applyGravity(vec2 pos, vec2 velocity, vec2 gravity, float dt) {
    return pos + velocity * dt + 0.5 * gravity * dt * dt;
}

/**
 * Simple gravity field effect on UV.
 * @param uv UV coordinates
 * @param center Gravity center
 * @param strength Gravity strength
 */
vec2 gravity(vec2 uv, vec2 center, float strength) {
    vec2 diff = center - uv;
    float dist = length(diff);
    float force = strength / (dist * dist + 0.01);
    return uv + normalize(diff) * force * 0.01;
}

/**
 * Multi-body gravity (2 sources).
 */
vec2 gravity2(vec2 uv, vec2 center1, vec2 center2, float strength1, float strength2) {
    vec2 p = gravity(uv, center1, strength1);
    return gravity(p, center2, strength2);
}

// -----------------------------------------------------------------------------
// Particles (procedural)
// -----------------------------------------------------------------------------

/**
 * Hash for particle generation.
 */
float particleHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

/**
 * Procedural particle field.
 * @param uv UV coordinates
 * @param count Approximate particle count
 * @param size Particle size
 * @param time Animation time
 */
float particles(vec2 uv, float count, float size, float time) {
    float result = 0.0;
    float gridSize = 1.0 / sqrt(count);

    vec2 grid = floor(uv / gridSize);
    vec2 local = fract(uv / gridSize);

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = grid + vec2(float(x), float(y));
            vec2 offset = vec2(
                particleHash(neighbor),
                particleHash(neighbor + 100.0)
            );

            // Animate particles
            offset.y = fract(offset.y + time * (0.1 + particleHash(neighbor + 200.0) * 0.2));

            vec2 particlePos = (neighbor + offset) * gridSize;
            float dist = length(uv - particlePos);
            result += smoothstep(size, 0.0, dist);
        }
    }

    return clamp(result, 0.0, 1.0);
}

/**
 * Falling particles (rain/snow-like).
 */
float fallingParticles(vec2 uv, float count, float size, float speed, float time) {
    float result = 0.0;

    for (float i = 0.0; i < 50.0; i++) {
        if (i >= count) break;

        float x = particleHash(vec2(i, 0.0));
        float y = fract(particleHash(vec2(i, 1.0)) - time * speed * (0.5 + particleHash(vec2(i, 2.0))));

        vec2 pos = vec2(x, y);
        float dist = length(uv - pos);
        result += smoothstep(size, 0.0, dist);
    }

    return clamp(result, 0.0, 1.0);
}

/**
 * Rising particles (bubbles/sparks-like).
 */
float risingParticles(vec2 uv, float count, float size, float speed, float time) {
    return fallingParticles(vec2(uv.x, 1.0 - uv.y), count, size, speed, time);
}

/**
 * Orbiting particles around a center.
 */
float orbitingParticles(vec2 uv, vec2 center, float count, float size, float radius, float speed, float time) {
    float result = 0.0;

    for (float i = 0.0; i < 20.0; i++) {
        if (i >= count) break;

        float angle = (i / count) * 6.28318 + time * speed;
        float r = radius * (0.8 + particleHash(vec2(i, 0.0)) * 0.4);
        vec2 pos = center + vec2(cos(angle), sin(angle)) * r;

        float dist = length(uv - pos);
        result += smoothstep(size, 0.0, dist);
    }

    return clamp(result, 0.0, 1.0);
}

// -----------------------------------------------------------------------------
// Fluid Simulation (simplified)
// Note: Real fluid sim requires feedback buffers
// This is a visual approximation using noise
// -----------------------------------------------------------------------------

/**
 * Fluid-like motion field.
 * Returns velocity vector at position.
 */
vec2 fluidVelocity(vec2 uv, float time) {
    float n1 = sin(uv.x * 3.0 + time) * cos(uv.y * 2.0 + time * 0.7);
    float n2 = cos(uv.x * 2.0 - time * 0.5) * sin(uv.y * 3.0 + time * 0.8);
    return vec2(n1, n2);
}

/**
 * Apply fluid motion to UV.
 */
vec2 fluid(vec2 uv, float time, float strength) {
    vec2 velocity = fluidVelocity(uv, time);
    return uv + velocity * strength;
}

/**
 * Fluid with mouse interaction.
 * @param uv UV coordinates
 * @param mouse Mouse position (normalized)
 * @param time Animation time
 * @param strength Effect strength
 */
vec2 fluidMouse(vec2 uv, vec2 mouse, float time, float strength) {
    vec2 toMouse = mouse - uv;
    float dist = length(toMouse);
    vec2 baseFlow = fluidVelocity(uv, time);
    vec2 mouseInfluence = normalize(toMouse) * exp(-dist * 5.0);
    return uv + (baseFlow + mouseInfluence) * strength;
}

// -----------------------------------------------------------------------------
// Springs & Oscillation
// -----------------------------------------------------------------------------

/**
 * Spring oscillation.
 * @param t Time
 * @param frequency Oscillation frequency
 * @param damping Damping factor
 */
float springOscillate(float t, float frequency, float damping) {
    return exp(-damping * t) * cos(frequency * t);
}

/**
 * Pendulum motion.
 * @param t Time
 * @param length Pendulum length (affects period)
 * @param amplitude Starting amplitude
 */
float pendulum(float t, float length, float amplitude) {
    float period = 6.28318 * sqrt(length / 9.81);
    return amplitude * cos(t / period * 6.28318);
}

// -----------------------------------------------------------------------------
// Force Fields
// -----------------------------------------------------------------------------

/**
 * Radial force field.
 * Returns force vector pointing from center.
 */
vec2 radialForce(vec2 uv, vec2 center, float strength) {
    vec2 diff = uv - center;
    float dist = length(diff);
    return normalize(diff) * strength / (dist + 0.1);
}

/**
 * Vortex force field.
 * Returns tangential force vector.
 */
vec2 vortexForce(vec2 uv, vec2 center, float strength) {
    vec2 diff = uv - center;
    float dist = length(diff);
    vec2 tangent = vec2(-diff.y, diff.x);
    return normalize(tangent) * strength / (dist + 0.1);
}

/**
 * Combined force field (gravity + vortex).
 */
vec2 spiralForce(vec2 uv, vec2 center, float radialStrength, float vortexStrength) {
    return radialForce(uv, center, radialStrength) + vortexForce(uv, center, vortexStrength);
}

// -----------------------------------------------------------------------------
// Collision Detection (basic shapes)
// -----------------------------------------------------------------------------

/**
 * Distance to circle (SDF).
 */
float circleDistance(vec2 uv, vec2 center, float radius) {
    return length(uv - center) - radius;
}

/**
 * Distance to box (SDF).
 */
float boxDistance(vec2 uv, vec2 center, vec2 size) {
    vec2 d = abs(uv - center) - size;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

/**
 * Check if point is inside circle.
 */
float insideCircle(vec2 uv, vec2 center, float radius) {
    return step(length(uv - center), radius);
}

/**
 * Check if point is inside box.
 */
float insideBox(vec2 uv, vec2 center, vec2 size) {
    vec2 d = abs(uv - center);
    return step(d.x, size.x) * step(d.y, size.y);
}

// -----------------------------------------------------------------------------
// Waves
// -----------------------------------------------------------------------------

/**
 * 2D wave propagation.
 * @param uv UV coordinates
 * @param center Wave origin
 * @param time Animation time
 * @param frequency Wave frequency
 * @param speed Wave speed
 */
float wave(vec2 uv, vec2 center, float time, float frequency, float speed) {
    float dist = length(uv - center);
    return sin(dist * frequency - time * speed);
}

/**
 * Interference pattern from two wave sources.
 */
float interference(vec2 uv, vec2 source1, vec2 source2, float time, float frequency, float speed) {
    float w1 = wave(uv, source1, time, frequency, speed);
    float w2 = wave(uv, source2, time, frequency, speed);
    return (w1 + w2) * 0.5;
}

void main() {
    // Module file - no main implementation
}
