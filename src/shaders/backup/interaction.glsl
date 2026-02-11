// ============================================================================
// Sandbox Interaction Module
// Mouse, touch, and keyboard interaction utilities
// Depends on built-in uniforms: u_mouse, u_resolution
// ============================================================================

// -----------------------------------------------------------------------------
// Mouse Position
// -----------------------------------------------------------------------------

/**
 * Get normalized mouse position (0-1).
 * Requires u_mouse and u_resolution uniforms.
 */
vec2 mousePos(vec2 mouse, vec2 resolution) {
    return mouse / resolution;
}

/**
 * Get centered mouse position (-0.5 to 0.5).
 */
vec2 mousePosCenter(vec2 mouse, vec2 resolution) {
    return (mouse / resolution) - 0.5;
}

/**
 * Get aspect-corrected mouse position.
 */
vec2 mousePosAspect(vec2 mouse, vec2 resolution) {
    vec2 uv = mouse / resolution - 0.5;
    uv.x *= resolution.x / resolution.y;
    return uv;
}

// -----------------------------------------------------------------------------
// Distance to Mouse
// -----------------------------------------------------------------------------

/**
 * Get distance from UV to mouse position.
 * @param uv Current UV coordinates
 * @param mouse Mouse position in pixels
 * @param resolution Screen resolution
 */
float mouseDistance(vec2 uv, vec2 mouse, vec2 resolution) {
    vec2 mouseUV = mouse / resolution;
    return length(uv - mouseUV);
}

/**
 * Get normalized distance to mouse (0 at mouse, 1 at edges).
 */
float mouseDistanceNorm(vec2 uv, vec2 mouse, vec2 resolution) {
    return clamp(mouseDistance(uv, mouse, resolution) * 2.0, 0.0, 1.0);
}

// -----------------------------------------------------------------------------
// Mouse Interaction Effects
// -----------------------------------------------------------------------------

/**
 * Hover effect - returns 1.0 when close to mouse, 0.0 when far.
 * @param uv Current UV coordinates
 * @param mouse Mouse position
 * @param resolution Screen resolution
 * @param radius Effect radius (in UV space)
 */
float hover(vec2 uv, vec2 mouse, vec2 resolution, float radius) {
    float dist = mouseDistance(uv, mouse, resolution);
    return smoothstep(radius, 0.0, dist);
}

/**
 * Default hover with radius 0.2.
 */
float hover(vec2 uv, vec2 mouse, vec2 resolution) {
    return hover(uv, mouse, resolution, 0.2);
}

/**
 * Ring effect around mouse.
 * @param uv Current UV coordinates
 * @param mouse Mouse position
 * @param resolution Screen resolution
 * @param radius Ring radius
 * @param thickness Ring thickness
 */
float ring(vec2 uv, vec2 mouse, vec2 resolution, float radius, float thickness) {
    float dist = mouseDistance(uv, mouse, resolution);
    return smoothstep(radius - thickness, radius, dist) *
           smoothstep(radius + thickness, radius, dist);
}

/**
 * Repel effect - pushes UV away from mouse.
 * @param uv Current UV coordinates
 * @param mouse Mouse position
 * @param resolution Screen resolution
 * @param strength Repel strength
 * @param radius Effect radius
 */
vec2 repel(vec2 uv, vec2 mouse, vec2 resolution, float strength, float radius) {
    vec2 mouseUV = mouse / resolution;
    vec2 diff = uv - mouseUV;
    float dist = length(diff);
    float factor = smoothstep(radius, 0.0, dist) * strength;
    return uv + normalize(diff) * factor;
}

/**
 * Attract effect - pulls UV toward mouse.
 */
vec2 attract(vec2 uv, vec2 mouse, vec2 resolution, float strength, float radius) {
    return repel(uv, mouse, resolution, -strength, radius);
}

/**
 * Bulge effect around mouse (like a magnifying glass).
 */
vec2 bulge(vec2 uv, vec2 mouse, vec2 resolution, float strength, float radius) {
    vec2 mouseUV = mouse / resolution;
    vec2 diff = uv - mouseUV;
    float dist = length(diff);
    float factor = 1.0 - smoothstep(0.0, radius, dist);
    return uv - diff * factor * strength;
}

// -----------------------------------------------------------------------------
// Click Detection
// -----------------------------------------------------------------------------

/**
 * Simple click detection (requires click data in u_mouse.z or similar).
 * Note: This is a placeholder. Real implementation needs additional uniform.
 */
float clicked(float clickState) {
    return step(0.5, clickState);
}

/**
 * Click ripple effect.
 * @param uv UV coordinates
 * @param clickPos Click position (normalized)
 * @param time Time since click
 * @param speed Ripple speed
 */
float clickRipple(vec2 uv, vec2 clickPos, float time, float speed) {
    float dist = length(uv - clickPos);
    float wave = sin((dist - time * speed) * 30.0);
    float fade = exp(-time * 2.0) * exp(-dist * 3.0);
    return wave * fade;
}

// -----------------------------------------------------------------------------
// Trail Effect
// -----------------------------------------------------------------------------

/**
 * Mouse trail fade effect.
 * Simulates trail by using time-based decay.
 * @param uv UV coordinates
 * @param mouse Current mouse position
 * @param resolution Screen resolution
 * @param time Current time
 */
float trail(vec2 uv, vec2 mouse, vec2 resolution, float time) {
    float dist = mouseDistance(uv, mouse, resolution);
    return exp(-dist * 10.0);
}

// -----------------------------------------------------------------------------
// Keyboard Interaction (conceptual)
// Note: Actual keyboard input requires additional uniforms set from JS
// -----------------------------------------------------------------------------

/**
 * Check if a key is pressed (requires u_key uniform from JS).
 * @param keyCode Key code to check
 * @param currentKey Current pressed key code
 */
float keyPressed(float keyCode, float currentKey) {
    return step(abs(keyCode - currentKey), 0.5);
}

/**
 * WASD movement helper - returns direction vector.
 * @param keys vec4 with W, A, S, D states (0 or 1)
 */
vec2 wasd(vec4 keys) {
    return vec2(keys.w - keys.y, keys.x - keys.z);
}

/**
 * Arrow keys movement helper.
 * @param keys vec4 with Up, Left, Down, Right states
 */
vec2 arrows(vec4 keys) {
    return vec2(keys.w - keys.y, keys.x - keys.z);
}

void main() {
    // Module file - no main implementation
}
