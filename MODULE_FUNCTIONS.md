# Sandbox Module Functions Reference

Complete list of all functions available in built-in Sandbox modules.

---

## `sandbox` — Core Utilities

Foundation module. No uniforms — all behavior via parameters. Used internally by other modules.

### UV Transforms

| Function    | Signature                              | Description                                                  |
| ----------- | -------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| `center`    | `vec2 center(vec2 uv)`                 | Center UV so (0,0) is canvas middle. Aspect-ratio corrected. |
| `translate` | `vec2 translate(vec2 uv, vec2 offset)` | Shift UV by offset.                                          |
| `scale`     | `vec2 scale(vec2 uv, float factor)`    | Scale UV around origin.                                      |
| `zoom`      | `vec2 zoom(vec2 uv, float factor)`     | `1.0`                                                        | Radial zoom. >1 = zoom in, <1 = zoom out. Needs `center()`. |
| `norm`      | `vec2 norm(vec2 uv)`                   | Normalize UV to 0–1 range based on `u_resolution`.           |
| `rotate`    | `vec2 rotate(vec2 uv, float angle)`    | Rotate UV around origin (radians).                           |
| `tile`      | `vec2 tile(vec2 uv, float size)`       | Repeat UV in a grid.                                         |
| `polar`     | `vec2 polar(vec2 uv)`                  | Convert to polar coords → vec2(angle, radius).               |
| `aspect`    | `vec2 aspect(vec2 uv)`                 | Correct aspect ratio to make UV square.                      |

### Math

| Function | Signature                                                                      | Description                            |
| -------- | ------------------------------------------------------------------------------ | -------------------------------------- |
| `map`    | `float map(float value, float inMin, float inMax, float outMin, float outMax)` | Remap value from one range to another. |

### Noise & Random

| Function  | Signature                              | Description                                                         |
| --------- | -------------------------------------- | ------------------------------------------------------------------- |
| `hash`    | `float hash(vec2 p)`                   | Pseudo-random float 0–1 from 2D coords.                             |
| `hash2`   | `vec2 hash2(vec2 p)`                   | Pseudo-random vec2 0–1 from 2D coords.                              |
| `noise`   | `float noise(vec2 p)`                  | Smooth interpolated value noise.                                    |
| `fbm`     | `float fbm(vec2 p)`                    | Fractal Brownian Motion — 6 octaves of layered noise.               |
| `worley`  | `float worley(vec2 p)`                 | Cellular/Voronoi noise — distance to nearest cell point.            |
| `voronoi` | `vec2 voronoi(vec2 p)`                 | Voronoi cell lookup — position of nearest cell point.               |
| `waves`   | `float waves(vec2 p, float frequency)` | Layered sine wave interference — fabric/moiré pattern. Returns 0–1. |

### Constants

| Name  | Value           | Description    |
| ----- | --------------- | -------------- |
| `PI`  | `3.14159265359` | Pi constant.   |
| `TAU` | `6.28318530718` | Tau (2 \* Pi). |

---

## `sandbox/colors` — Color Creation

Color generation and conversion. Pure functions — no uniforms, all behavior via parameters.

### Conversion

| Function | Signature                                | Description                                             |
| -------- | ---------------------------------------- | ------------------------------------------------------- |
| `hex`    | `vec3 hex(int value)`                    | Hex integer → RGB. `hex(0xFF6600)` → orange.            |
| `rgb255` | `vec3 rgb255(float r, float g, float b)` | RGB 0–255 → normalized 0–1.                             |
| `hsv`    | `vec3 hsv(vec3 c)`                       | HSV → RGB. Input: (hue, saturation, value) all 0–1.     |
| `hsl`    | `vec3 hsl(vec3 c)`                       | HSL → RGB. Input: (hue, saturation, lightness) all 0–1. |

### Gradients & Palettes

| Function    | Signature                                                      | Description                                                                                    |
| ----------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `gradient`  | `vec3 gradient(vec3 a, vec3 b, float t)`                       | Linear blend between two colors.                                                               |
| `gradient3` | `vec3 gradient3(vec3 a, vec3 b, vec3 c, float t)`              | 3-stop gradient. t=0→a, t=0.5→b, t=1→c.                                                        |
| `palette`   | `vec3 palette(vec3 a, vec3 b, vec3 c, vec3 d, float t)`        | Inigo Quilez cosine palette formula.                                                           |
| `bands`     | `vec3 bands(vec3 a, vec3 b, vec3 c, float t, float sharpness)` | 3-zone banded gradient. t=0→b, t=1→a, t=2→c. Tent-function blending with adjustable sharpness. |

