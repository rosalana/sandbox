// ============================================================================
// Sandbox Easing Module
// Easing functions for smooth animations
// All functions take t in range [0, 1] and return value in range [0, 1]
// ============================================================================

// -----------------------------------------------------------------------------
// Linear
// -----------------------------------------------------------------------------

/**
 * Linear interpolation (no easing).
 */
float linear(float t) {
    return t;
}

// -----------------------------------------------------------------------------
// Quadratic
// -----------------------------------------------------------------------------

/**
 * Quadratic ease in - starts slow.
 */
float easeInQuad(float t) {
    return t * t;
}

/**
 * Quadratic ease out - ends slow.
 */
float easeOutQuad(float t) {
    return t * (2.0 - t);
}

/**
 * Quadratic ease in-out.
 */
float easeInOutQuad(float t) {
    return t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t;
}

// -----------------------------------------------------------------------------
// Cubic
// -----------------------------------------------------------------------------

/**
 * Cubic ease in.
 */
float easeInCubic(float t) {
    return t * t * t;
}

/**
 * Cubic ease out.
 */
float easeOutCubic(float t) {
    float t1 = t - 1.0;
    return t1 * t1 * t1 + 1.0;
}

/**
 * Cubic ease in-out.
 */
float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : (t - 1.0) * (2.0 * t - 2.0) * (2.0 * t - 2.0) + 1.0;
}

// -----------------------------------------------------------------------------
// Quartic
// -----------------------------------------------------------------------------

/**
 * Quartic ease in.
 */
float easeInQuart(float t) {
    return t * t * t * t;
}

/**
 * Quartic ease out.
 */
float easeOutQuart(float t) {
    float t1 = t - 1.0;
    return 1.0 - t1 * t1 * t1 * t1;
}

/**
 * Quartic ease in-out.
 */
float easeInOutQuart(float t) {
    float t1 = t - 1.0;
    return t < 0.5 ? 8.0 * t * t * t * t : 1.0 - 8.0 * t1 * t1 * t1 * t1;
}

// -----------------------------------------------------------------------------
// Quintic
// -----------------------------------------------------------------------------

/**
 * Quintic ease in.
 */
float easeInQuint(float t) {
    return t * t * t * t * t;
}

/**
 * Quintic ease out.
 */
float easeOutQuint(float t) {
    float t1 = t - 1.0;
    return 1.0 + t1 * t1 * t1 * t1 * t1;
}

/**
 * Quintic ease in-out.
 */
float easeInOutQuint(float t) {
    float t1 = t - 1.0;
    return t < 0.5 ? 16.0 * t * t * t * t * t : 1.0 + 16.0 * t1 * t1 * t1 * t1 * t1;
}

// -----------------------------------------------------------------------------
// Sine
// -----------------------------------------------------------------------------

/**
 * Sine ease in.
 */
float easeInSine(float t) {
    return 1.0 - cos(t * 1.5707963);
}

/**
 * Sine ease out.
 */
float easeOutSine(float t) {
    return sin(t * 1.5707963);
}

/**
 * Sine ease in-out.
 */
float easeInOutSine(float t) {
    return -0.5 * (cos(3.1415926 * t) - 1.0);
}

// -----------------------------------------------------------------------------
// Exponential
// -----------------------------------------------------------------------------

/**
 * Exponential ease in.
 */
float easeInExpo(float t) {
    return t == 0.0 ? 0.0 : pow(2.0, 10.0 * (t - 1.0));
}

/**
 * Exponential ease out.
 */
float easeOutExpo(float t) {
    return t == 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t);
}

/**
 * Exponential ease in-out.
 */
float easeInOutExpo(float t) {
    if (t == 0.0) return 0.0;
    if (t == 1.0) return 1.0;
    if (t < 0.5) return 0.5 * pow(2.0, 20.0 * t - 10.0);
    return 1.0 - 0.5 * pow(2.0, -20.0 * t + 10.0);
}

// -----------------------------------------------------------------------------
// Circular
// -----------------------------------------------------------------------------

/**
 * Circular ease in.
 */
float easeInCirc(float t) {
    return 1.0 - sqrt(1.0 - t * t);
}

/**
 * Circular ease out.
 */
float easeOutCirc(float t) {
    float t1 = t - 1.0;
    return sqrt(1.0 - t1 * t1);
}

/**
 * Circular ease in-out.
 */
float easeInOutCirc(float t) {
    if (t < 0.5) {
        return 0.5 * (1.0 - sqrt(1.0 - 4.0 * t * t));
    }
    float t1 = 2.0 * t - 2.0;
    return 0.5 * (sqrt(1.0 - t1 * t1) + 1.0);
}

// -----------------------------------------------------------------------------
// Back (overshoot)
// -----------------------------------------------------------------------------

/**
 * Back ease in - pulls back before moving forward.
 */
