// ─── Time Shapers ──────────────────────────────────────────
// Convert raw time (u_time) to normalized 0–1 range.
// Output feeds directly into easing functions.

/**
 * Loop — repeating sawtooth 0→1→0→1...
 * duration = cycle length in seconds
 */
float loop(float t, float duration) {
    return fract(t / duration);
}

/**
 * Pingpong — triangle wave 0→1→0→1...
 * duration = half-cycle length (0→1 takes `duration` seconds)
 */
float pingpong(float t, float duration) {
    float m = mod(t, duration * 2.0);
    return m < duration ? m / duration : 2.0 - m / duration;
}

/**
 * Once — single play 0→1, then stays at 1.
 * duration = animation length in seconds
 * Use with delay: once(u_time - 2.0, 3.0) starts at 2s, takes 3s.
 */
float once(float t, float duration) {
    return clamp(t / duration, 0.0, 1.0);
}

/**
 * Reverse — flip animation direction.
 * Turns 0→1 into 1→0. Works with any easing or shaper.
 * Usage: reverse(spring(loop(u_time, 2.0))) for spring zoom-in.
 */
float reverse(float t) {
    return 1.0 - t;
}

// ─── Easing Curves ─────────────────────────────────────────
// All take t (0–1) and return shaped t (0–1).
// Compose with time shapers: ease_in(loop(u_time, 2.0))

/**
 * Ease in — cubic acceleration. Slow start, fast end.
 */
float ease_in(float t) {
    return t * t * t;
}

/**
 * Ease out — cubic deceleration. Fast start, slow end.
 */
float ease_out(float t) {
    float f = 1.0 - t;
    return 1.0 - f * f * f;
}

/**
 * Ease in-out — cubic smooth both ends.
 */
float ease_in_out(float t) {
    return t < 0.5
        ? 4.0 * t * t * t
        : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
}

/**
 * Spring — damped oscillation. Overshoots then settles at 1.
 */
float spring(float t) {
    return 1.0 - exp(-6.0 * t) * cos(12.0 * t);
}

/**
 * Bounce — bouncing ball landing. Multiple bounces settling at 1.
 */
float bounce(float t) {
    if (t < 1.0 / 2.75) {
        return 7.5625 * t * t;
    } else if (t < 2.0 / 2.75) {
        t -= 1.5 / 2.75;
        return 7.5625 * t * t + 0.75;
    } else if (t < 2.5 / 2.75) {
        t -= 2.25 / 2.75;
        return 7.5625 * t * t + 0.9375;
    } else {
        t -= 2.625 / 2.75;
        return 7.5625 * t * t + 0.984375;
    }
}

/**
 * Elastic — springy overshoot with oscillation.
 */
float elastic(float t) {
    return sin(13.0 * 3.14159 * 0.5 * t) * pow(2.0, -10.0 * t) + 1.0;
}

/**
 * Overshoot — goes past 1, then pulls back. Slight rubber-band feel.
 */
float overshoot(float t) {
    float s = 1.70158;
    float f = 1.0 - t;
    return 1.0 - f * f * (f * (s + 1.0) - s);
}

/**
 * Teleport — barely creeps, then near-instant jump with spring settle.
 * Duration mostly = wait time. Jump happens at ~85% of t.
 * Tiny slow drift → snap → spring overshoot → settle at 1.
 */
float teleport(float t) {
    float jump = smoothstep(0.8, 0.85, t);
    float creep = pow(t / 0.8, 4.0) * 0.1 * (1.0 - jump);
    float s = max(t - 0.85, 0.0) * 6.667;
    float settle = exp(-5.0 * s) * sin(s * 15.0) * 0.15;
    return creep + jump + settle;
}

void main() {}