### Procedural

| Function     | Signature                                           | Description                                                     |
| ------------ | --------------------------------------------------- | --------------------------------------------------------------- |
| `iridescent` | `vec3 iridescent(vec2 uv, float time, float speed)` | Iterative interference color pattern. Rainbow oil-slick effect. |

---

## `sandbox/time` — Animation Utilities

Time shapers and easing curves. Pure functions — no uniforms. Compose as pipeline: `easing(shaper(u_time, duration))`.

### Time Shapers

Convert raw time to normalized 0–1 range.

| Function   | Signature                                 | Description                                                    |
| ---------- | ----------------------------------------- | -------------------------------------------------------------- |
| `loop`     | `float loop(float t, float duration)`     | Repeating sawtooth 0→1→0→1.                                    |
| `pingpong` | `float pingpong(float t, float duration)` | Triangle wave 0→1→0→1.                                         |
| `once`     | `float once(float t, float duration)`     | Single play 0→1, clamped. Delay via `once(u_time - 2.0, 3.0)`. |

### Easing Curves

Shape 0–1 input with animation curves. Compose: `ease_in(loop(u_time, 2.0))`.

| Function      | Signature                    | Description                                   |
| ------------- | ---------------------------- | --------------------------------------------- |
| `ease_in`     | `float ease_in(float t)`     | Cubic acceleration. Slow start, fast end.     |
| `ease_out`    | `float ease_out(float t)`    | Cubic deceleration. Fast start, slow end.     |
| `ease_in_out` | `float ease_in_out(float t)` | Cubic smooth both ends.                       |
| `spring`      | `float spring(float t)`      | Damped oscillation. Overshoots then settles.  |
| `bounce`      | `float bounce(float t)`      | Bouncing ball landing. Multiple bounces to 1. |
| `elastic`     | `float elastic(float t)`     | Springy overshoot with oscillation.           |
| `overshoot`   | `float overshoot(float t)`   | Goes past 1, pulls back. Rubber-band feel.    |
| `teleport`    | `float teleport(float t)`    | Stays near 0, sudden jump, inertia settle.    |

---

## `sandbox/effects` — UV Effects

UV-space modifiers. Each takes `vec2 uv` and returns modified `vec2`. All use `u_intensity` uniform with optional parameter override.

| Function       | Signature                                     | Default | Description                                                     |
| -------------- | --------------------------------------------- | ------- | --------------------------------------------------------------- |
| `pixelate`     | `vec2 pixelate(vec2 uv, float intensity)`     | `20.0`  | Blocky mosaic. Higher = larger pixels.                          |
| `twist`        | `vec2 twist(vec2 uv, float intensity)`        | `1.0`   | Spiral distortion from center. Needs `center()`.                |
| `ripple`       | `vec2 ripple(vec2 uv, float intensity)`       | `1.0`   | Concentric wave rings. Animated. Needs `center()`.              |
| `fisheye`      | `vec2 fisheye(vec2 uv, float intensity)`      | `1.0`   | Barrel lens distortion. Needs `center()`.                       |
| `wobble`       | `vec2 wobble(vec2 uv, float intensity)`       | `1.0`   | Animated jelly-like sine displacement.                          |
| `organic`      | `vec2 organic(vec2 uv, float intensity)`      | `3.0`   | Iterative fluid marble morph. Animated.                         |
| `glitch`       | `vec2 glitch(vec2 uv, float intensity)`       | `1.0`   | Random horizontal line displacement.                            |
| `mirror`       | `vec2 mirror(vec2 uv, float intensity)`       | `0.0`   | Reflect across axis. 0 = horizontal, 1 = vertical.              |
| `kaleidoscope` | `vec2 kaleidoscope(vec2 uv, float intensity)` | `6.0`   | Radial angular symmetry. Needs `center()`.                      |
| `warp`         | `vec2 warp(vec2 uv, float intensity)`         | `1.0`   | Fbm domain warping. Smoke/cloud distortion. Animated.           |
| `displace`     | `vec2 displace(vec2 uv, float intensity)`     | `1.0`   | Noise-based displacement. Heat-haze look. Animated.             |
| `shatter`      | `vec2 shatter(vec2 uv, float intensity)`      | `10.0`  | Voronoi cell snapping. Broken-glass look.                       |
| `cells`        | `vec2 cells(vec2 uv, float intensity)`        | `8.0`   | Cellular distortion using Worley distance. Textured glass look. |
| `glass`        | `vec2 glass(vec2 uv, float intensity)`        | `1.0`   | Liquid glass refraction. Smooth blobby lens distortion. Animated. Needs `center()`. |