float easeInBack(float t) {
    float s = 1.70158;
    return t * t * ((s + 1.0) * t - s);
}

/**
 * Back ease out - overshoots then returns.
 */
float easeOutBack(float t) {
    float s = 1.70158;
    float t1 = t - 1.0;
    return t1 * t1 * ((s + 1.0) * t1 + s) + 1.0;
}

/**
 * Back ease in-out.
 */
float easeInOutBack(float t) {
    float s = 1.70158 * 1.525;
    if (t < 0.5) {
        return 0.5 * (4.0 * t * t * ((s + 1.0) * 2.0 * t - s));
    }
    float t1 = 2.0 * t - 2.0;
    return 0.5 * (t1 * t1 * ((s + 1.0) * t1 + s) + 2.0);
}

// -----------------------------------------------------------------------------
// Elastic
// -----------------------------------------------------------------------------

/**
 * Elastic ease in - like a spring.
 */
float easeInElastic(float t) {
    if (t == 0.0) return 0.0;
    if (t == 1.0) return 1.0;
    return -pow(2.0, 10.0 * t - 10.0) * sin((t * 10.0 - 10.75) * 2.0943951);
}

/**
 * Elastic ease out.
 */
float easeOutElastic(float t) {
    if (t == 0.0) return 0.0;
    if (t == 1.0) return 1.0;
    return pow(2.0, -10.0 * t) * sin((t * 10.0 - 0.75) * 2.0943951) + 1.0;
}

/**
 * Elastic ease in-out.
 */
float easeInOutElastic(float t) {
    if (t == 0.0) return 0.0;
    if (t == 1.0) return 1.0;
    if (t < 0.5) {
        return -0.5 * pow(2.0, 20.0 * t - 10.0) * sin((20.0 * t - 11.125) * 1.3962634);
    }
    return pow(2.0, -20.0 * t + 10.0) * sin((20.0 * t - 11.125) * 1.3962634) * 0.5 + 1.0;
}

// -----------------------------------------------------------------------------
// Bounce
// -----------------------------------------------------------------------------

/**
 * Bounce ease out - like a ball bouncing.
 */
float easeOutBounce(float t) {
    if (t < 1.0 / 2.75) {
        return 7.5625 * t * t;
    } else if (t < 2.0 / 2.75) {
        float t1 = t - 1.5 / 2.75;
        return 7.5625 * t1 * t1 + 0.75;
    } else if (t < 2.5 / 2.75) {
        float t1 = t - 2.25 / 2.75;
        return 7.5625 * t1 * t1 + 0.9375;
    } else {
        float t1 = t - 2.625 / 2.75;
        return 7.5625 * t1 * t1 + 0.984375;
    }
}

/**
 * Bounce ease in.
 */
float easeInBounce(float t) {
    return 1.0 - easeOutBounce(1.0 - t);
}

/**
 * Bounce ease in-out.
 */
float easeInOutBounce(float t) {
    if (t < 0.5) {
        return 0.5 * easeInBounce(t * 2.0);
    }
    return 0.5 * easeOutBounce(t * 2.0 - 1.0) + 0.5;
}

// -----------------------------------------------------------------------------
// Spring (physics-based)
// -----------------------------------------------------------------------------

uniform float u_damping;
uniform float u_stiffness;

/**
 * Spring animation - physically-based spring motion.
 * @param t Time (0-1)
 * @param damping Damping ratio (0.1 = bouncy, 1.0 = critically damped)
 * @param stiffness Spring stiffness
 */
float spring(float t, float damping, float stiffness) {
    float omega = sqrt(stiffness);
    float zeta = damping;

    if (zeta < 1.0) {
        // Underdamped
        float omegaD = omega * sqrt(1.0 - zeta * zeta);
        return 1.0 - exp(-zeta * omega * t) * (cos(omegaD * t) + zeta * omega / omegaD * sin(omegaD * t));
    } else {
        // Critically damped or overdamped
        return 1.0 - (1.0 + omega * t) * exp(-omega * t);
    }
}

/**
 * Spring with default parameters.
 */
float spring(float t) {
    return spring(t, 0.5, 100.0);
}

// -----------------------------------------------------------------------------
// Convenience aliases
// -----------------------------------------------------------------------------

/**
 * Generic ease in (using cubic).
 */
float easeIn(float t) {
    return easeInCubic(t);
}

/**
 * Generic ease out (using cubic).
 */
float easeOut(float t) {
    return easeOutCubic(t);
}

/**
 * Generic ease in-out (using cubic).
 */
float easeInOut(float t) {
    return easeInOutCubic(t);
}

/**
 * Attempt to understand user-friendly bounce ease.
 */
float bounce(float t) {
    return easeOutBounce(t);
}

/**
 * Attempt to understand user-friendly elastic ease.
 */
float elastic(float t) {
    return easeOutElastic(t);
}

void main() {
    // Module file - no main implementation
}
