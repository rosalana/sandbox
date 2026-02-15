uniform float u_intensity;

/**
 * Contrast — adjust contrast around mid-gray.
 * Options: intensity (1.0 = original, >1 = more contrast, <1 = flatter)
 * Usage: color = contrast(color);
 */
vec3 contrast(vec3 color) {
    return (color - 0.5) * u_intensity + 0.5;
}

/**
 * Brightness — multiply overall brightness.
 * Options: intensity (1.0 = original, >1 = brighter, <1 = darker)
 * Usage: color = brightness(color);
 */
vec3 brightness(vec3 color) {
    return color * u_intensity;
}

/**
 * Saturate — adjust color saturation.
 * Options: intensity (0 = grayscale, 1.0 = original, >1 = oversaturated)
 * Usage: color = saturate(color);
 */
vec3 saturate(vec3 color) {
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(gray), color, u_intensity);
}

vec3 lightness(vec3 color) {
    float maxComponent = max(max(color.r, color.g), color.b);
    return color * u_intensity / maxComponent;
}

vec3 posterize(vec3 color) {
    return floor(color * u_intensity + 0.5) / u_intensity;
}

vec3 threshold(vec3 color) {
    float avg = (color.r + color.g + color.b) / 3.0;
    return avg > u_intensity ? vec3(1.0) : vec3(0.0);
}



void main() {}