---

## `sandbox/filters` — Color Filters

Color modifiers. Each takes `vec3 color` and returns modified `vec3`. All use `u_intensity` uniform with optional parameter override.

| Function     | Signature                                                | Default | Description                                                                             |
| ------------ | -------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------- |
| `contrast`   | `vec3 contrast(vec3 color, float intensity)`             | `1.0`   | Adjust contrast. 1.0 = original, >1 = more.                                             |
| `brightness` | `vec3 brightness(vec3 color, float intensity)`           | `1.0`   | Multiply brightness. >1 = brighter, <1 = darker.                                        |
| `saturate`   | `vec3 saturate(vec3 color, float intensity)`             | `1.0`   | Adjust saturation. 0 = gray, 1 = original.                                              |
| `posterize`  | `vec3 posterize(vec3 color, float intensity)`            | `8.0`   | Reduce to N color levels. 4 = retro.                                                    |
| `threshold`  | `vec3 threshold(vec3 color, float intensity)`            | `0.5`   | Binary black/white cutoff.                                                              |
| `invert`     | `vec3 invert(vec3 color, float intensity)`               | `1.0`   | Flip colors. 0 = original, 1 = inverted.                                                |
| `glow`       | `vec3 glow(vec3 color, float intensity)`                 | `0.5`   | Luminance bloom. Bright areas amplified.                                                |
| `grain`      | `vec3 grain(vec3 color, vec2 uv, float intensity)`       | `0.1`   | Animated film noise overlay.                                                            |
| `vignette`   | `vec3 vignette(vec3 color, vec2 uv, float intensity)`    | `1.4`   | Darken canvas edges.                                                                    |
| `sepia`      | `vec3 sepia(vec3 color, float intensity)`                | `1.0`   | Warm old-photograph tint.                                                               |
| `gamma`      | `vec3 gamma(vec3 color, float intensity)`                | `2.2`   | Gamma correction curve.                                                                 |
| `tint`       | `vec3 tint(vec3 color, vec3 tintColor, float intensity)` | `1.0`   | Blend toward target tint color.                                                         |
| `dither`     | `vec3 dither(vec3 color, vec2 uv, float intensity)`      | `4.0`   | Bayer 8×8 ordered dithering. intensity = color levels.                                  |
| `arcade`     | `vec3 arcade(vec3 color, vec2 uv, float intensity)`      | `4.0`   | Pixelated Bayer dithering. Combines pixelation and ordered dither for retro 8-bit look. |
| `highlights` | `vec3 highlights(vec3 color, float intensity)`           | `0.5`   | Add white light to bright areas. Glossy/sheen look.                                     |

---

## Usage Examples

### Basic — gradient with effects

```glsl
#import center from 'sandbox'
#import hex, gradient from 'sandbox/colors'
#import twist from 'sandbox/effects'
#import contrast, vignette from 'sandbox/filters'

void main() {
    vec2 uv = v_texcoord * u_resolution;
    uv = center(uv);
    uv = twist(uv, 0.3);

    vec3 color = gradient(hex(0xFF6600), hex(0x0066FF), uv.x + 0.5);
    color = contrast(color, 1.5);
    color = vignette(color, v_texcoord * u_resolution, 1.2);

    fragColor = vec4(color, 1.0);
}
```

### Configurable via runtime

```glsl
// Shader — use uniform defaults (no hard-coded values)
#import twist from 'sandbox/effects'
#import contrast from 'sandbox/filters'

void main() {
    vec2 uv = center(v_texcoord * u_resolution);
    uv = twist(uv);        // uses u_intensity uniform
    vec3 color = ...;
    color = contrast(color); // uses u_intensity uniform

    fragColor = vec4(color, 1.0);
}
```

```typescript
// TypeScript — configure at runtime
sandbox.module("twist", { intensity: 0.4 });
sandbox.module("contrast", { intensity: 1.8 });
```
