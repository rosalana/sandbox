import Module from "./tools/module";
import ModuleRegistry from "./tools/module_registry";
import { ShaderUniform } from "./types";

// Module GLSL sources
import sandboxSource from "./shaders/modules/sandbox.glsl?raw";
import colorsSource from "./shaders/modules/colors.glsl?raw";
import timeSource from "./shaders/modules/time.glsl?raw";
import effectsSource from "./shaders/modules/effects.glsl?raw";
import filtersSource from "./shaders/modules/filters.glsl?raw";

/**
 * Default modules bundled with Sandbox.
 * These modules are available for import in shader source without needing to be registered manually.
 * This registry will grow when more modules are defined
 */
export const modules = new ModuleRegistry([
  new Module("sandbox", sandboxSource),
  new Module("sandbox/colors", colorsSource),
  new Module("sandbox/time", timeSource),
  new Module("sandbox/effects", effectsSource, {
    default: {
      intensity: { uniform: "u_intensity", default: 1.0 },
    },
    pixelate: {
      intensity: { uniform: "u_intensity", default: 20.0 },
    },
    twist: {
      intensity: { uniform: "u_intensity", default: 1.0 },
    },
    ripple: {
      intensity: { uniform: "u_intensity", default: 1.0 },
    },
    fisheye: {
      intensity: { uniform: "u_intensity", default: 1.0 },
    },
    wobble: {
      intensity: { uniform: "u_intensity", default: 1.0 },
    },
    organic: {
      intensity: { uniform: "u_intensity", default: 3.0 },
    },
    glitch: {
      intensity: { uniform: "u_intensity", default: 1.0 },
    },
    mirror: {
      intensity: { uniform: "u_intensity", default: 0.0 },
    },
    kaleidoscope: {
      intensity: { uniform: "u_intensity", default: 6.0 },
    },
    zoom: {
      intensity: { uniform: "u_intensity", default: 1.0 },
    },
    warp: {
      intensity: { uniform: "u_intensity", default: 1.0 },
    },
    displace: {
      intensity: { uniform: "u_intensity", default: 1.0 },
    },
    shatter: {
      intensity: { uniform: "u_intensity", default: 10.0 },
    },
    cells: {
      intensity: { uniform: "u_intensity", default: 8.0 },
    },
    glass: {
      intensity: { uniform: "u_intensity", default: 1.0 },
    },
  }),
  new Module("sandbox/filters", filtersSource, {
    default: {
      intensity: { uniform: "u_intensity", default: 1.0 },
    },
    posterize: {
      intensity: { uniform: "u_intensity", default: 8.0 },
    },
    threshold: {
      intensity: { uniform: "u_intensity", default: 0.5 },
    },
    grain: {
      intensity: { uniform: "u_intensity", default: 0.1 },
    },
    vignette: {
      intensity: { uniform: "u_intensity", default: 1.4 },
    },
    glow: {
      intensity: { uniform: "u_intensity", default: 0.5 },
    },
    gamma: {
      intensity: { uniform: "u_intensity", default: 2.2 },
    },
    dither: {
      intensity: { uniform: "u_intensity", default: 4.0 },
    },
    highlights: {
      intensity: { uniform: "u_intensity", default: 0.5 },
    },
  }),
]);

/**
 * Global uniforms that are automatically provided by Sandbox.
 * These uniforms will NOT be renamed during preprocessing.
 */
export const uniforms = new Map<ShaderUniform["name"], ShaderUniform["type"]>([
  ["u_resolution", "vec2"],
  ["u_time", "float"],
  ["u_delta", "float"],
  ["u_mouse", "vec2"],
  ["u_frame", "int"],
]);
